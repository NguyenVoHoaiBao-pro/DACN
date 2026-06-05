package com.electro.catalog.dto;

import com.electro.catalog.entity.ProductItemStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class SalesConsultationDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LookupResponse {
        /** IMEI | SKU | NAME */
        private String matchType;
        private String keyword;
        private ProductDto.AdminProductResponse product;
        private ProductDto.VariantDto matchedVariant;
        private MatchedItem matchedItem;
        private List<ProductSummary> products;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductSummary {
        private Integer id;
        private String name;
        private String imageUrl;
        private Double basePrice;
        private Integer totalAvailableQuantity;
        private String warrantyPolicy;
        private String matchedSku;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchedItem {
        private Integer id;
        private String imei;
        private String serialNumber;
        private ProductItemStatus status;
        private Integer warrantyMonths;
        private String statusLabel;
    }
}
