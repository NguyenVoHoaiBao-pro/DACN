package com.electro.order.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

public class CatalogClientDto {

    @Data
    public static class ProductResponse {
        private Integer id;
        private String name;
        private Boolean isActive;
        private Boolean requiresImei;
    }

    @Data
    public static class VariantResponse {
        private Integer id;
        private String skuCode;
        private String variantName;
        private BigDecimal price;
        private Integer stockQuantity;
        private Boolean isActive;
        private ProductResponse product;
        private String imageUrl;
    }

    @Data
    public static class ProductItemResponse {
        private Integer id;
        private Integer variantId;
        private String imei;
        private String serialNumber;
        private String status;
        private java.time.LocalDate warrantyStartDate;
        private Integer warrantyMonths;
    }

    @Data
    public static class ActivateWarrantyRequest {
        private List<Integer> itemIds;
    }

    @Data
    public static class ActivateWarrantyResponse {
        private int activatedCount;
    }
}
