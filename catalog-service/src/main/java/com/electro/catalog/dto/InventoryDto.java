package com.electro.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

public class InventoryDto {

    @Data
    public static class ImportStockItem {
        @NotNull
        private Integer variantId;
        @NotNull
        private Integer quantity;
    }

    @Data
    public static class ImportStockRequest {
        @NotEmpty
        @Valid
        private List<ImportStockItem> items;
        private String supplier;
        private String note;
    }

    @Data
    public static class ReturnStockRequest {
        @NotNull
        private String imei;
        private String reason;
        private Boolean isDefective;
    }

    @Data
    public static class ImeiRequest {
        @NotNull
        private Integer variantId;
        @NotEmpty
        private List<String> imeis;
        private String batchNumber;
        private String note;
    }

    @Data
    @lombok.Builder
    public static class InventoryResponse {
        private Integer id;
        private String transactionType;
        private Integer quantity;
        private String referenceType;
        private Integer referenceId;
        private String reason;
        private java.time.LocalDateTime createdAt;
        private Integer variantId;
        private Integer productItemId;
        private String imei;
        private Integer userId;
    }

    @Data
    @lombok.Builder
    public static class InventoryStat {
        private Integer variantId;
        private String skuCode;
        private String variantName;
        private Integer stockQuantity;
        private Integer lowStockThreshold;
        private boolean lowStock;
    }

    @Data
    public static class VariantAutocomplete {
        private Integer id;
        private String skuCode;
        private String variantName;
        private String productName;
    }

    @Data
    public static class SupplierRequest {
        @NotNull
        private String name;
        private String code;
        private String contactPerson;
        private String phone;
        private String email;
        private String address;
        private String taxCode;
        private Boolean isActive;
    }

    @Data
    public static class SupplierResponse {
        private Integer id;
        private String name;
        private String code;
        private String contactPerson;
        private String phone;
        private String email;
        private String address;
        private String taxCode;
        private Boolean isActive;
    }

    @Data
    public static class PurchaseOrderItemRequest {
        @NotNull
        private Integer variantId;
        @NotNull
        private Integer quantityOrdered;
        @NotNull
        private java.math.BigDecimal unitCost;
        private String notes;
    }

    @Data
    public static class PurchaseOrderRequest {
        @NotNull
        private Integer supplierId;
        @NotNull
        private Integer createdByUserId;
        @NotEmpty
        @Valid
        private List<PurchaseOrderItemRequest> items;
        private String notes;
        private java.time.LocalDate expectedDate;
    }
}
