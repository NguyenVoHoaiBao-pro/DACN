package com.electro.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class CategoryDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Category name is required")
        private String name;

        private String code;
        private String description;
        private String iconUrl;
        private Integer parentId;
        private Integer displayOrder;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String name;
        private String code;
        private String description;
        private String iconUrl;
        private Integer parentId;
        private Integer displayOrder;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer id;
        private String name;
        private String code;
        private String description;
        private String iconUrl;
        private Boolean isActive;
        private Integer displayOrder;
        private Response parentCategory;
        private List<Response> subCategories;
        private Long productCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryWithProductsResponse {
        private Integer id;
        private String name;
        private String code;
        private String description;
        private String iconUrl;
        private List<ProductDto.Response> products;
    }
}
