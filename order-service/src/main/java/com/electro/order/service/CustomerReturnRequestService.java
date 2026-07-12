package com.electro.order.service;

import com.electro.order.dto.CustomerReturnRequestDto;
import com.electro.order.entity.CustomerReturnRequest;
import com.electro.order.entity.Order;
import com.electro.order.entity.OrderDetail;
import com.electro.order.entity.OrderItem;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.repository.CustomerReturnRequestRepository;
import com.electro.order.repository.OrderItemRepository;
import com.electro.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerReturnRequestService {

    private static final Logger log = LoggerFactory.getLogger(CustomerReturnRequestService.class);

    /** Số ngày sau khi giao hàng khách được phép tạo yêu cầu trả */
    public static final int RETURN_REQUEST_WINDOW_DAYS = 15;
    /** Số ngày khách phải gửi hàng về sau khi Sales duyệt */
    public static final int SHIP_BACK_DEADLINE_DAYS = 7;

    private static final List<CustomerReturnRequest.RequestStatus> ACTIVE_STATUSES = List.of(
            CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW,
            CustomerReturnRequest.RequestStatus.APPROVED,
            CustomerReturnRequest.RequestStatus.SHIPPED_BY_CUSTOMER
    );

    private static final List<CustomerReturnRequest.RequestStatus> WAREHOUSE_ELIGIBLE = List.of(
            CustomerReturnRequest.RequestStatus.APPROVED,
            CustomerReturnRequest.RequestStatus.SHIPPED_BY_CUSTOMER
    );

    private final CustomerReturnRequestRepository repository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    @Transactional
    public CustomerReturnRequestDto.Detail create(Integer userId, CustomerReturnRequestDto.CreateRequest request) {
        String orderCode = request.getOrderCode().trim();
        String serial = request.getSerialNumber().trim();

        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "orderCode", orderCode));

        if (!order.getUserId().equals(userId)) {
            throw new BadRequestException("Đơn hàng không thuộc tài khoản của bạn.");
        }

        validateOrderEligibleForReturnRequest(order);

        OrderItem orderItem = orderItemRepository.findBySerialOrImeiWithOrder(serial)
                .orElseThrow(() -> new ResourceNotFoundException("OrderItem", "serialNumber", serial));

        Order orderOfItem = orderItem.getOrderDetail().getOrder();
        if (!orderOfItem.getId().equals(order.getId())) {
            throw new BadRequestException("Serial không thuộc đơn hàng này.");
        }

        if (repository.existsBySerialNumberAndStatusIn(serial, ACTIVE_STATUSES)) {
            throw new BadRequestException("Serial này đã có yêu cầu trả hàng đang xử lý.");
        }

        CustomerReturnRequest.ReasonType reasonType = parseReasonType(request.getReasonType());
        OrderDetail detail = orderItem.getOrderDetail();

        CustomerReturnRequest entity = CustomerReturnRequest.builder()
                .requestCode(generateRequestCode())
                .status(CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW)
                .userId(userId)
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .orderItemId(orderItem.getId())
                .orderDetailId(detail != null ? detail.getId() : null)
                .productItemId(orderItem.getProductItemId())
                .serialNumber(resolveSerial(orderItem))
                .productName(detail != null ? detail.getProductName() : null)
                .skuCode(detail != null ? detail.getSkuCode() : null)
                .variantName(detail != null ? detail.getVariantName() : null)
                .reasonType(reasonType)
                .reasonDetail(trimToNull(request.getReasonDetail()))
                .customerName(order.getShippingName())
                .customerPhone(order.getShippingPhone())
                .build();

        CustomerReturnRequest saved = repository.save(entity);
        log.info("Customer return request {} created for order {} serial {}",
                saved.getRequestCode(), order.getOrderCode(), serial);
        return toDetail(saved, order, false, false);
    }

    @Transactional(readOnly = true)
    public List<CustomerReturnRequestDto.Summary> listMine(Integer userId) {
        expireOverdueApprovedRequests();
        return repository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toSummary)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CustomerReturnRequestDto.Detail getMine(Integer userId, Integer id) {
        CustomerReturnRequest entity = load(id);
        if (!entity.getUserId().equals(userId)) {
            throw new BadRequestException("Yêu cầu không thuộc tài khoản của bạn.");
        }
        Order order = orderRepository.findById(entity.getOrderId()).orElse(null);
        return toDetail(entity, order, false, false);
    }

    @Transactional(readOnly = true)
    public List<CustomerReturnRequestDto.Summary> listForAdmin(String statusFilter) {
        expireOverdueApprovedRequests();
        List<CustomerReturnRequest> rows;
        if (statusFilter != null && !statusFilter.isBlank()) {
            rows = repository.findByStatusOrderByCreatedAtDesc(parseStatus(statusFilter));
        } else {
            rows = repository.findAllByOrderByCreatedAtDesc();
        }
        return rows.stream().map(this::toSummary).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CustomerReturnRequestDto.Detail getForAdmin(Integer id) {
        CustomerReturnRequest entity = load(id);
        Order order = orderRepository.findById(entity.getOrderId()).orElse(null);
        boolean canReview = entity.getStatus() == CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW;
        return toDetail(entity, order, canReview, false);
    }

    @Transactional
    public CustomerReturnRequestDto.Detail approve(Integer id, CustomerReturnRequestDto.ReviewRequest request) {
        CustomerReturnRequest entity = load(id);
        if (entity.getStatus() != CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW) {
            throw new BadRequestException("Yêu cầu không ở trạng thái chờ Sales duyệt.");
        }

        entity.setStatus(CustomerReturnRequest.RequestStatus.APPROVED);
        entity.setReviewedAt(LocalDateTime.now());
        entity.setReviewedByUserId(currentUserId());
        entity.setReviewedByUsername(currentUsername());
        entity.setSalesResponseNote(trimToNull(request != null ? request.getSalesResponseNote() : null));
        entity.setShipDeadline(LocalDateTime.now().plusDays(SHIP_BACK_DEADLINE_DAYS));

        CustomerReturnRequest saved = repository.save(entity);
        log.info("Return request {} approved by {}", saved.getRequestCode(), saved.getReviewedByUsername());
        Order order = orderRepository.findById(saved.getOrderId()).orElse(null);
        return toDetail(saved, order, false, false);
    }

    @Transactional
    public CustomerReturnRequestDto.Detail reject(Integer id, CustomerReturnRequestDto.RejectRequest request) {
        CustomerReturnRequest entity = load(id);
        if (entity.getStatus() != CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW) {
            throw new BadRequestException("Yêu cầu không ở trạng thái chờ Sales duyệt.");
        }
        if (request.getRejectionReason() == null || request.getRejectionReason().isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do từ chối.");
        }

        entity.setStatus(CustomerReturnRequest.RequestStatus.REJECTED);
        entity.setReviewedAt(LocalDateTime.now());
        entity.setReviewedByUserId(currentUserId());
        entity.setReviewedByUsername(currentUsername());
        entity.setRejectionReason(request.getRejectionReason().trim());
        entity.setSalesResponseNote(trimToNull(request.getSalesResponseNote()));

        CustomerReturnRequest saved = repository.save(entity);
        log.info("Return request {} rejected by {}", saved.getRequestCode(), saved.getReviewedByUsername());
        Order order = orderRepository.findById(saved.getOrderId()).orElse(null);
        return toDetail(saved, order, false, false);
    }

    @Transactional
    public CustomerReturnRequestDto.Detail markShippedByCustomer(
            Integer userId, Integer id, CustomerReturnRequestDto.ShipRequest request) {
        CustomerReturnRequest entity = load(id);
        if (!entity.getUserId().equals(userId)) {
            throw new BadRequestException("Yêu cầu không thuộc tài khoản của bạn.");
        }
        if (entity.getStatus() != CustomerReturnRequest.RequestStatus.APPROVED) {
            throw new BadRequestException("Chỉ có thể báo đã gửi hàng khi yêu cầu đã được Sales duyệt.");
        }
        expireIfPastDeadline(entity);
        if (entity.getStatus() == CustomerReturnRequest.RequestStatus.EXPIRED) {
            throw new BadRequestException("Đã quá hạn gửi hàng về (" + SHIP_BACK_DEADLINE_DAYS + " ngày).");
        }

        entity.setStatus(CustomerReturnRequest.RequestStatus.SHIPPED_BY_CUSTOMER);
        entity.setCustomerShippedAt(LocalDateTime.now());
        entity.setCustomerReturnTracking(trimToNull(
                request != null ? request.getReturnTrackingCode() : null));

        CustomerReturnRequest saved = repository.save(entity);
        Order order = orderRepository.findById(saved.getOrderId()).orElse(null);
        return toDetail(saved, order, false, false);
    }

    @Transactional
    public CustomerReturnRequestDto.Detail cancelByCustomer(Integer userId, Integer id) {
        CustomerReturnRequest entity = load(id);
        if (!entity.getUserId().equals(userId)) {
            throw new BadRequestException("Yêu cầu không thuộc tài khoản của bạn.");
        }
        if (entity.getStatus() != CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW) {
            throw new BadRequestException("Chỉ có thể hủy yêu cầu đang chờ Sales duyệt.");
        }

        entity.setStatus(CustomerReturnRequest.RequestStatus.CANCELLED);
        CustomerReturnRequest saved = repository.save(entity);
        Order order = orderRepository.findById(saved.getOrderId()).orElse(null);
        return toDetail(saved, order, false, false);
    }

    @Transactional(readOnly = true)
    public CustomerReturnRequestDto.WarehouseLookupResponse lookupForWarehouse(String serial) {
        expireOverdueApprovedRequests();
        String kw = serial == null ? "" : serial.trim();
        if (kw.isEmpty()) {
            throw new BadRequestException("Vui lòng nhập Serial.");
        }
        return repository.findFirstBySerialNumberAndStatusIn(kw, WAREHOUSE_ELIGIBLE)
                .map(this::toWarehouseLookup)
                .orElse(null);
    }

    @Transactional
    public void linkWarehouseSlip(CustomerReturnRequestDto.WarehouseLinkRequest request) {
        CustomerReturnRequest entity = load(request.getReturnRequestId());
        if (!WAREHOUSE_ELIGIBLE.contains(entity.getStatus())
                && entity.getStatus() != CustomerReturnRequest.RequestStatus.RECEIVED_AT_WAREHOUSE) {
            throw new BadRequestException("Yêu cầu trả hàng không ở trạng thái chờ kho nhận.");
        }
        entity.setReturnSlipId(request.getReturnSlipId());
        entity.setReturnSlipCode(request.getReturnSlipCode());
        if (entity.getStatus() != CustomerReturnRequest.RequestStatus.RECEIVED_AT_WAREHOUSE) {
            entity.setStatus(CustomerReturnRequest.RequestStatus.RECEIVED_AT_WAREHOUSE);
        }
        repository.save(entity);
        log.info("Linked return request {} to slip {}", entity.getRequestCode(), request.getReturnSlipCode());
    }

    @Transactional
    public void markReceivedAtWarehouseBySerial(String serial, Integer returnSlipId, String returnSlipCode) {
        repository.findFirstBySerialNumberAndStatusIn(serial, WAREHOUSE_ELIGIBLE)
                .ifPresent(entity -> {
                    entity.setReturnSlipId(returnSlipId);
                    entity.setReturnSlipCode(returnSlipCode);
                    entity.setStatus(CustomerReturnRequest.RequestStatus.RECEIVED_AT_WAREHOUSE);
                    repository.save(entity);
                });
    }

    private void validateOrderEligibleForReturnRequest(Order order) {
        Order.OrderStatus st = order.getStatus();
        if (st != Order.OrderStatus.DELIVERED && st != Order.OrderStatus.COMPLETED) {
            throw new BadRequestException(
                    "Chỉ được yêu cầu trả hàng khi đơn đã giao (DELIVERED/HOÀN THÀNH).");
        }
        if (st == Order.OrderStatus.REFUNDED) {
            throw new BadRequestException("Đơn đã hoàn tiền — không thể tạo yêu cầu trả hàng.");
        }
        if (order.getPaymentMethod() == Order.PaymentMethod.COD) {
            if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
                throw new BadRequestException("Đơn COD chưa được thu tiền — chưa thể yêu cầu trả hàng.");
            }
        } else if (order.getPaymentStatus() != Order.PaymentStatus.PAID) {
            throw new BadRequestException("Đơn chưa thanh toán — không thể yêu cầu trả hàng.");
        }
        LocalDateTime deliveredAt = order.getDeliveredAt();
        if (deliveredAt != null) {
            long days = ChronoUnit.DAYS.between(deliveredAt, LocalDateTime.now());
            if (days > RETURN_REQUEST_WINDOW_DAYS) {
                throw new BadRequestException(
                        "Đã quá " + RETURN_REQUEST_WINDOW_DAYS + " ngày kể từ khi giao hàng — không thể yêu cầu trả.");
            }
        }
    }

    private void expireOverdueApprovedRequests() {
        LocalDateTime now = LocalDateTime.now();
        repository.findByStatusOrderByCreatedAtDesc(CustomerReturnRequest.RequestStatus.APPROVED)
                .stream()
                .filter(r -> r.getShipDeadline() != null && r.getShipDeadline().isBefore(now))
                .forEach(r -> {
                    r.setStatus(CustomerReturnRequest.RequestStatus.EXPIRED);
                    repository.save(r);
                });
    }

    private void expireIfPastDeadline(CustomerReturnRequest entity) {
        if (entity.getShipDeadline() != null
                && entity.getShipDeadline().isBefore(LocalDateTime.now())) {
            entity.setStatus(CustomerReturnRequest.RequestStatus.EXPIRED);
            repository.save(entity);
        }
    }

    private CustomerReturnRequest load(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CustomerReturnRequest", "id", id));
    }

    private String generateRequestCode() {
        String prefix = "RR-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        long count = repository.findAllByOrderByCreatedAtDesc().stream()
                .filter(r -> r.getRequestCode() != null && r.getRequestCode().startsWith(prefix))
                .count();
        return prefix + String.format("%04d", count + 1);
    }

    private String resolveSerial(OrderItem item) {
        if (item.getSerialNumber() != null && !item.getSerialNumber().isBlank()) {
            return item.getSerialNumber();
        }
        return item.getImei();
    }

    private CustomerReturnRequest.ReasonType parseReasonType(String raw) {
        try {
            return CustomerReturnRequest.ReasonType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Lý do trả hàng không hợp lệ: " + raw);
        }
    }

    private CustomerReturnRequest.RequestStatus parseStatus(String raw) {
        try {
            return CustomerReturnRequest.RequestStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + raw);
        }
    }

    private String trimToNull(String s) {
        if (s == null || s.isBlank()) return null;
        return s.trim();
    }

    private Integer currentUserId() {
        return null;
    }

    private String currentUsername() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getName() != null ? auth.getName() : "system";
    }

    private Integer computeDaysLeft(LocalDateTime shipDeadline) {
        if (shipDeadline == null) return null;
        long days = ChronoUnit.DAYS.between(LocalDateTime.now(), shipDeadline);
        return (int) Math.max(0, days);
    }

    private CustomerReturnRequestDto.Summary toSummary(CustomerReturnRequest r) {
        return CustomerReturnRequestDto.Summary.builder()
                .id(r.getId())
                .requestCode(r.getRequestCode())
                .status(r.getStatus().name())
                .statusLabel(statusLabel(r.getStatus()))
                .orderCode(r.getOrderCode())
                .serialNumber(r.getSerialNumber())
                .productName(r.getProductName())
                .reasonType(r.getReasonType().name())
                .reasonTypeLabel(reasonTypeLabel(r.getReasonType()))
                .reasonDetail(r.getReasonDetail())
                .createdAt(r.getCreatedAt())
                .reviewedAt(r.getReviewedAt())
                .shipDeadline(r.getShipDeadline())
                .customerShippedAt(r.getCustomerShippedAt())
                .customerReturnTracking(r.getCustomerReturnTracking())
                .salesResponseNote(r.getSalesResponseNote())
                .rejectionReason(r.getRejectionReason())
                .returnSlipCode(r.getReturnSlipCode())
                .daysLeftToShip(computeDaysLeft(r.getShipDeadline()))
                .build();
    }

    private CustomerReturnRequestDto.Detail toDetail(
            CustomerReturnRequest r, Order order, boolean canSalesReview, boolean ignored) {
        boolean canCustomerShip = r.getStatus() == CustomerReturnRequest.RequestStatus.APPROVED
                && (r.getShipDeadline() == null || r.getShipDeadline().isAfter(LocalDateTime.now()));
        boolean canCustomerCancel = r.getStatus() == CustomerReturnRequest.RequestStatus.PENDING_SALES_REVIEW;

        return CustomerReturnRequestDto.Detail.builder()
                .id(r.getId())
                .requestCode(r.getRequestCode())
                .status(r.getStatus().name())
                .statusLabel(statusLabel(r.getStatus()))
                .userId(r.getUserId())
                .orderId(r.getOrderId())
                .orderCode(r.getOrderCode())
                .orderStatus(order != null && order.getStatus() != null ? order.getStatus().name() : null)
                .orderItemId(r.getOrderItemId())
                .orderDetailId(r.getOrderDetailId())
                .productItemId(r.getProductItemId())
                .serialNumber(r.getSerialNumber())
                .productName(r.getProductName())
                .skuCode(r.getSkuCode())
                .variantName(r.getVariantName())
                .reasonType(r.getReasonType().name())
                .reasonTypeLabel(reasonTypeLabel(r.getReasonType()))
                .reasonDetail(r.getReasonDetail())
                .customerName(r.getCustomerName())
                .customerPhone(r.getCustomerPhone())
                .reviewedByUserId(r.getReviewedByUserId())
                .reviewedByUsername(r.getReviewedByUsername())
                .reviewedAt(r.getReviewedAt())
                .salesResponseNote(r.getSalesResponseNote())
                .rejectionReason(r.getRejectionReason())
                .shipDeadline(r.getShipDeadline())
                .customerShippedAt(r.getCustomerShippedAt())
                .customerReturnTracking(r.getCustomerReturnTracking())
                .returnSlipId(r.getReturnSlipId())
                .returnSlipCode(r.getReturnSlipCode())
                .createdAt(r.getCreatedAt())
                .daysLeftToShip(computeDaysLeft(r.getShipDeadline()))
                .canCustomerShip(canCustomerShip)
                .canCustomerCancel(canCustomerCancel)
                .canSalesReview(canSalesReview)
                .build();
    }

    private CustomerReturnRequestDto.WarehouseLookupResponse toWarehouseLookup(CustomerReturnRequest r) {
        return CustomerReturnRequestDto.WarehouseLookupResponse.builder()
                .returnRequestId(r.getId())
                .requestCode(r.getRequestCode())
                .status(r.getStatus().name())
                .statusLabel(statusLabel(r.getStatus()))
                .orderCode(r.getOrderCode())
                .serialNumber(r.getSerialNumber())
                .productName(r.getProductName())
                .reasonTypeLabel(reasonTypeLabel(r.getReasonType()))
                .reasonDetail(r.getReasonDetail())
                .shipDeadline(r.getShipDeadline())
                .daysLeftToShip(computeDaysLeft(r.getShipDeadline()))
                .build();
    }

    private String statusLabel(CustomerReturnRequest.RequestStatus status) {
        return switch (status) {
            case PENDING_SALES_REVIEW -> "Chờ Sales duyệt";
            case APPROVED -> "Đã duyệt — chờ khách gửi hàng";
            case REJECTED -> "Sales từ chối";
            case SHIPPED_BY_CUSTOMER -> "Khách đã gửi hàng về";
            case RECEIVED_AT_WAREHOUSE -> "Kho đã tiếp nhận";
            case CANCELLED -> "Khách đã hủy";
            case EXPIRED -> "Quá hạn gửi hàng";
        };
    }

    private String reasonTypeLabel(CustomerReturnRequest.ReasonType type) {
        return switch (type) {
            case CHANGE_OF_MIND -> "Đổi ý / không muốn giữ";
            case WRONG_PRODUCT -> "Sai mẫu / sai sản phẩm";
            case COLOR_ISSUE -> "Không thích màu / kiểu dáng";
            case MINOR_DAMAGE -> "Trầy xước nhẹ / lỗi ngoại quan";
            case MISSING_ACCESSORY -> "Thiếu phụ kiện";
            case OTHER -> "Lý do khác";
        };
    }

    public static boolean isEligibleOrderStatusForReturn(String status) {
        if (status == null) return false;
        return EnumSet.of(Order.OrderStatus.DELIVERED, Order.OrderStatus.COMPLETED)
                .contains(Order.OrderStatus.valueOf(status));
    }
}
