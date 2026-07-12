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
public class CategoryRevenueChartDTO {
    private List<CategorySlice> categories;
    private BigDecimal totalRevenue;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySlice {
        private Integer categoryId;
        private String categoryName;
        private BigDecimal revenue;
        private Long quantitySold;
        private Double percentage;
    }
}
