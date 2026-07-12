package com.electro.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

public class InventoryAuditDto {

    @Data
    @Builder
    public static class Summary {
        private Integer id;
        private String auditCode;
        private String status;
        private String statusLabel;
        private Integer productTypeId;
        private String productTypeName;
        private Boolean stockLocked;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private LocalDateTime submittedAt;
        private Integer totalScanned;
        private Integer totalMatched;
        private Integer totalMissing;
        private Integer totalExtra;
    }

    @Data
    @Builder
    public static class VariantSummary {
        private Integer id;
        private Integer variantId;
        private String productName;
        private String skuCode;
        private String variantName;
        private Integer systemQty;
        private Integer actualQty;
        private Integer variance;
        private String matchStatus;
        private List<String> missingSerials;
    }

    @Data
    @Builder
    public static class Detail {
        private Integer id;
        private String auditCode;
        private String status;
        private String statusLabel;
        private Integer productTypeId;
        private String productTypeName;
        private Boolean stockLocked;
        private String notes;
        private String adminNote;
        private LocalDateTime startedAt;
        private LocalDateTime completedAt;
        private LocalDateTime submittedAt;
        private LocalDateTime approvedAt;
        private Integer totalScanned;
        private Integer totalMatched;
        private Integer totalMissing;
        private Integer totalExtra;
        private List<VariantSummary> variants;
        private List<LineDetail> lines;
        private List<LineDetail> discrepancies;
    }

    @Data
    @Builder
    public static class LineDetail {
        private Integer id;
        private String serialNumber;
        private String scanResult;
        private String systemStatus;
        private Integer variantId;
        private String skuCode;
        private String productName;
        private LocalDateTime scannedAt;
    }

    @Data
    public static class CreateRequest {
        @NotNull
        private Integer productTypeId;
        private String notes;
        private Integer createdByUserId;
    }

    @Data
    public static class ScanRequest {
        @NotBlank
        private String serialNumber;
    }

    @Data
    @Builder
    public static class ScanResponse {
        private String serialNumber;
        private String scanResult;
        private String message;
        private Integer totalScanned;
        private Integer actualQty;
        private String productName;
    }

    @Data
    public static class SubmitRequest {
        private String notes;
    }

    @Data
    public static class RejectRequest {
        private String adminNote;
    }

    @Data
    public static class BulkScanRequest {
        private List<String> serialNumbers;
    }

    @Data
    @Builder
    public static class BulkScanResponse {
        private Integer processed;
        private Integer matched;
        private Integer extra;
        private Integer duplicate;
        private Integer invalid;
        private Integer totalScanned;
        private List<VariantSummary> variants;
    }

    @Data
    @Builder
    public static class CountingProgress {
        private Integer id;
        private String auditCode;
        private String status;
        private Integer totalScanned;
        private List<VariantSummary> variants;
    }

    @Data
    @Builder
    public static class CompleteResponse {
        private Integer id;
        private String auditCode;
        private Integer totalMatched;
        private Integer totalMissing;
        private Integer totalExtra;
        private List<VariantSummary> variants;
        private List<LineDetail> discrepancies;
    }
}
