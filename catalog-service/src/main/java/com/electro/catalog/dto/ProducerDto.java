package com.electro.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class ProducerDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        @NotBlank(message = "Tên nhà sản xuất không được để trống")
        private String name;

        @NotBlank(message = "Mã nhà sản xuất không được để trống")
        private String code;

        private String logoUrl;
        private String description;
        private String country;
        private String website;
        private Boolean isActive = true;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer id;
        private String name;
        private String code;
        private String logoUrl;
        private String description;
        private String country;
        private String website;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlimResponse {
        private Integer id;
        private String name;
        private String code;
    }
}
