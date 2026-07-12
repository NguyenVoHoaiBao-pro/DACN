package com.electro.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class ProductReturnDto {

    @Data
    @Builder
    public static class Summary {
        private Integer id;
        private String slipCode;
        private String status;
        private String statusLabel;
        private String serialNumber;
        private String orderCode;
        private String customerName;
        private String customerPhone;
        private String productName;
        private String skuCode;
        private String itemStatusBefore;
        private String conditionType;
        private Boolean isDefective;
        private String defectiveReason;
        private String defectiveReasonLabel;
        private LocalDateTime createdAt;
        private LocalDateTime processedAt;
    }

    @Data
    @Builder
    public static class Detail {
        private Integer id;
        private String slipCode;
        private String status;
        private String statusLabel;
        private String serialNumber;
        private Integer productItemId;
        private Integer variantId;
        private Integer orderId;
        private String orderCode;
        private String customerName;
        private String customerPhone;
        private String productName;
        private String skuCode;
        private String variantName;
        private String trackingCode;
        private String itemStatusBefore;
        private String conditionType;
        private Boolean isDefective;
        private String defectiveReason;
        private String defectiveReasonLabel;
        private String reason;
        private String warehouseNotes;
        private LocalDateTime createdAt;
        private LocalDateTime processedAt;
    }

    @Data
    @Builder
    public static class LookupResponse {
        private String serialNumber;
        private Integer productItemId;
        private Integer variantId;
        private String productName;
        private String skuCode;
        private String variantName;
        private String itemStatus;
        private String itemStatusLabel;
        private Integer orderId;
        private String orderCode;
        private String customerName;
        private String customerPhone;
        private String trackingCode;
        private Boolean hasPendingSlip;
        private Integer pendingSlipId;
        private Integer customerReturnRequestId;
        private String customerReturnRequestCode;
        private String customerReturnRequestStatus;
        private String customerReturnRequestStatusLabel;
        private String customerReturnReasonLabel;
    }

    @Data
    public static class OpenRequest {
        @NotBlank
        private String keyword;
        private Integer orderId;
        private String orderCode;
        private String customerName;
        private String customerPhone;
        private String trackingCode;
    }

    @Data
    public static class ProcessRequest {
        @NotNull
        private Boolean isDefective;
        private String defectiveReason;
        private String reason;
        private String warehouseNotes;
    }
}
