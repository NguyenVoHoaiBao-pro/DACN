package com.electro.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class WarrantyDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private String productName;
        private String variantName;
        private String imageUrl;
        private String imei;
        private String serialNumber;
        private String status;
        private LocalDate warrantyStartDate;
        private LocalDate warrantyEndDate;
        private Integer warrantyMonths;
        private boolean isValid;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketRequest {
        private String imeiOrSerial;
        private String customerName;
        private String customerPhone;
        private String issueDescription;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketUpdateAdminRequest {
        private String status;
        private String technicianNote;
        private BigDecimal repairCost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketResponse {
        private Integer id;
        private String ticketCode;
        private String imei;
        private String serialNumber;
        private String productName;
        private String variantName;
        private String customerName;
        private String customerPhone;
        private String issueDescription;
        private String technicianNote;
        private String status;
        private String statusDisplay;
        private BigDecimal repairCost;
        private LocalDateTime receivedAt;
        private LocalDateTime resolvedAt;
        private LocalDateTime returnedAt;
        private String createdBy;
    }

    // ═══ Warranty claims (online — Sales workflow) ═══════════════════════════

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimSubmitRequest {
        @NotBlank
        private String submittedImei;
        private Integer orderId;
        private Integer orderDetailId;
        @NotBlank
        private String issueDescription;
        private String issueType;
        private String customerRequest;
        @NotBlank
        private String contactName;
        @NotBlank
        private String contactPhone;
        private String contactEmail;
        @NotBlank
        private String contactAddress;
        @NotBlank
        private String contactProvince;
        @NotBlank
        private String contactDistrict;
        @NotBlank
        private String contactWard;
        @NotNull
        private Integer pickupToDistrictId;
        @NotBlank
        private String pickupToWardCode;
        private String imageUrl1;
        private String imageUrl2;
        private String imageUrl3;
        private String videoUrl;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemVerificationInfo {
        private Integer productItemId;
        private String systemImei;
        private String systemSerial;
        private String productName;
        private String variantName;
        private LocalDate purchaseDate;
        private LocalDate warrantyStartDate;
        private LocalDate warrantyEndDate;
        private boolean warrantyValid;
        private boolean imeiMatch;
        private String imeiMatchMessage;
        private Integer userId;
        private String customerName;
        private String customerEmail;
        private String customerPhone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimSummaryResponse {
        private Integer id;
        private String claimNumber;
        private String contactName;
        private String productName;
        private String status;
        private String statusDisplay;
        private String priority;
        private LocalDateTime createdAt;
        private Boolean isUnderWarranty;
        private String returnCarrier;
        private String returnTrackingCode;
        private String ghnReturnShippingStatus;
        private String ghnReturnShippingStatusDisplay;
        private LocalDateTime ghnReturnStatusUpdatedAt;
        /** Hướng dẫn gửi/trả máy sau khi duyệt thu hồi */
        private String returnInstruction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimDetailResponse {
        private Integer id;
        private String claimNumber;
        private Integer userId;
        private Integer orderId;
        private String productName;
        private String submittedImei;
        private String issueType;
        private String issueDescription;
        private String customerRequest;
        private String status;
        private String statusDisplay;
        private String priority;
        private String contactName;
        private String contactPhone;
        private String contactEmail;
        private String contactAddress;
        private String contactProvince;
        private String contactDistrict;
        private String contactWard;
        private Integer pickupToDistrictId;
        private String pickupToWardCode;
        private String imageUrl1;
        private String imageUrl2;
        private String imageUrl3;
        private String videoUrl;
        private String inspectionResult;
        private String staffNotes;
        private String finalResolution;
        private String finalResolutionDisplay;
        private Boolean isUnderWarranty;
        private BigDecimal repairCost;
        private LocalDateTime receivedDate;
        private LocalDateTime inspectionDate;
        private LocalDateTime completedDate;
        private LocalDateTime createdAt;
        private SystemVerificationInfo systemInfo;
        private String replacementOrderCode;
        private String returnCarrier;
        private String returnTrackingCode;
        private String ghnReturnShippingStatus;
        private String ghnReturnShippingStatusDisplay;
        private LocalDateTime ghnReturnStatusUpdatedAt;
        private String returnInstruction;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimVerifyRequest {
        private String staffNotes;
        /** Đơn vị vận chuyển thu hồi (GHTK, GHN, Viettel Post...) */
        private String returnCarrier;
        /** Mã vận đơn thu hồi — để Kho/Sales tra cứu khi shipper giao hàng */
        private String returnTrackingCode;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimRejectRequest {
        @NotBlank
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimInspectionRequest {
        @NotBlank
        private String inspectionResult;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimResolveRequest {
        @NotBlank
        private String resolution;
        private String staffNotes;
    }

    /** Màn hình Kho — tra cứu ticket APPROVED chờ nhận máy */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimInboundView {
        private Integer id;
        private String claimNumber;
        private String productName;
        private String systemImei;
        private String systemImeiGrouped;
        private String returnCarrier;
        private String returnTrackingCode;
        private String ghnReturnShippingStatus;
        private String ghnReturnShippingStatusDisplay;
        private LocalDateTime ghnReturnStatusUpdatedAt;
        private String contactName;
        private String status;
        private String statusDisplay;
    }

    /** Màn hình Kho — xác nhận nhận máy (nhập tay) */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClaimInboundReceiveRequest {
        @NotBlank
        private String receivedImei;
        @NotBlank
        private String boxCondition;
        private String warehouseNotes;
    }
}
