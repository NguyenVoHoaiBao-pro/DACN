package com.electro.chatbot.dto;

import lombok.Data;
import java.util.List;

@Data
public class ProductResponseDto {
    private Integer id;
    private String name;
    private Double price;
    private Integer quantity;
    private String detail;
    private Boolean isFeatured;
    private ProductTypeDto productType;
    private ProducerDto producer;
    private Double averageRating;
    private Integer reviewCount;
    private List<VariantDto> variants;

    @Data
    public static class ProductTypeDto {
        private Integer id;
        private String name;
        private String code;
    }

    @Data
    public static class ProducerDto {
        private Integer id;
        private String name;
        private String code;
    }

    @Data
    public static class VariantDto {
        private Integer id;
        private String skuCode;
        private String variantName;
        private Double price;
        private Integer stockQuantity;
    }
}
