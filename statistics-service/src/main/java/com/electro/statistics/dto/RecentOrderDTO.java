package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecentOrderDTO {
    private List<OrderSummary> recentOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderSummary {
        private Integer orderId;
        private String orderCode;
        private String customerName;
        private String customerEmail;
        private BigDecimal totalAmount;
        private String status;
        private String paymentMethod;
        private String paymentStatus;
        private String orderDate;
        private Integer itemCount;
    }
}
