package com.electro.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales_kpi_config")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SalesKpiConfig {

    @Id
    private Integer id = 1;

    @Column(name = "monthly_revenue_target", nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyRevenueTarget = new BigDecimal("200000000");

    @Column(name = "commission_rate_organic", nullable = false, precision = 8, scale = 4)
    private BigDecimal commissionRateOrganic = BigDecimal.ZERO;

    @Column(name = "commission_rate_web", nullable = false, precision = 8, scale = 4)
    private BigDecimal commissionRateWeb = new BigDecimal("0.0050");

    @Column(name = "commission_rate_sales_assisted", nullable = false, precision = 8, scale = 4)
    private BigDecimal commissionRateSalesAssisted = new BigDecimal("0.0100");

    @Column(name = "commission_rate_sales_link", nullable = false, precision = 8, scale = 4)
    private BigDecimal commissionRateSalesLink = new BigDecimal("0.0050");

    @Column(name = "max_cancel_rate_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxCancelRatePercent = new BigDecimal("15.00");

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by_user_id")
    private Integer updatedByUserId;

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
