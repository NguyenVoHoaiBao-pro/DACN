package com.electro.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class WarrantyDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private String productName;
        private String variantName;
        private String imageUrl;
        private String imei;
        private String serialNumber;
        private String status;
        private LocalDate warrantyStartDate;
        private LocalDate warrantyEndDate;
        private Integer warrantyMonths;
        private boolean isValid;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketRequest {
        private String imeiOrSerial;
        private String customerName;
        private String customerPhone;
        private String issueDescription;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketUpdateAdminRequest {
        private String status;
        private String technicianNote;
        private BigDecimal repairCost;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketResponse {
        private Integer id;
        private String ticketCode;
        private String imei;
        private String serialNumber;
        private String productName;
        private String variantName;
        private String customerName;
        private String customerPhone;
        private String issueDescription;
        private String technicianNote;
        private String status;
        private String statusDisplay;
        private BigDecimal repairCost;
        private LocalDateTime receivedAt;
        private LocalDateTime resolvedAt;
        private LocalDateTime returnedAt;
        private String createdBy;
    }
}
