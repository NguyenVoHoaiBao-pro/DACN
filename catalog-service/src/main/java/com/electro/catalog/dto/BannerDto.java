package com.electro.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

public class BannerDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        @NotBlank
        private String title;
        private String subtitle;
        private String image;
        private String position;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private String link;
        private Integer priority;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer id;
        private String title;
        private String subtitle;
        private String image;
        private String position;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private String link;
        private Integer priority;
        private Long clickCount;
    }
}
