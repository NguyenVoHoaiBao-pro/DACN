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
public class PaymentMethodStatsDTO {
    private List<PaymentStat> paymentStats;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentStat {
        private String method;
        private String label;
        private Long orderCount;
        private BigDecimal totalAmount;
        private Double percentage;
        private String color;
    }
}
