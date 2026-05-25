package com.electro.catalog.dto;

import com.electro.catalog.entity.ProductItemStatus;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class ProductItemDto {

    @Data
    public static class Response {
        private Integer id;
        private Integer variantId;
        private String imei;
        private String serialNumber;
        private ProductItemStatus status;
        private LocalDateTime reservedAt;
        private LocalDateTime soldAt;
        private LocalDate warrantyStartDate;
        private Integer warrantyMonths;
    }

    @Data
    public static class ActivateWarrantyRequest {
        private java.util.List<Integer> itemIds;
    }

    @Data
    public static class ActivateWarrantyResponse {
        private int activatedCount;
    }
}
