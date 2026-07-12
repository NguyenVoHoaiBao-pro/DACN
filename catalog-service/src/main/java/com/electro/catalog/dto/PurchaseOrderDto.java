package com.electro.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PurchaseOrderDto {

    @Data
    @Builder
    public static class ListItem {
        private Integer id;
        private String poNumber;
        private String supplierName;
        private LocalDate expectedDate;
        private String status;
        private String statusLabel;
        private Integer totalItemsOrdered;
        private Integer totalQuantityOrdered;
        private LocalDateTime receivedDate;
    }

    @Data
    @Builder
    public static class ItemDetail {
        private Integer id;
        private Integer variantId;
        private String skuCode;
        private String productName;
        private String variantName;
        private Integer quantityOrdered;
        private Integer quantityReceived;
        private Integer quantityDamaged;
        private Integer quantityImeiScanned;
        /** Số lượng cần quét IMEI = thực nhận − lỗi/hỏng */
        private Integer quantityImeiRequired;
        private Integer quantityImeiRemaining;
        private String notes;
    }

    @Data
    @Builder
    public static class Detail {
        private Integer id;
        private String poNumber;
        private Integer supplierId;
        private String supplierName;
        private LocalDate expectedDate;
        private String status;
        private String statusLabel;
        private String notes;
        private List<ItemDetail> items;
        private List<StockLotSummary> stockLots;
    }

    @Data
    public static class ReceiveItemCount {
        @NotNull
        private Integer itemId;
        @NotNull
        @Min(0)
        private Integer quantityReceived;
        @NotNull
        @Min(0)
        private Integer quantityDamaged;
    }

    @Data
    public static class ConfirmReceiveRequest {
        @NotEmpty
        @Valid
        private List<ReceiveItemCount> items;
        private String discrepancyReason;
        private String discrepancyEvidence;
        private Integer receivedByUserId;
    }

    @Data
    @Builder
    public static class ConfirmReceiveResponse {
        private Integer id;
        private String poNumber;
        private String status;
        private String statusLabel;
        private boolean hasDiscrepancy;
        private String message;
        private Integer totalGoodReceived;
        private Integer totalDamaged;
        private Integer totalShortage;
        private Integer totalSurplus;
        private Integer stockLotId;
        private String lotNumber;
        private Integer receiveWave;
    }

    @Data
    @Builder
    public static class StockLotSummary {
        private Integer id;
        private String lotNumber;
        private Integer receiveWave;
        private String status;
        private LocalDateTime receivedAt;
        private Integer itemsScanned;
        private Integer itemsRequired;
        @lombok.Setter
        private java.util.List<String> serialNumbers;
    }

    @Data
    public static class ApproveRequest {
        private Integer approvedByUserId;
        private String notes;
    }

    @Data
    public static class RejectRequest {
        private String reason;
    }

    @Data
    @Builder
    public static class DiscrepancyPreview {
        private boolean exactMatch;
        private boolean hasDiscrepancy;
        private Integer totalOrdered;
        private Integer totalReceived;
        private Integer totalDamaged;
        private Integer shortage;
        private Integer surplus;
        private List<ItemDiscrepancy> items;
    }

    @Data
    @Builder
    public static class ItemDiscrepancy {
        private Integer itemId;
        private String productName;
        private Integer quantityOrdered;
        private Integer quantityReceived;
        private Integer quantityDamaged;
        private Integer shortage;
        private Integer surplus;
    }
}
