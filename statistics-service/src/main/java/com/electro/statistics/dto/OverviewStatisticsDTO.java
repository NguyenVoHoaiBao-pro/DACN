package com.electro.statistics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OverviewStatisticsDTO {
    private BigDecimal totalRevenue;
    private Long totalOrders;
    private Long totalCustomers;
    private Long totalProductsSold;
    private Long pendingOrders;
    private Double revenueGrowthPercent;
    private Double orderGrowthPercent;
    private Double customerGrowthPercent;
}
