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
public class TopProductStatsDTO {
    private String type;
    private List<ProductStat> products;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductStat {
        private Integer rank;
        private Integer productId;
        private String productName;
        private String variantName;
        private Long quantitySold;
        private BigDecimal revenue;
        private Integer currentStock;
        private Integer lowStockThreshold;
        private String status;
        private String categoryName;
        private String imageUrl;
    }
}
