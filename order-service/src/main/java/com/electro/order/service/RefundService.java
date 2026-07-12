package com.electro.order.service;

import com.electro.order.dto.PaymentDto;
import com.electro.order.dto.RefundDto;
import com.electro.order.entity.Order;
import com.electro.order.entity.OrderDetail;
import com.electro.order.entity.OrderItem;
import com.electro.order.entity.RefundRequest;
import com.electro.order.entity.PaymentTransaction;
import com.electro.order.entity.RefundAuditLog;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.repository.OrderDetailRepository;
import com.electro.order.repository.OrderItemRepository;
import com.electro.order.repository.OrderRepository;
import com.electro.order.repository.PaymentTransactionRepository;
import com.electro.order.repository.RefundRequestRepository;
import com.electro.order.service.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class RefundService {

    private static final Logger log = LoggerFactory.getLogger(RefundService.class);

    private final RefundRequestRepository refundRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentService paymentService;
    private final RefundAuditService refundAuditService;
    private final NapasLookupService napasLookupService;

    private record RefundAmountBreakdown(
            BigDecimal refundAmount,
            BigDecimal couponAllocatedDiscount,
            BigDecimal shippingExcludedAmount) {}

    @Transactional(readOnly = true)
    public List<RefundDto.Summary> list(String statusFilter, String paymentMethodFilter) {
        List<RefundRequest> rows;
        if (statusFilter != null && !statusFilter.isBlank()) {
            String sf = statusFilter.trim().toUpperCase();
            if ("PENDING".equals(sf)) {
                rows = refundRepository.findAllByOrderByCreatedAtDesc().stream()
                        .filter(r -> r.getStatus() == RefundRequest.RefundStatus.PENDING_APPROVAL
                                || r.getStatus() == RefundRequest.RefundStatus.AWAITING_MANUAL_TRANSFER
                                || r.getStatus() == RefundRequest.RefundStatus.FAILED
                                || r.getStatus() == RefundRequest.RefundStatus.PROCESSING)
                        .collect(Collectors.toList());
            } else if ("COMPLETED".equals(sf)) {
                rows = refundRepository.findByStatusOrderByCreatedAtDesc(RefundRequest.RefundStatus.COMPLETED);
            } else {
                rows = refundRepository.findByStatusOrderByCreatedAtDesc(parseStatus(statusFilter));
            }
        } else {
            rows = refundRepository.findAllByOrderByCreatedAtDesc();
        }

        if (paymentMethodFilter != null && !paymentMethodFilter.isBlank()) {
            String pm = paymentMethodFilter.trim().toUpperCase();
            rows = rows.stream().filter(r -> {
                if ("COD".equals(pm)) {
                    return r.getPaymentMethod() == Order.PaymentMethod.COD
                            || r.getPaymentMethod() == Order.PaymentMethod.BANK_TRANSFER;
                }
                return r.getPaymentMethod().name().equals(pm);
            }).collect(Collectors.toList());
        }

        return rows.stream().map(this::toSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RefundDto.AuditLogEntry> listAuditLogs(Integer refundId) {
        RefundRequest refund = load(refundId);
        return refundAuditService.listByRefundId(refund.getId()).stream()
                .map(this::toAuditEntry)
                .collect(Collectors.toList());
    }

    public RefundDto.GatewayBalanceResponse checkGatewayBalance(Integer refundId) {
        RefundRequest refund = load(refundId);
        if (refund.getRefundChannel() != RefundRequest.RefundChannel.GATEWAY) {
            throw new BadRequestException("Chỉ kiểm tra số dư cho hoàn tiền qua cổng thanh toán.");
        }
        var result = paymentService.checkMerchantBalance(refund.getPaymentMethod(), refund.getRefundAmount());
        refundAuditService.log(refund.getId(), refund.getRefundCode(),
                RefundAuditLog.Action.GATEWAY_BALANCE_CHECKED,
                result.getMessage() + " | Số dư: " + result.getMerchantBalance()
                        + " | Cần: " + result.getRequiredAmount());
        return RefundDto.GatewayBalanceResponse.builder()
                .paymentMethod(result.getPaymentMethod())
                .paymentMethodLabel(paymentMethodLabel(refund.getPaymentMethod()))
                .merchantBalance(result.getMerchantBalance())
                .requiredAmount(result.getRequiredAmount())
                .sufficient(result.isSufficient())
                .message(result.getMessage())
                .checkedAt(result.getCheckedAt())
                .build();
    }

    public RefundDto.NapasLookupResponse napasLookup(RefundDto.NapasLookupRequest request) {
        return napasLookupService.lookup(request.getBankName(), request.getBankAccount());
    }

    @Transactional(readOnly = true)
    public RefundDto.Voucher getVoucher(Integer id) {
        RefundRequest r = load(id);
        if (r.getVoucherCode() == null) {
            throw new BadRequestException("Chưa có phiếu chi cho yêu cầu này.");
        }
        return buildVoucher(r);
    }

    @Transactional(readOnly = true)
    public RefundDto.Detail getDetail(Integer id) {
        return toDetail(load(id));
    }

    /**
     * Đơn online đã PAID, hủy trước giao hàng — tự tạo RF và gọi hoàn cổng.
     */
    public RefundDto.CancellationRefundResult processPreDeliveryCancellationRefund(
            Integer orderId, String cancelReason, String actorUsername) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        if (!isEligibleForPreDeliveryCancellation(order)) {
            return RefundDto.CancellationRefundResult.builder()
                    .attempted(false)
                    .message("Không áp dụng hoàn cổng tự động cho đơn này.")
                    .build();
        }

        var existingCancel = findExistingCancellationRefund(orderId);
        if (existingCancel.isPresent()) {
            RefundRequest r = existingCancel.get();
            return RefundDto.CancellationRefundResult.builder()
                    .attempted(true)
                    .refundCode(r.getRefundCode())
                    .status(r.getStatus().name())
                    .statusLabel(statusLabel(r.getStatus()))
                    .message("Đã có phiếu hoàn từ hủy đơn: " + r.getRefundCode())
                    .build();
        }

        RefundAmountBreakdown breakdown = resolveFullOrderCancellationAmount(order);
        String reason = buildCancellationReason(cancelReason, order.getOrderCode());
        String productLabel = resolveOrderProductLabel(order);

        RefundRequest refund = RefundRequest.builder()
                .refundCode(generateRefundCode())
                .status(RefundRequest.RefundStatus.PENDING_APPROVAL)
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .customerName(order.getShippingName())
                .customerPhone(order.getShippingPhone())
                .productName(productLabel)
                .refundAmount(breakdown.refundAmount())
                .couponAllocatedDiscount(breakdown.couponAllocatedDiscount())
                .shippingExcludedAmount(breakdown.shippingExcludedAmount())
                .paymentMethod(order.getPaymentMethod())
                .refundChannel(RefundRequest.RefundChannel.GATEWAY)
                .isDefective(false)
                .returnReason(reason)
                .build();

        RefundRequest saved = refundRepository.save(refund);
        String actor = actorUsername != null ? actorUsername : currentUsername();
        refundAuditService.logAs(actor, "ORDER_CANCEL", saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.ORDER_CANCEL_REFUND,
                "Hủy đơn trước giao — " + order.getOrderCode() + " | " + reason);
        refundAuditService.log(saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.REFUND_CREATED,
                "Tự động từ hủy đơn | Hoàn full " + breakdown.refundAmount() + " VND");

        saved.setApprovedBy(actor);
        saved.setApprovedAt(LocalDateTime.now());
        saved.setExecutedBy(actor);
        saved.setExecutedAt(LocalDateTime.now());

        RefundDto.Detail result = executeGatewayRefund(saved);
        return RefundDto.CancellationRefundResult.builder()
                .attempted(true)
                .refundCode(result.getRefundCode())
                .status(result.getStatus())
                .statusLabel(result.getStatusLabel())
                .message(buildCancellationRefundMessage(result))
                .build();
    }

    public boolean isEligibleForPreDeliveryCancellation(Order order) {
        if (order.getPaymentStatus() == Order.PaymentStatus.REFUNDED) {
            return false;
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            return false;
        }
        Order.OrderStatus st = order.getStatus();
        if (st == Order.OrderStatus.DELIVERED
                || st == Order.OrderStatus.COMPLETED
                || st == Order.OrderStatus.REFUNDED) {
            return false;
        }
        return resolveChannel(order.getPaymentMethod()) == RefundRequest.RefundChannel.GATEWAY;
    }

    /**
     * Gọi từ catalog-service sau khi kho xử lý phiếu hoàn RT-...
     */
    public RefundDto.Detail createFromReturn(RefundDto.CreateFromReturnRequest request) {
        if (request.getReturnSlipId() != null) {
            var existing = refundRepository.findByReturnSlipId(request.getReturnSlipId());
            if (existing.isPresent()) {
                return toDetail(existing.get());
            }
        }

        if (request.getOrderId() == null) {
            throw new BadRequestException("Phiếu hoàn không liên kết đơn hàng — không tạo yêu cầu hoàn tiền.");
        }

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        validateOrderEligibleForRefund(order);

        RefundAmountBreakdown breakdown = resolveRefundAmount(order, request.getSerialNumber());

        RefundRequest.RefundChannel channel = resolveChannel(order.getPaymentMethod());

        RefundRequest refund = RefundRequest.builder()
                .refundCode(generateRefundCode())
                .status(RefundRequest.RefundStatus.PENDING_APPROVAL)
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .returnSlipId(request.getReturnSlipId())
                .returnSlipCode(request.getReturnSlipCode())
                .serialNumber(request.getSerialNumber())
                .customerName(request.getCustomerName() != null
                        ? request.getCustomerName() : order.getShippingName())
                .customerPhone(request.getCustomerPhone() != null
                        ? request.getCustomerPhone() : order.getShippingPhone())
                .productName(request.getProductName())
                .refundAmount(breakdown.refundAmount())
                .couponAllocatedDiscount(breakdown.couponAllocatedDiscount())
                .shippingExcludedAmount(breakdown.shippingExcludedAmount())
                .paymentMethod(order.getPaymentMethod())
                .refundChannel(channel)
                .isDefective(request.getIsDefective())
                .defectiveReason(request.getDefectiveReason())
                .returnReason(request.getReturnReason())
                .build();

        RefundRequest saved = refundRepository.save(refund);
        String warehouseActor = request.getWarehouseProcessedBy() != null
                ? request.getWarehouseProcessedBy() : currentUsername();
        refundAuditService.logAs(warehouseActor, "WAREHOUSE", saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.WAREHOUSE_RETURN_CONFIRMED,
                "Xác nhận hoàn kho " + request.getReturnSlipCode()
                        + " | " + defectiveReasonLabel(request.getDefectiveReason(), request.getIsDefective()));
        refundAuditService.log(saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.REFUND_CREATED,
                "Tự động tạo từ phiếu hoàn " + request.getReturnSlipCode()
                        + " | Số tiền: " + breakdown.refundAmount()
                        + " (coupon phân bổ: -" + breakdown.couponAllocatedDiscount()
                        + ", không hoàn ship: " + breakdown.shippingExcludedAmount() + ")");
        log.info("Created refund request {} for order {} slip {}",
                saved.getRefundCode(), order.getOrderCode(), request.getReturnSlipCode());
        return toDetail(saved);
    }

    /**
     * Gọi từ warranty-service khi Kho tiếp nhận máy hỏng (BH) — tạo RF thay vì IN_REPAIR.
     */
    public RefundDto.Detail createFromWarranty(RefundDto.CreateFromWarrantyRequest request) {
        if (request.getWarrantyClaimId() != null) {
            var existing = refundRepository.findByWarrantyClaimId(request.getWarrantyClaimId());
            if (existing.isPresent()) {
                return toDetail(existing.get());
            }
        }

        if (request.getOrderId() == null) {
            throw new BadRequestException("Phiếu BH không liên kết đơn hàng — không tạo yêu cầu hoàn tiền.");
        }

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", request.getOrderId()));

        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new BadRequestException("Đơn chưa thanh toán (PAID) — không tạo yêu cầu hoàn tiền.");
        }

        validateOrderEligibleForRefund(order);

        RefundAmountBreakdown breakdown = resolveRefundAmount(order, request.getSerialNumber());
        RefundRequest.RefundChannel channel = resolveChannel(order.getPaymentMethod());

        RefundRequest refund = RefundRequest.builder()
                .refundCode(generateRefundCode())
                .status(RefundRequest.RefundStatus.PENDING_APPROVAL)
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .warrantyClaimId(request.getWarrantyClaimId())
                .warrantyClaimCode(request.getWarrantyClaimCode())
                .serialNumber(request.getSerialNumber())
                .customerName(request.getCustomerName() != null
                        ? request.getCustomerName() : order.getShippingName())
                .customerPhone(request.getCustomerPhone() != null
                        ? request.getCustomerPhone() : order.getShippingPhone())
                .productName(request.getProductName())
                .refundAmount(breakdown.refundAmount())
                .couponAllocatedDiscount(breakdown.couponAllocatedDiscount())
                .shippingExcludedAmount(breakdown.shippingExcludedAmount())
                .paymentMethod(order.getPaymentMethod())
                .refundChannel(channel)
                .isDefective(true)
                .defectiveReason("DEFECTIVE_BY_MANUFACTURER")
                .returnReason(request.getReturnReason() != null
                        ? request.getReturnReason()
                        : "Bảo hành thu hồi máy hỏng — " + request.getWarrantyClaimCode())
                .build();

        RefundRequest saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.REFUND_CREATED,
                "Tự động tạo từ BH " + request.getWarrantyClaimCode());
        log.info("Created refund request {} for warranty claim {} order {}",
                saved.getRefundCode(), request.getWarrantyClaimCode(), order.getOrderCode());
        return toDetail(saved);
    }

    /**
     * Sales: lưu thông tin ngân hàng khách (đơn COD) — chưa hoàn tiền.
     */
    public RefundDto.Detail updateBankInfo(Integer id, RefundDto.UpdateBankInfoRequest request) {
        RefundRequest refund = load(id);
        if (refund.getRefundChannel() != RefundRequest.RefundChannel.COD_MANUAL
                && refund.getRefundChannel() != RefundRequest.RefundChannel.BANK_TRANSFER_MANUAL) {
            throw new BadRequestException("Chỉ cập nhật STK cho đơn COD / chuyển khoản thủ công.");
        }
        if (refund.getStatus() != RefundRequest.RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ cập nhật STK khi yêu cầu đang chờ duyệt.");
        }
        if (request.getCustomerBankName() == null || request.getCustomerBankName().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tên ngân hàng.");
        }
        if (request.getCustomerBankAccount() == null || request.getCustomerBankAccount().isBlank()) {
            throw new BadRequestException("Vui lòng nhập số tài khoản.");
        }
        if (request.getCustomerBankAccountName() == null || request.getCustomerBankAccountName().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tên chủ tài khoản.");
        }

        refund.setCustomerBankName(request.getCustomerBankName().trim());
        refund.setCustomerBankAccount(request.getCustomerBankAccount().trim());
        refund.setCustomerBankAccountName(request.getCustomerBankAccountName().trim());
        refund.setBankInfoSavedBy(currentUsername());
        refund.setBankInfoSavedAt(LocalDateTime.now());
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            String prefix = refund.getNotes() != null && !refund.getNotes().isBlank()
                    ? refund.getNotes() + "\n" : "";
            refund.setNotes(prefix + "[Sales] " + request.getNotes().trim());
        }
        RefundRequest saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.BANK_INFO_SAVED,
                "STK " + saved.getCustomerBankName() + " / " + saved.getCustomerBankAccount()
                        + " / " + saved.getCustomerBankAccountName());
        return toDetail(saved);
    }

    /**
     * Kế toán duyệt hoàn tiền qua cổng (VNPay / MoMo / ZaloPay).
     */
    public RefundDto.Detail approve(Integer id, RefundDto.ApproveRequest request) {
        RefundRequest refund = load(id);
        if (refund.getRefundChannel() != RefundRequest.RefundChannel.GATEWAY) {
            throw new BadRequestException("Yêu cầu COD/Bank — dùng xác nhận chuyển khoản thủ công.");
        }
        if (refund.getStatus() != RefundRequest.RefundStatus.PENDING_APPROVAL
                && refund.getStatus() != RefundRequest.RefundStatus.FAILED) {
            throw new BadRequestException("Chỉ duyệt được yêu cầu ở trạng thái Chờ duyệt hoặc Thất bại.");
        }

        String actor = currentUsername();
        refund.setApprovedBy(actor);
        refund.setApprovedAt(LocalDateTime.now());
        if (request.getNotes() != null) {
            refund.setNotes(request.getNotes());
        }
        refund.setExecutedBy(actor);
        refund.setExecutedAt(LocalDateTime.now());
        refundAuditService.log(refund.getId(), refund.getRefundCode(),
                RefundAuditLog.Action.GATEWAY_REFUND_APPROVED,
                "Admin xác nhận hoàn qua cổng " + refund.getPaymentMethod());

        return executeGatewayRefund(refund);
    }

    /**
     * COD / Bank — kế toán chuyển khoản thủ công, upload biên lai, sinh phiếu chi một lần.
     */
    public RefundDto.Detail confirmCodRefund(Integer id, RefundDto.ConfirmCodRequest request, String receiptUrl) {
        RefundRequest refund = load(id);
        if (refund.getRefundChannel() != RefundRequest.RefundChannel.COD_MANUAL
                && refund.getRefundChannel() != RefundRequest.RefundChannel.BANK_TRANSFER_MANUAL) {
            throw new BadRequestException("Yêu cầu này dùng hoàn tiền qua cổng thanh toán.");
        }
        if (refund.getStatus() != RefundRequest.RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ xác nhận được yêu cầu đang chờ duyệt.");
        }
        if (request.getCustomerBankName() == null || request.getCustomerBankName().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tên ngân hàng.");
        }
        if (request.getCustomerBankAccount() == null || request.getCustomerBankAccount().isBlank()) {
            throw new BadRequestException("Vui lòng nhập số tài khoản.");
        }
        if (request.getCustomerBankAccountName() == null || request.getCustomerBankAccountName().isBlank()) {
            throw new BadRequestException("Vui lòng nhập tên chủ tài khoản.");
        }
        if (receiptUrl == null || receiptUrl.isBlank()) {
            throw new BadRequestException("Vui lòng tải lên ảnh biên lai chuyển khoản.");
        }

        String actor = currentUsername();
        refund.setCustomerBankName(request.getCustomerBankName().trim());
        refund.setCustomerBankAccount(request.getCustomerBankAccount().trim());
        refund.setCustomerBankAccountName(request.getCustomerBankAccountName().trim());
        refund.setTransferReference(request.getTransferReference());
        refund.setReceiptImageUrl(receiptUrl);
        if (request.getNotes() != null) {
            refund.setNotes(request.getNotes());
        }
        refund.setApprovedBy(actor);
        refund.setApprovedAt(LocalDateTime.now());
        refund.setExecutedBy(actor);
        refund.setExecutedAt(LocalDateTime.now());
        issueVoucher(refund);
        refund.setStatus(RefundRequest.RefundStatus.COMPLETED);
        refund.setCompletedAt(LocalDateTime.now());
        refundRepository.save(refund);
        refundAuditService.log(refund.getId(), refund.getRefundCode(),
                RefundAuditLog.Action.COD_REFUND_CONFIRMED,
                "Chuyển khoản thủ công | Mã GD: " + refund.getTransferReference()
                        + " | Biên lai: " + receiptUrl);
        finalizeOrderRefund(refund);
        return toDetail(refund);
    }

    public RefundDto.Detail reject(Integer id, RefundDto.RejectRequest request) {
        RefundRequest refund = load(id);
        if (refund.getStatus() != RefundRequest.RefundStatus.PENDING_APPROVAL) {
            throw new BadRequestException("Chỉ từ chối được yêu cầu đang chờ duyệt.");
        }
        refund.setStatus(RefundRequest.RefundStatus.REJECTED);
        refund.setRejectedBy(currentUsername());
        refund.setRejectedAt(LocalDateTime.now());
        refund.setRejectionReason(request.getReason() != null
                ? request.getReason() : "Kế toán từ chối hoàn tiền");
        RefundRequest saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), saved.getRefundCode(),
                RefundAuditLog.Action.REFUND_REJECTED, saved.getRejectionReason());
        return toDetail(saved);
    }

    /**
     * Xác nhận đã chuyển khoản thủ công (COD / chuyển khoản ngân hàng).
     */
    public RefundDto.Detail confirmManualTransfer(Integer id, RefundDto.ConfirmManualTransferRequest request) {
        RefundRequest refund = load(id);
        if (refund.getStatus() != RefundRequest.RefundStatus.AWAITING_MANUAL_TRANSFER) {
            throw new BadRequestException("Yêu cầu không ở trạng thái chờ chuyển khoản thủ công.");
        }

        refund.setTransferReference(request.getTransferReference());
        if (request.getNotes() != null) {
            String existing = refund.getNotes() != null ? refund.getNotes() + "\n" : "";
            refund.setNotes(existing + request.getNotes());
        }
        issueVoucher(refund);
        refund.setCompletedAt(LocalDateTime.now());
        refund.setStatus(RefundRequest.RefundStatus.COMPLETED);
        refundRepository.save(refund);

        finalizeOrderRefund(refund);
        return toDetail(refund);
    }

    /**
     * Thử lại hoàn tiền gateway khi trước đó FAILED.
     */
    public RefundDto.Detail retryGateway(Integer id) {
        RefundRequest refund = load(id);
        if (refund.getRefundChannel() != RefundRequest.RefundChannel.GATEWAY) {
            throw new BadRequestException("Yêu cầu này không dùng cổng thanh toán.");
        }
        if (refund.getStatus() != RefundRequest.RefundStatus.FAILED) {
            throw new BadRequestException("Chỉ thử lại khi trạng thái Thất bại.");
        }
        refund.setExecutedBy(currentUsername());
        refund.setExecutedAt(LocalDateTime.now());
        refundAuditService.log(refund.getId(), refund.getRefundCode(),
                RefundAuditLog.Action.GATEWAY_REFUND_RETRY, "Thử lại gọi API hoàn tiền cổng");
        return executeGatewayRefund(refund);
    }

    private RefundDto.Detail executeGatewayRefund(RefundRequest refund) {
        Order order = orderRepository.findById(refund.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", refund.getOrderId()));

        refund.setStatus(RefundRequest.RefundStatus.PROCESSING);
        refundRepository.save(refund);

        String reason = "Hoan tien " + refund.getRefundCode();
        if (refund.getReturnSlipCode() != null && !refund.getReturnSlipCode().isBlank()) {
            reason += " - " + refund.getReturnSlipCode();
        } else if (refund.getReturnReason() != null && !refund.getReturnReason().isBlank()) {
            reason += " - " + refund.getReturnReason();
        }
        PaymentDto.GatewayRefundResult result = paymentService.executeGatewayRefund(
                order, refund.getRefundAmount(), reason);

        refund.setGatewayResponse(result.getRawResponse());
        if (result.isSuccess()) {
            refund.setGatewayRefundId(result.getGatewayRefundId());
            issueVoucher(refund);
            refund.setStatus(RefundRequest.RefundStatus.COMPLETED);
            refund.setCompletedAt(LocalDateTime.now());
            refund.setFailureReason(null);
            refundRepository.save(refund);
            refundAuditService.log(refund.getId(), refund.getRefundCode(),
                    RefundAuditLog.Action.GATEWAY_REFUND_APPROVED,
                    "Hoàn cổng thành công | Mã GD hoàn: " + result.getGatewayRefundId());
            finalizeOrderRefund(refund);
        } else {
            refund.setStatus(RefundRequest.RefundStatus.FAILED);
            refund.setFailureReason(result.getMessage());
            refundRepository.save(refund);
            refundAuditService.log(refund.getId(), refund.getRefundCode(),
                    RefundAuditLog.Action.GATEWAY_REFUND_FAILED, result.getMessage());
        }
        return toDetail(refund);
    }

    private void finalizeOrderRefund(RefundRequest refund) {
        Order order = orderRepository.findById(refund.getOrderId()).orElse(null);
        if (order == null) return;

        order.setPaymentStatus(Order.PaymentStatus.REFUNDED);

        boolean fullRefund = isFullOrderRefund(order, refund);
        if (fullRefund && order.getStatus() != Order.OrderStatus.REFUNDED
                && order.getStatus() != Order.OrderStatus.CANCELLED) {
            order.setStatus(Order.OrderStatus.REFUNDED);
        }

        String noteLine = fullRefund
                ? "Hoàn tiền đầy đủ: " + refund.getRefundCode()
                : "Hoàn tiền một phần: " + refund.getRefundCode()
                        + " (" + refund.getRefundAmount() + " VND)";
        order.setAdminNote((order.getAdminNote() != null ? order.getAdminNote() + "\n" : "") + noteLine);
        orderRepository.save(order);
        log.info("Order {} payment REFUNDED after {}", order.getOrderCode(), refund.getRefundCode());
    }

    private boolean isFullOrderRefund(Order order, RefundRequest current) {
        BigDecimal totalRefunded = refundRepository.findByOrderId(order.getId()).stream()
                .filter(r -> r.getStatus() == RefundRequest.RefundStatus.COMPLETED)
                .map(RefundRequest::getRefundAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return totalRefunded.compareTo(order.getTotalAmount()) >= 0;
    }

    private void validateOrderEligibleForRefund(Order order) {
        if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
            if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                throw new BadRequestException("Đơn COD chưa được shipper thu tiền (PAID).");
            }
            if (!Boolean.TRUE.equals(order.getCodReconciled())) {
                throw new BadRequestException(
                        "Đơn COD chưa đối soát tiền từ shipper — không tạo phiếu hoàn tiền.");
            }
            return;
        }
        if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new BadRequestException("Đơn online chưa thanh toán (PAID) — không tạo yêu cầu hoàn tiền.");
        }
    }

    private RefundAmountBreakdown resolveRefundAmount(Order order, String serialNumber) {
        BigDecimal shippingExcluded = order.getShippingFee() != null
                ? order.getShippingFee() : BigDecimal.ZERO;
        BigDecimal subtotal = order.getSubtotal() != null ? order.getSubtotal() : BigDecimal.ZERO;
        BigDecimal orderDiscount = order.getDiscountAmount() != null
                ? order.getDiscountAmount() : BigDecimal.ZERO;

        OrderDetail line = findOrderDetailForSerial(order, serialNumber);
        BigDecimal lineTotal = line.getTotalPrice();
        int qty = line.getQuantity() != null && line.getQuantity() > 0 ? line.getQuantity() : 1;
        BigDecimal unitLineTotal = lineTotal.divide(BigDecimal.valueOf(qty), 0, RoundingMode.HALF_UP);

        BigDecimal couponAlloc = BigDecimal.ZERO;
        if (subtotal.compareTo(BigDecimal.ZERO) > 0 && orderDiscount.compareTo(BigDecimal.ZERO) > 0) {
            couponAlloc = orderDiscount.multiply(unitLineTotal)
                    .divide(subtotal, 0, RoundingMode.HALF_UP);
        }

        BigDecimal refundAmount = unitLineTotal.subtract(couponAlloc);
        if (refundAmount.compareTo(BigDecimal.ZERO) < 0) {
            refundAmount = BigDecimal.ZERO;
        }
        return new RefundAmountBreakdown(refundAmount, couponAlloc, shippingExcluded);
    }

    private OrderDetail findOrderDetailForSerial(Order order, String serialNumber) {
        if (serialNumber != null && !serialNumber.isBlank()) {
            var oi = orderItemRepository.findBySerialOrImeiWithOrder(serialNumber);
            if (oi.isPresent()) {
                OrderDetail od = oi.get().getOrderDetail();
                if (od != null) {
                    return od;
                }
            }
        }
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        if (details.size() == 1) {
            return details.get(0);
        }
        throw new BadRequestException(
                "Không xác định được dòng hàng hoàn — cần serial hợp lệ trên đơn " + order.getOrderCode());
    }

    private RefundRequest.RefundChannel resolveChannel(Order.PaymentMethod method) {
        return switch (method) {
            case VNPAY, MOMO, ZALOPAY -> RefundRequest.RefundChannel.GATEWAY;
            case COD -> RefundRequest.RefundChannel.COD_MANUAL;
            case BANK_TRANSFER -> RefundRequest.RefundChannel.BANK_TRANSFER_MANUAL;
        };
    }

    private RefundRequest load(Integer id) {
        return refundRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RefundRequest", "id", id));
    }

    private void issueVoucher(RefundRequest refund) {
        if (refund.getVoucherCode() == null || refund.getVoucherCode().isBlank()) {
            refund.setVoucherCode(generateVoucherCode());
        }
    }

    private RefundDto.Voucher buildVoucher(RefundRequest r) {
        String reason = "Hoàn tiền đơn hàng " + r.getOrderCode();
        if (r.getWarrantyClaimCode() != null) {
            reason += " do bảo hành thu hồi (Phiếu BH " + r.getWarrantyClaimCode() + ")";
        } else if (r.getReturnSlipCode() != null) {
            reason += " do trả hàng (Phiếu kho " + r.getReturnSlipCode() + ")";
        }
        if (Boolean.TRUE.equals(r.getIsDefective())) {
            reason += " — hàng lỗi";
        }
        return RefundDto.Voucher.builder()
                .voucherCode(r.getVoucherCode())
                .issuedAt(r.getCompletedAt() != null ? r.getCompletedAt() : LocalDateTime.now())
                .recipientName(r.getCustomerBankAccountName() != null
                        ? r.getCustomerBankAccountName() : r.getCustomerName())
                .recipientBank(r.getCustomerBankName())
                .recipientAccount(r.getCustomerBankAccount())
                .reason(reason)
                .amount(r.getRefundAmount())
                .orderCode(r.getOrderCode())
                .returnSlipCode(r.getReturnSlipCode())
                .refundCode(r.getRefundCode())
                .receiptImageUrl(r.getReceiptImageUrl())
                .paymentMethodLabel(paymentMethodLabel(r.getPaymentMethod()))
                .gatewayTransactionId(r.getGatewayRefundId())
                .approvedBy(r.getApprovedBy())
                .build();
    }

    private PaymentTransaction findOriginalPayment(String orderCode) {
        return paymentTransactionRepository
                .findFirstByOrderCodeAndStatusOrderByCreatedAtDesc(
                        orderCode, PaymentTransaction.TransactionStatus.SUCCESS)
                .orElse(null);
    }

    private String generateRefundCode() {
        String prefix = "RF-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long count = refundRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> r.getRefundCode() != null && r.getRefundCode().startsWith(prefix))
                .count();
        return prefix + String.format("%04d", count + 1);
    }

    private String generateVoucherCode() {
        String prefix = "PC-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long count = refundRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> r.getVoucherCode() != null && r.getVoucherCode().startsWith(prefix))
                .count();
        return prefix + String.format("%04d", count + 1);
    }

    private RefundRequest.RefundStatus parseStatus(String raw) {
        try {
            return RefundRequest.RefundStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + raw);
        }
    }

    private String currentUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "system";
    }

    private String statusLabel(RefundRequest.RefundStatus status) {
        return switch (status) {
            case PENDING_APPROVAL -> "Chờ duyệt hoàn tiền";
            case REJECTED -> "Đã từ chối";
            case AWAITING_MANUAL_TRANSFER -> "Chờ chuyển khoản";
            case PROCESSING -> "Đang xử lý cổng";
            case COMPLETED -> "Đã hoàn tiền";
            case FAILED -> "Lỗi hoàn cổng (REFUND_ERROR)";
        };
    }

    private String defectiveReasonLabel(String reason, Boolean isDefective) {
        if (!Boolean.TRUE.equals(isDefective)) {
            return "Hàng tốt (AVAILABLE)";
        }
        if (reason == null) {
            return "Hàng lỗi";
        }
        return switch (reason) {
            case "DEFECTIVE_BY_CARRIER" -> "Hàng lỗi — Hãng vận chuyển";
            case "DEFECTIVE_BY_MANUFACTURER" -> "Hàng lỗi — Lỗi sản xuất";
            default -> reason;
        };
    }

    private String auditActionLabel(RefundAuditLog.Action action) {
        return switch (action) {
            case WAREHOUSE_RETURN_CONFIRMED -> "Kho xác nhận hoàn kho";
            case REFUND_CREATED -> "Tạo phiếu hoàn tiền";
            case BANK_INFO_SAVED -> "Sales lưu STK khách";
            case GATEWAY_BALANCE_CHECKED -> "Kiểm tra số dư cổng";
            case GATEWAY_REFUND_APPROVED -> "Duyệt hoàn qua cổng";
            case GATEWAY_REFUND_RETRY -> "Thử lại hoàn cổng";
            case GATEWAY_REFUND_FAILED -> "Hoàn cổng thất bại";
            case COD_REFUND_CONFIRMED -> "Xác nhận chi tiền thủ công";
            case REFUND_REJECTED -> "Từ chối hoàn tiền";
            case ORDER_CANCEL_REFUND -> "Hủy đơn — hoàn cổng tự động";
        };
    }

    private Optional<RefundRequest> findExistingCancellationRefund(Integer orderId) {
        return refundRepository.findByOrderId(orderId).stream()
                .filter(r -> r.getReturnSlipId() == null && r.getWarrantyClaimId() == null)
                .filter(r -> r.getReturnReason() != null && r.getReturnReason().startsWith("Hủy đơn"))
                .findFirst();
    }

    private RefundAmountBreakdown resolveFullOrderCancellationAmount(Order order) {
        BigDecimal discount = order.getDiscountAmount() != null
                ? order.getDiscountAmount() : BigDecimal.ZERO;
        BigDecimal total = order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO;
        return new RefundAmountBreakdown(total, discount, BigDecimal.ZERO);
    }

    private String buildCancellationReason(String cancelReason, String orderCode) {
        String base = "Hủy đơn trước giao hàng — " + orderCode;
        if (cancelReason != null && !cancelReason.isBlank()) {
            return base + " | " + cancelReason.trim();
        }
        return base;
    }

    private String resolveOrderProductLabel(Order order) {
        List<OrderDetail> details = orderDetailRepository.findByOrderId(order.getId());
        if (details.isEmpty()) {
            return "Toàn bộ đơn hàng";
        }
        if (details.size() == 1) {
            return details.get(0).getProductName();
        }
        return details.get(0).getProductName() + " (+ " + (details.size() - 1) + " SP khác)";
    }

    private String buildCancellationRefundMessage(RefundDto.Detail result) {
        if ("COMPLETED".equals(result.getStatus())) {
            return "Đã hủy đơn và hoàn " + result.getRefundAmount() + " VND qua "
                    + result.getPaymentMethodLabel() + " (" + result.getRefundCode() + ").";
        }
        if ("FAILED".equals(result.getStatus())) {
            return "Đã hủy đơn. Hoàn cổng thất bại — xem " + result.getRefundCode()
                    + " tại Quản lý hoàn tiền để thử lại. "
                    + (result.getFailureReason() != null ? result.getFailureReason() : "");
        }
        return "Đã tạo " + result.getRefundCode() + " — đang xử lý hoàn cổng.";
    }

    private RefundDto.AuditLogEntry toAuditEntry(RefundAuditLog log) {
        return RefundDto.AuditLogEntry.builder()
                .id(log.getId())
                .action(log.getAction().name())
                .actionLabel(auditActionLabel(log.getAction()))
                .actorUsername(log.getActorUsername())
                .actorRole(log.getActorRole())
                .detail(log.getDetail())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private String channelLabel(RefundRequest.RefundChannel channel) {
        return switch (channel) {
            case GATEWAY -> "Cổng thanh toán (tự động)";
            case COD_MANUAL -> "COD — chuyển khoản thủ công";
            case BANK_TRANSFER_MANUAL -> "Chuyển khoản ngân hàng";
        };
    }

    private String paymentMethodLabel(Order.PaymentMethod method) {
        return switch (method) {
            case COD -> "COD";
            case BANK_TRANSFER -> "Chuyển khoản";
            case MOMO -> "MoMo";
            case VNPAY -> "VNPay";
            case ZALOPAY -> "ZaloPay";
        };
    }

    private RefundDto.Summary toSummary(RefundRequest r) {
        return RefundDto.Summary.builder()
                .id(r.getId())
                .refundCode(r.getRefundCode())
                .status(r.getStatus().name())
                .statusLabel(statusLabel(r.getStatus()))
                .orderCode(r.getOrderCode())
                .returnSlipCode(r.getReturnSlipCode())
                .warrantyClaimCode(r.getWarrantyClaimCode())
                .serialNumber(r.getSerialNumber())
                .customerName(r.getCustomerName())
                .customerPhone(r.getCustomerPhone())
                .productName(r.getProductName())
                .refundAmount(r.getRefundAmount())
                .paymentMethod(r.getPaymentMethod().name())
                .refundChannel(r.getRefundChannel().name())
                .refundChannelLabel(channelLabel(r.getRefundChannel()))
                .isDefective(r.getIsDefective())
                .defectiveReason(r.getDefectiveReason())
                .defectiveReasonLabel(defectiveReasonLabel(r.getDefectiveReason(), r.getIsDefective()))
                .voucherCode(r.getVoucherCode())
                .createdAt(r.getCreatedAt())
                .completedAt(r.getCompletedAt())
                .build();
    }

    private RefundDto.Detail toDetail(RefundRequest r) {
        Order order = orderRepository.findById(r.getOrderId()).orElse(null);
        PaymentTransaction origTxn = findOriginalPayment(r.getOrderCode());
        return RefundDto.Detail.builder()
                .id(r.getId())
                .refundCode(r.getRefundCode())
                .status(r.getStatus().name())
                .statusLabel(statusLabel(r.getStatus()))
                .orderId(r.getOrderId())
                .orderCode(r.getOrderCode())
                .orderStatus(order != null && order.getStatus() != null ? order.getStatus().name() : null)
                .orderPaymentStatus(order != null && order.getPaymentStatus() != null
                        ? order.getPaymentStatus().name() : null)
                .returnSlipId(r.getReturnSlipId())
                .returnSlipCode(r.getReturnSlipCode())
                .warrantyClaimId(r.getWarrantyClaimId())
                .warrantyClaimCode(r.getWarrantyClaimCode())
                .serialNumber(r.getSerialNumber())
                .customerName(r.getCustomerName())
                .customerPhone(r.getCustomerPhone())
                .productName(r.getProductName())
                .refundAmount(r.getRefundAmount())
                .paymentMethod(r.getPaymentMethod().name())
                .paymentMethodLabel(paymentMethodLabel(r.getPaymentMethod()))
                .refundChannel(r.getRefundChannel().name())
                .refundChannelLabel(channelLabel(r.getRefundChannel()))
                .isDefective(r.getIsDefective())
                .defectiveReason(r.getDefectiveReason())
                .defectiveReasonLabel(defectiveReasonLabel(r.getDefectiveReason(), r.getIsDefective()))
                .returnReason(r.getReturnReason())
                .couponAllocatedDiscount(r.getCouponAllocatedDiscount())
                .shippingExcludedAmount(r.getShippingExcludedAmount())
                .vietQrUrl(buildVietQrForRefund(r))
                .bankInfoSavedBy(r.getBankInfoSavedBy())
                .bankInfoSavedAt(r.getBankInfoSavedAt())
                .voucherCode(r.getVoucherCode())
                .customerBankName(r.getCustomerBankName())
                .customerBankAccount(r.getCustomerBankAccount())
                .customerBankAccountName(r.getCustomerBankAccountName())
                .gatewayRefundId(r.getGatewayRefundId())
                .gatewayResponse(r.getGatewayResponse())
                .failureReason(r.getFailureReason())
                .transferReference(r.getTransferReference())
                .receiptImageUrl(r.getReceiptImageUrl())
                .originalGatewayTransactionId(origTxn != null ? origTxn.getGatewayTransactionId() : null)
                .originalPaymentAmount(origTxn != null ? origTxn.getAmount()
                        : (order != null ? order.getTotalAmount() : null))
                .approvedBy(r.getApprovedBy())
                .approvedAt(r.getApprovedAt())
                .rejectedBy(r.getRejectedBy())
                .rejectedAt(r.getRejectedAt())
                .rejectionReason(r.getRejectionReason())
                .executedBy(r.getExecutedBy())
                .executedAt(r.getExecutedAt())
                .completedAt(r.getCompletedAt())
                .notes(r.getNotes())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String buildVietQrForRefund(RefundRequest r) {
        if (r.getCustomerBankAccount() == null || r.getCustomerBankAccount().isBlank()) {
            return null;
        }
        return napasLookupService.buildVietQrUrl(
                r.getCustomerBankName(),
                r.getCustomerBankAccount(),
                r.getCustomerBankAccountName(),
                r.getRefundAmount(),
                r.getRefundCode());
    }
}
