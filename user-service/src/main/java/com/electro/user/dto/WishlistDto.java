package com.electro.user.dto;

import lombok.Data;

import java.time.LocalDateTime;

public class WishlistDto {

    @Data
    public static class Request {
        private Integer productId;
        private Integer variantId;
    }

    @Data
    public static class Response {
        private Integer id;
        private LocalDateTime createdAt;
        private ProductSummary product;
        private VariantSummary variant;
    }

    @Data
    public static class ProductSummary {
        private Integer id;
        private String name;
        private String imageUrl;
        private Double price;
    }

    @Data
    public static class VariantSummary {
        private Integer id;
        private String variantName;
        private String skuCode;
        private Double price;
        private String imageUrl;
    }
}
