package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversionRateStatsDTO {
    private List<ProductRate> productRates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductRate {
        private Integer productId;
        private String productName;
        private Long viewCount;
        private Long purchaseCount;
        private Double conversionRate;
    }
}
