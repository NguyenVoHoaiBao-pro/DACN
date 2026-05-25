package com.electro.review.dto;

import lombok.Data;

import java.math.BigDecimal;

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
}
