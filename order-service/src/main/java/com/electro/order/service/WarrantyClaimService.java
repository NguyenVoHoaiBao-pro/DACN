package com.electro.order.service;

import com.electro.order.client.CatalogClient;
import com.electro.order.client.UserClient;
import com.electro.order.dto.CatalogClientDto;
import com.electro.order.dto.GHNDto;
import com.electro.order.dto.UserDto;
import com.electro.order.dto.WarrantyDto;
import com.electro.order.entity.Order;
import com.electro.order.entity.WarrantyClaim;
import com.electro.order.exception.BadRequestException;
import com.electro.order.exception.ResourceNotFoundException;
import com.electro.order.repository.OrderRepository;
import com.electro.order.repository.WarrantyClaimRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class WarrantyClaimService {

    private final WarrantyClaimRepository claimRepository;
    private final OrderRepository orderRepository;
    private final CatalogClient catalogClient;
    private final UserClient userClient;
    private final GHNService ghnService;

    public WarrantyDto.ClaimDetailResponse submitClaim(Integer userId, WarrantyDto.ClaimSubmitRequest request) {
        if (request.getOrderId() != null) {
            Order order = orderRepository.findById(request.getOrderId())
                    .orElseThrow(() -> new BadRequestException("Đơn hàng không tồn tại."));
            if (!Objects.equals(order.getUserId(), userId)) {
                throw new BadRequestException("Đơn hàng không thuộc tài khoản của bạn.");
            }
            if (order.getStatus() != Order.OrderStatus.SHIPPING
                    && order.getStatus() != Order.OrderStatus.DELIVERED
                    && order.getStatus() != Order.OrderStatus.COMPLETED) {
                throw new BadRequestException(
                        "Chỉ gửi bảo hành khi đơn đang giao hoặc đã giao (SHIPPING / DELIVERED / COMPLETED).");
            }
        }

        String code = request.getSubmittedImei().trim();
        CatalogClientDto.ProductItemResponse item;
        try {
            item = catalogClient.findItemByCode(code);
        } catch (Exception e) {
            throw new BadRequestException("Không tìm thấy thiết bị với IMEI/Serial đã nhập.");
        }

        CatalogClientDto.VariantResponse variant = catalogClient.getVariantById(item.getVariantId());
        WarrantyDto.Response warrantyCheck = buildWarrantyCheck(item, variant);

        WarrantyClaim claim = new WarrantyClaim();
        claim.setClaimNumber(generateClaimNumber());
        claim.setUserId(userId);
        claim.setOrderId(request.getOrderId());
        claim.setOrderDetailId(request.getOrderDetailId());
        claim.setProductItemId(item.getId());
        claim.setVariantId(item.getVariantId());
        claim.setProductName(variant != null && variant.getProduct() != null
                ? variant.getProduct().getName()
                : "Sản phẩm");
        claim.setSerialNumber(item.getSerialNumber());
        claim.setImei(code);
        claim.setIssueType(parseIssueType(request.getIssueType()));
        claim.setIssueDescription(request.getIssueDescription().trim());
        claim.setCustomerRequest(parseCustomerRequest(request.getCustomerRequest()));
        claim.setStatus(WarrantyClaim.ClaimStatus.PENDING);
        claim.setPriority(WarrantyClaim.Priority.NORMAL);
        claim.setContactName(request.getContactName().trim());
        claim.setContactPhone(request.getContactPhone().trim());
        claim.setContactEmail(request.getContactEmail());
        claim.setContactAddress(request.getContactAddress().trim());
        claim.setContactProvince(request.getContactProvince().trim());
        claim.setContactDistrict(request.getContactDistrict().trim());
        claim.setContactWard(request.getContactWard().trim());
        claim.setPickupToDistrictId(request.getPickupToDistrictId());
        claim.setPickupToWardCode(request.getPickupToWardCode().trim());
        claim.setImageUrl1(request.getImageUrl1());
        claim.setImageUrl2(request.getImageUrl2());
        claim.setImageUrl3(request.getImageUrl3());
        claim.setVideoUrl(request.getVideoUrl());
        claim.setIsUnderWarranty(warrantyCheck.isValid());
        WarrantyClaim saved = claimRepository.save(claim);
        return mapToDetail(saved, buildSystemInfo(saved, item, variant));
    }

    public Page<WarrantyDto.ClaimSummaryResponse> listMyClaims(Integer userId, Pageable pageable) {
        return claimRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable).map(this::mapToSummary);
    }

    public WarrantyDto.ClaimDetailResponse getMyClaimDetail(Integer userId, Integer id) {
        WarrantyClaim claim = findClaim(id);
        if (!Objects.equals(claim.getUserId(), userId)) {
            throw new BadRequestException("Bạn không có quyền xem yêu cầu bảo hành này.");
        }
        CatalogClientDto.ProductItemResponse item = loadItem(claim.getProductItemId());
        CatalogClientDto.VariantResponse variant = item != null
                ? catalogClient.getVariantById(item.getVariantId()) : null;
        return mapToDetail(claim, buildSystemInfo(claim, item, variant));
    }

    public Page<WarrantyDto.ClaimSummaryResponse> listClaims(String keyword, String status, Pageable pageable) {
        WarrantyClaim.ClaimStatus st = parseStatus(status);
        return claimRepository.searchClaims(keyword, st, pageable).map(this::mapToSummary);
    }

    public WarrantyDto.ClaimDetailResponse getClaimDetail(Integer id) {
        WarrantyClaim claim = findClaim(id);
        CatalogClientDto.ProductItemResponse item = loadItem(claim.getProductItemId());
        CatalogClientDto.VariantResponse variant = item != null
                ? catalogClient.getVariantById(item.getVariantId()) : null;
        return mapToDetail(claim, buildSystemInfo(claim, item, variant));
    }

    /** Sales: duyệt thu hồi hàng — PENDING → APPROVED */
    public WarrantyDto.ClaimDetailResponse approveForCollection(Integer id, WarrantyDto.ClaimVerifyRequest request) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.PENDING) {
            throw new BadRequestException("Chỉ duyệt được yêu cầu ở trạng thái Chờ xử lý (PENDING).");
        }
        WarrantyDto.SystemVerificationInfo info = buildSystemInfo(claim, loadItem(claim.getProductItemId()), null);
        if (!info.isImeiMatch()) {
            throw new BadRequestException("IMEI khách nhập không khớp hệ thống. Không thể duyệt.");
        }
        if (!info.isWarrantyValid()) {
            throw new BadRequestException("Thiết bị đã hết hạn bảo hành. Không thể duyệt thu hồi.");
        }
        claim.setStatus(WarrantyClaim.ClaimStatus.APPROVED);
        claim.setStaffId(currentStaffId());
        if (request != null && request.getStaffNotes() != null) {
            claim.setStaffNotes(request.getStaffNotes().trim());
        }
        String carrier = request != null && request.getReturnCarrier() != null
                ? request.getReturnCarrier().trim() : "";
        String tracking = request != null && request.getReturnTrackingCode() != null
                ? request.getReturnTrackingCode().trim() : "";
        if (carrier.isEmpty()) {
            carrier = "GHTK";
        }
        if (isGhnCarrier(carrier) && tracking.isEmpty()) {
            tryCreateGhnReturnOrder(claim).ifPresent(code -> {
                claim.setReturnCarrier("GHN");
                claim.setReturnTrackingCode(code);
            });
        }
        if (claim.getReturnTrackingCode() == null || claim.getReturnTrackingCode().isBlank()) {
            if (tracking.isEmpty()) {
                tracking = "GHTK-" + claim.getClaimNumber();
            }
            claim.setReturnCarrier(carrier);
            claim.setReturnTrackingCode(tracking);
        }
        return mapToDetail(claimRepository.save(claim), info);
    }

    /** Tra cứu hành trình vận đơn thu hồi (GHN). */
    public GHNDto.TrackingResponse getReturnTracking(Integer id) {
        WarrantyClaim claim = findClaim(id);
        if (!isGhnCarrier(claim.getReturnCarrier())) {
            throw new BadRequestException("Chỉ tra cứu GHN khi đơn vị VC là GHN.");
        }
        String code = claim.getReturnTrackingCode();
        if (code == null || code.isBlank() || code.startsWith("GHTK-")) {
            throw new BadRequestException("Chưa có mã vận đơn GHN hợp lệ cho ticket này.");
        }
        return ghnService.getTrackingInfo(code.trim());
    }

    /** Sales: từ chối — PENDING → REJECTED */
    public WarrantyDto.ClaimDetailResponse rejectClaim(Integer id, WarrantyDto.ClaimRejectRequest request) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.PENDING
                && claim.getStatus() != WarrantyClaim.ClaimStatus.INSPECTING) {
            throw new BadRequestException("Không thể từ chối ở trạng thái hiện tại: " + claim.getStatus());
        }
        cancelGhnReturnIfAny(claim);
        claim.setStatus(WarrantyClaim.ClaimStatus.REJECTED);
        claim.setStaffId(currentStaffId());
        claim.setStaffNotes(request.getReason().trim());
        claim.setCompletedDate(LocalDateTime.now());
        return mapToDetail(claimRepository.save(claim), buildSystemInfo(claim, loadItem(claim.getProductItemId()), null));
    }

    /** Kho: tra cứu ticket chờ nhận máy (APPROVED) theo mã vận đơn hoặc mã ticket */
    public WarrantyDto.ClaimInboundView lookupForInbound(String keyword) {
        String kw = normalizeInboundKeyword(keyword);
        if (kw.isEmpty()) {
            throw new BadRequestException("Vui lòng nhập mã vận đơn thu hồi hoặc mã Ticket bảo hành.");
        }
        WarrantyClaim claim = claimRepository.findApprovedByInboundKeyword(kw, WarrantyClaim.ClaimStatus.APPROVED)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "WarrantyClaim",
                        "keyword",
                        "Không tìm thấy ticket APPROVED với mã: " + kw));
        return mapToInboundView(claim, loadItem(claim.getProductItemId()));
    }

    /** Kho: đã nhận máy — APPROVED → RECEIVED */
    public WarrantyDto.ClaimDetailResponse markReceived(Integer id, WarrantyDto.ClaimInboundReceiveRequest request) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.APPROVED) {
            throw new BadRequestException("Chỉ xác nhận nhận hàng khi đơn đã được duyệt thu hồi (APPROVED).");
        }
        if (request != null) {
            String receivedImei = request.getReceivedImei().trim();
            CatalogClientDto.ProductItemResponse item = loadItem(claim.getProductItemId());
            String systemImei = item != null ? firstNonBlank(item.getImei(), item.getSerialNumber()) : claim.getImei();
            if (!imeiCodesMatch(systemImei, receivedImei)) {
                throw new BadRequestException(
                        "Số IMEI nhập vào không khớp với đơn hàng. Vui lòng kiểm tra lại thiết bị hoặc nhập lại bằng bàn phím.");
            }
            claim.setReceivedImei(receivedImei);
            claim.setReceivedBoxCondition(parseBoxCondition(request.getBoxCondition()));
            if (request.getWarehouseNotes() != null && !request.getWarehouseNotes().isBlank()) {
                claim.setWarehouseInboundNotes(request.getWarehouseNotes().trim());
            }
        }
        claim.setStatus(WarrantyClaim.ClaimStatus.RECEIVED);
        claim.setReceivedDate(LocalDateTime.now());
        if (claim.getProductItemId() != null) {
            catalogClient.updateItemStatus(claim.getProductItemId(), "IN_REPAIR");
        }
        return mapToDetail(claimRepository.save(claim), buildSystemInfo(claim, loadItem(claim.getProductItemId()), null));
    }

    /** Kỹ thuật: cập nhật biên bản — RECEIVED/APPROVED → INSPECTING */
    public WarrantyDto.ClaimDetailResponse submitInspection(Integer id, WarrantyDto.ClaimInspectionRequest request) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.RECEIVED
                && claim.getStatus() != WarrantyClaim.ClaimStatus.APPROVED) {
            throw new BadRequestException("Chỉ cập nhật biên bản khi máy đã về kho (RECEIVED).");
        }
        claim.setStatus(WarrantyClaim.ClaimStatus.INSPECTING);
        claim.setInspectionDate(LocalDateTime.now());
        claim.setInspectionResult(request.getInspectionResult().trim());
        return mapToDetail(claimRepository.save(claim), buildSystemInfo(claim, loadItem(claim.getProductItemId()), null));
    }

    /** Sales: phán quyết cuối — INSPECTING → REPAIRING/COMPLETED/REJECTED */
    public WarrantyDto.ClaimDetailResponse resolveClaim(Integer id, WarrantyDto.ClaimResolveRequest request) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.INSPECTING) {
            throw new BadRequestException("Chỉ đưa phán quyết khi đã có biên bản kỹ thuật (INSPECTING).");
        }
        WarrantyClaim.FinalResolution resolution = parseResolution(request.getResolution());
        claim.setFinalResolution(resolution);
        claim.setStaffId(currentStaffId());
        if (request.getStaffNotes() != null) {
            claim.setStaffNotes(request.getStaffNotes().trim());
        }

        String replacementOrderCode = null;
        switch (resolution) {
            case REPLACE -> {
                claim.setStatus(WarrantyClaim.ClaimStatus.COMPLETED);
                claim.setCompletedDate(LocalDateTime.now());
                replacementOrderCode = "BH-REPLACE-" + claim.getClaimNumber();
                log.info("Warranty REPLACE: stub zero-order {} for claim {}", replacementOrderCode, claim.getClaimNumber());
            }
            case REPAIR_RETURN -> {
                claim.setStatus(WarrantyClaim.ClaimStatus.REPAIRING);
                log.info("Warranty REPAIR_RETURN: ship repaired device for claim {}", claim.getClaimNumber());
            }
            case REJECT -> {
                claim.setStatus(WarrantyClaim.ClaimStatus.REJECTED);
                claim.setCompletedDate(LocalDateTime.now());
                if (claim.getProductItemId() != null) {
                    catalogClient.updateItemStatus(claim.getProductItemId(), "SOLD");
                }
            }
        }

        WarrantyDto.ClaimDetailResponse response = mapToDetail(
                claimRepository.save(claim),
                buildSystemInfo(claim, loadItem(claim.getProductItemId()), null));
        response.setReplacementOrderCode(replacementOrderCode);
        return response;
    }

    /** Hoàn tất ticket sau sửa chữa */
    public WarrantyDto.ClaimDetailResponse closeTicket(Integer id) {
        WarrantyClaim claim = findClaim(id);
        if (claim.getStatus() != WarrantyClaim.ClaimStatus.REPAIRING) {
            throw new BadRequestException("Chỉ hoàn tất ticket đang sửa chữa (REPAIRING).");
        }
        claim.setStatus(WarrantyClaim.ClaimStatus.COMPLETED);
        claim.setCompletedDate(LocalDateTime.now());
        claim.setReturnedDate(LocalDateTime.now());
        if (claim.getProductItemId() != null) {
            catalogClient.updateItemStatus(claim.getProductItemId(), "SOLD");
        }
        return mapToDetail(claimRepository.save(claim), buildSystemInfo(claim, loadItem(claim.getProductItemId()), null));
    }

    private WarrantyClaim findClaim(Integer id) {
        return claimRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("WarrantyClaim", "id", id));
    }

    private CatalogClientDto.ProductItemResponse loadItem(Integer productItemId) {
        if (productItemId == null) return null;
        try {
            return catalogClient.findItemById(productItemId);
        } catch (Exception e) {
            return null;
        }
    }

    private WarrantyDto.SystemVerificationInfo buildSystemInfo(
            WarrantyClaim claim,
            CatalogClientDto.ProductItemResponse item,
            CatalogClientDto.VariantResponse variant) {
        if (item == null && claim.getProductItemId() != null) {
            item = loadItem(claim.getProductItemId());
        }
        if (variant == null && item != null) {
            try {
                variant = catalogClient.getVariantById(item.getVariantId());
            } catch (Exception ignored) {
            }
        }

        String systemImei = item != null ? firstNonBlank(item.getImei(), item.getSerialNumber()) : null;
        String submitted = claim.getImei();
        boolean imeiMatch = systemImei != null && submitted != null
                && normalizeCode(systemImei).equals(normalizeCode(submitted));

        LocalDate warrantyEnd = null;
        boolean warrantyValid = false;
        if (item != null && item.getWarrantyStartDate() != null) {
            int months = item.getWarrantyMonths() != null ? item.getWarrantyMonths() : 12;
            warrantyEnd = item.getWarrantyStartDate().plusMonths(months);
            warrantyValid = !LocalDate.now().isAfter(warrantyEnd);
        }

        LocalDate purchaseDate = null;
        if (claim.getOrderId() != null) {
            purchaseDate = orderRepository.findById(claim.getOrderId())
                    .map(Order::getOrderDate)
                    .map(LocalDateTime::toLocalDate)
                    .orElse(null);
        }
        if (purchaseDate == null && item != null) {
            purchaseDate = item.getWarrantyStartDate();
        }

        UserDto.Response user = null;
        try {
            user = userClient.getUserById(claim.getUserId());
        } catch (Exception ignored) {
        }

        return WarrantyDto.SystemVerificationInfo.builder()
                .productItemId(claim.getProductItemId())
                .systemImei(systemImei)
                .systemSerial(item != null ? item.getSerialNumber() : null)
                .productName(claim.getProductName())
                .variantName(variant != null ? variant.getVariantName() : null)
                .purchaseDate(purchaseDate)
                .warrantyStartDate(item != null ? item.getWarrantyStartDate() : null)
                .warrantyEndDate(warrantyEnd)
                .warrantyValid(warrantyValid)
                .imeiMatch(imeiMatch)
                .imeiMatchMessage(imeiMatch ? "IMEI khớp hệ thống" : "IMEI khách nhập không khớp dữ liệu kho xuất")
                .userId(claim.getUserId())
                .customerName(user != null ? (user.getName() != null ? user.getName() : user.getUsername()) : claim.getContactName())
                .customerEmail(user != null ? user.getEmail() : claim.getContactEmail())
                .customerPhone(user != null ? user.getPhone() : claim.getContactPhone())
                .build();
    }

    private WarrantyDto.Response buildWarrantyCheck(
            CatalogClientDto.ProductItemResponse item,
            CatalogClientDto.VariantResponse variant) {
        LocalDate endDate = null;
        boolean isValid = false;
        if (item.getWarrantyStartDate() != null) {
            int months = item.getWarrantyMonths() != null ? item.getWarrantyMonths() : 12;
            endDate = item.getWarrantyStartDate().plusMonths(months);
            isValid = !LocalDate.now().isAfter(endDate);
        }
        return WarrantyDto.Response.builder()
                .isValid(isValid)
                .warrantyEndDate(endDate)
                .build();
    }

    private WarrantyDto.ClaimSummaryResponse mapToSummary(WarrantyClaim c) {
        return WarrantyDto.ClaimSummaryResponse.builder()
                .id(c.getId())
                .claimNumber(c.getClaimNumber())
                .contactName(c.getContactName())
                .productName(c.getProductName())
                .status(c.getStatus().name())
                .statusDisplay(statusDisplay(c.getStatus()))
                .priority(c.getPriority().name())
                .createdAt(c.getCreatedAt())
                .isUnderWarranty(c.getIsUnderWarranty())
                .returnCarrier(c.getReturnCarrier())
                .returnTrackingCode(c.getReturnTrackingCode())
                .returnInstruction(buildReturnInstruction(c))
                .build();
    }

    private WarrantyDto.ClaimDetailResponse mapToDetail(WarrantyClaim c, WarrantyDto.SystemVerificationInfo info) {
        return WarrantyDto.ClaimDetailResponse.builder()
                .id(c.getId())
                .claimNumber(c.getClaimNumber())
                .userId(c.getUserId())
                .orderId(c.getOrderId())
                .productName(c.getProductName())
                .submittedImei(c.getImei())
                .issueType(c.getIssueType().name())
                .issueDescription(c.getIssueDescription())
                .customerRequest(c.getCustomerRequest().name())
                .status(c.getStatus().name())
                .statusDisplay(statusDisplay(c.getStatus()))
                .priority(c.getPriority().name())
                .contactName(c.getContactName())
                .contactPhone(c.getContactPhone())
                .contactEmail(c.getContactEmail())
                .contactAddress(c.getContactAddress())
                .contactProvince(c.getContactProvince())
                .contactDistrict(c.getContactDistrict())
                .contactWard(c.getContactWard())
                .pickupToDistrictId(c.getPickupToDistrictId())
                .pickupToWardCode(c.getPickupToWardCode())
                .imageUrl1(c.getImageUrl1())
                .imageUrl2(c.getImageUrl2())
                .imageUrl3(c.getImageUrl3())
                .videoUrl(c.getVideoUrl())
                .inspectionResult(c.getInspectionResult())
                .staffNotes(c.getStaffNotes())
                .finalResolution(c.getFinalResolution() != null ? c.getFinalResolution().name() : null)
                .finalResolutionDisplay(resolutionDisplay(c.getFinalResolution()))
                .isUnderWarranty(c.getIsUnderWarranty())
                .repairCost(c.getRepairCost())
                .receivedDate(c.getReceivedDate())
                .inspectionDate(c.getInspectionDate())
                .completedDate(c.getCompletedDate())
                .createdAt(c.getCreatedAt())
                .systemInfo(info)
                .returnCarrier(c.getReturnCarrier())
                .returnTrackingCode(c.getReturnTrackingCode())
                .returnInstruction(buildReturnInstruction(c))
                .build();
    }

    private String buildReturnInstruction(WarrantyClaim c) {
        if (c.getStatus() != WarrantyClaim.ClaimStatus.APPROVED
                && c.getStatus() != WarrantyClaim.ClaimStatus.RECEIVED
                && c.getStatus() != WarrantyClaim.ClaimStatus.INSPECTING
                && c.getStatus() != WarrantyClaim.ClaimStatus.REPAIRING) {
            return null;
        }
        String tracking = c.getReturnTrackingCode() != null ? c.getReturnTrackingCode() : "—";
        String carrier = c.getReturnCarrier() != null ? c.getReturnCarrier() : "đơn vị VC";
        if (isGhnCarrier(c.getReturnCarrier())) {
            return "Đóng gói máy lỗi, dán ghi chú ticket #" + c.getClaimNumber()
                    + ". GHN sẽ liên hệ lấy hàng tại địa chỉ của bạn. Mã vận đơn: " + tracking
                    + ". Khi shipper giao tới kho, nhân viên tra mã này hoặc #" + c.getClaimNumber() + " để nhận máy.";
        }
        return "Gửi máy lỗi về kho qua " + carrier + ". Mã vận đơn / mã tra cứu: " + tracking
                + " (hoặc ticket #" + c.getClaimNumber() + ").";
    }

    private java.util.Optional<String> tryCreateGhnReturnOrder(WarrantyClaim claim) {
        return resolvePickupAddress(claim).flatMap(addr -> {
            try {
                GHNDto.CreateOrderResponse ghn = ghnService.createWarrantyReturnOrder(
                        claim.getClaimNumber(),
                        addr.name(),
                        addr.phone(),
                        addr.address(),
                        addr.wardName(),
                        addr.districtName(),
                        addr.provinceName(),
                        addr.districtId(),
                        addr.wardCode(),
                        claim.getProductName());
                return java.util.Optional.of(ghn.getOrderCode());
            } catch (Exception e) {
                log.warn("GHN warranty return failed for {}: {}", claim.getClaimNumber(), e.getMessage());
                return java.util.Optional.empty();
            }
        });
    }

    private record PickupAddress(
            String name,
            String phone,
            String address,
            int districtId,
            String wardCode,
            String wardName,
            String districtName,
            String provinceName) {}

    private java.util.Optional<PickupAddress> resolvePickupAddress(WarrantyClaim claim) {
        if (claim.getPickupToDistrictId() != null
                && claim.getPickupToWardCode() != null
                && !claim.getPickupToWardCode().isBlank()) {
            return java.util.Optional.of(new PickupAddress(
                    claim.getContactName(),
                    claim.getContactPhone(),
                    buildPickupStreetAddress(claim),
                    claim.getPickupToDistrictId(),
                    claim.getPickupToWardCode(),
                    claim.getContactWard() != null ? claim.getContactWard() : "",
                    claim.getContactDistrict() != null ? claim.getContactDistrict() : "",
                    claim.getContactProvince() != null ? claim.getContactProvince() : ""));
        }
        if (claim.getOrderId() != null) {
            return orderRepository.findById(claim.getOrderId())
                    .filter(o -> o.getToDistrictId() != null && o.getToWardCode() != null && !o.getToWardCode().isBlank())
                    .map(o -> new PickupAddress(
                            firstNonBlank(claim.getContactName(), o.getShippingName()),
                            firstNonBlank(claim.getContactPhone(), o.getShippingPhone()),
                            firstNonBlank(buildPickupStreetAddress(claim), o.getShippingAddress()),
                            o.getToDistrictId(),
                            o.getToWardCode(),
                            o.getShippingWard() != null ? o.getShippingWard() : "",
                            o.getShippingDistrict() != null ? o.getShippingDistrict() : "",
                            o.getShippingProvince() != null ? o.getShippingProvince() : ""));
        }
        return java.util.Optional.empty();
    }

    private static String buildPickupStreetAddress(WarrantyClaim claim) {
        String street = claim.getContactAddress() != null ? claim.getContactAddress().trim() : "";
        if (!street.isEmpty()) {
            return street;
        }
        return joinAddressParts(claim.getContactWard(), claim.getContactDistrict(), claim.getContactProvince());
    }

    private static String joinAddressParts(String ward, String district, String province) {
        StringBuilder sb = new StringBuilder();
        appendPart(sb, ward);
        appendPart(sb, district);
        appendPart(sb, province);
        return sb.toString();
    }

    private static void appendPart(StringBuilder sb, String part) {
        if (part == null || part.isBlank()) {
            return;
        }
        if (!sb.isEmpty()) {
            sb.append(", ");
        }
        sb.append(part.trim());
    }

    private void cancelGhnReturnIfAny(WarrantyClaim claim) {
        if (!isGhnCarrier(claim.getReturnCarrier())) {
            return;
        }
        String code = claim.getReturnTrackingCode();
        if (code == null || code.isBlank() || code.startsWith("GHTK-")) {
            return;
        }
        try {
            ghnService.cancelShippingOrder(java.util.List.of(code.trim()));
        } catch (Exception e) {
            log.warn("Could not cancel GHN return {}: {}", code, e.getMessage());
        }
    }

    private static boolean isGhnCarrier(String carrier) {
        if (carrier == null) {
            return false;
        }
        String c = carrier.trim().toLowerCase();
        return c.equals("ghn") || c.contains("giao hàng nhanh");
    }

    private String statusDisplay(WarrantyClaim.ClaimStatus status) {
        return switch (status) {
            case PENDING -> "Chờ xử lý";
            case RECEIVED -> "Đã nhận máy tại kho";
            case INSPECTING -> "Đang kiểm tra";
            case APPROVED -> "Đã duyệt thu hồi";
            case REJECTED -> "Từ chối";
            case REPAIRING -> "Đang sửa chữa";
            case COMPLETED -> "Hoàn tất";
            case RETURNED -> "Đã trả khách";
        };
    }

    private String resolutionDisplay(WarrantyClaim.FinalResolution r) {
        if (r == null) return null;
        return switch (r) {
            case REPLACE -> "Đổi sản phẩm mới";
            case REPAIR_RETURN -> "Sửa chữa và gửi trả";
            case REJECT -> "Từ chối bảo hành";
        };
    }

    private String generateClaimNumber() {
        String prefix = "BH-" + LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-";
        String max = claimRepository.findMaxClaimNumberWithPrefix(prefix);
        int seq = 1;
        if (max != null && max.length() > prefix.length()) {
            try {
                seq = Integer.parseInt(max.substring(prefix.length())) + 1;
            } catch (NumberFormatException ignored) {
            }
        }
        return prefix + String.format("%03d", seq);
    }

    private Integer currentStaffId() {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            UserDto.Response user = userClient.getUserByUsername(username);
            return user != null ? user.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private static String normalizeCode(String v) {
        return v == null ? "" : v.replaceAll("[\\s\\-#]+", "").toLowerCase();
    }

    private static String normalizeInboundKeyword(String keyword) {
        if (keyword == null) {
            return "";
        }
        return keyword.trim().replace("#", "");
    }

    private static boolean imeiCodesMatch(String systemImei, String typedImei) {
        return normalizeCode(systemImei).equals(normalizeCode(typedImei));
    }

    private static String formatImeiGrouped(String imei) {
        String n = imei == null ? "" : imei.replaceAll("[\\s\\-#]+", "").toUpperCase();
        if (n.isEmpty()) {
            return "—";
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n.length(); i += 4) {
            if (i > 0) {
                sb.append(" - ");
            }
            sb.append(n, i, Math.min(i + 4, n.length()));
        }
        return sb.toString();
    }

    private WarrantyDto.ClaimInboundView mapToInboundView(
            WarrantyClaim c, CatalogClientDto.ProductItemResponse item) {
        String systemImei = item != null ? firstNonBlank(item.getImei(), item.getSerialNumber()) : c.getImei();
        return WarrantyDto.ClaimInboundView.builder()
                .id(c.getId())
                .claimNumber(c.getClaimNumber())
                .productName(c.getProductName())
                .systemImei(systemImei)
                .systemImeiGrouped(formatImeiGrouped(systemImei))
                .returnCarrier(c.getReturnCarrier())
                .returnTrackingCode(c.getReturnTrackingCode())
                .contactName(c.getContactName())
                .status(c.getStatus().name())
                .statusDisplay(statusDisplay(c.getStatus()))
                .build();
    }

    private static WarrantyClaim.ReceivedBoxCondition parseBoxCondition(String v) {
        if (v == null || v.isBlank()) {
            throw new BadRequestException("Vui lòng chọn tình trạng hộp khi nhận.");
        }
        try {
            return WarrantyClaim.ReceivedBoxCondition.valueOf(v.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Tình trạng hộp không hợp lệ: " + v);
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a;
        return b;
    }

    private static WarrantyClaim.IssueType parseIssueType(String v) {
        if (v == null || v.isBlank()) return WarrantyClaim.IssueType.OTHER;
        try {
            return WarrantyClaim.IssueType.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException e) {
            return WarrantyClaim.IssueType.OTHER;
        }
    }

    private static WarrantyClaim.CustomerRequest parseCustomerRequest(String v) {
        if (v == null || v.isBlank()) return WarrantyClaim.CustomerRequest.REPAIR;
        try {
            return WarrantyClaim.CustomerRequest.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException e) {
            return WarrantyClaim.CustomerRequest.REPAIR;
        }
    }

    private static WarrantyClaim.ClaimStatus parseStatus(String v) {
        if (v == null || v.isBlank()) return null;
        try {
            return WarrantyClaim.ClaimStatus.valueOf(v.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static WarrantyClaim.FinalResolution parseResolution(String v) {
        try {
            return WarrantyClaim.FinalResolution.valueOf(v.toUpperCase().trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Phán quyết không hợp lệ. Chọn: REPLACE, REPAIR_RETURN, REJECT");
        }
    }
}
