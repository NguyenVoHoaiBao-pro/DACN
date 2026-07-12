package com.electro.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class CustomerReturnRequestDto {

    @Data
    public static class CreateRequest {
        @NotBlank
        private String orderCode;
        @NotBlank
        private String serialNumber;
        @NotBlank
        private String reasonType;
        private String reasonDetail;
    }

    @Data
    public static class ShipRequest {
        private String returnTrackingCode;
    }

    @Data
    public static class ReviewRequest {
        private String salesResponseNote;
    }

    @Data
    public static class RejectRequest {
        @NotBlank
        private String rejectionReason;
        private String salesResponseNote;
    }

    @Data
    @Builder
    public static class Summary {
        private Integer id;
        private String requestCode;
        private String status;
        private String statusLabel;
        private String orderCode;
        private String serialNumber;
        private String productName;
        private String reasonType;
        private String reasonTypeLabel;
        private String reasonDetail;
        private LocalDateTime createdAt;
        private LocalDateTime reviewedAt;
        private LocalDateTime shipDeadline;
        private LocalDateTime customerShippedAt;
        private String customerReturnTracking;
        private String salesResponseNote;
        private String rejectionReason;
        private String returnSlipCode;
        private Integer daysLeftToShip;
    }

    @Data
    @Builder
    public static class Detail {
        private Integer id;
        private String requestCode;
        private String status;
        private String statusLabel;
        private Integer userId;
        private Integer orderId;
        private String orderCode;
        private String orderStatus;
        private Integer orderItemId;
        private Integer orderDetailId;
        private Integer productItemId;
        private String serialNumber;
        private String productName;
        private String skuCode;
        private String variantName;
        private String reasonType;
        private String reasonTypeLabel;
        private String reasonDetail;
        private String customerName;
        private String customerPhone;
        private Integer reviewedByUserId;
        private String reviewedByUsername;
        private LocalDateTime reviewedAt;
        private String salesResponseNote;
        private String rejectionReason;
        private LocalDateTime shipDeadline;
        private LocalDateTime customerShippedAt;
        private String customerReturnTracking;
        private Integer returnSlipId;
        private String returnSlipCode;
        private LocalDateTime createdAt;
        private Integer daysLeftToShip;
        private Boolean canCustomerShip;
        private Boolean canCustomerCancel;
        private Boolean canSalesReview;
    }

    @Data
    @Builder
    public static class WarehouseLinkRequest {
        @NotNull
        private Integer returnRequestId;
        @NotNull
        private Integer returnSlipId;
        @NotBlank
        private String returnSlipCode;
    }

    @Data
    @Builder
    public static class WarehouseLookupResponse {
        private Integer returnRequestId;
        private String requestCode;
        private String status;
        private String statusLabel;
        private String orderCode;
        private String serialNumber;
        private String productName;
        private String reasonTypeLabel;
        private String reasonDetail;
        private LocalDateTime shipDeadline;
        private Integer daysLeftToShip;
    }
}
