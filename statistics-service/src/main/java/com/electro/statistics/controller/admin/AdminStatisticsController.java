package com.electro.statistics.controller.admin;

import com.electro.statistics.dto.*;
import com.electro.statistics.service.StatisticsDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/statistics")
@RequiredArgsConstructor
public class AdminStatisticsController {

    private final StatisticsDashboardService statisticsService;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'ROLE_ADMIN')")
    public ResponseEntity<OverviewStatisticsDTO> getOverviewStatistics() {
        return ResponseEntity.ok(statisticsService.getOverviewStatistics());
    }

    @GetMapping("/revenue/chart")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'ROLE_ADMIN')")
    public ResponseEntity<RevenueChartDTO> getRevenueChart(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(statisticsService.getRevenueChart(period, startDate, endDate));
    }

    @GetMapping("/orders/by-status")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'REPORT_SALES', 'ROLE_ADMIN')")
    public ResponseEntity<OrderStatusStatsDTO> getOrderStatusStats() {
        return ResponseEntity.ok(statisticsService.getOrderStatusStats());
    }

    @GetMapping("/top-products")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'REPORT_SALES', 'ROLE_ADMIN')")
    public ResponseEntity<TopProductStatsDTO> getTopProductStats(
            @RequestParam(defaultValue = "best-selling") String type,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(statisticsService.getTopProductStats(type, limit));
    }

    @GetMapping("/orders/recent")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'REPORT_SALES', 'ROLE_ADMIN')")
    public ResponseEntity<RecentOrderDTO> getRecentOrders(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(statisticsService.getRecentOrders(limit));
    }

    @GetMapping("/payment-methods")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'ROLE_ADMIN')")
    public ResponseEntity<PaymentMethodStatsDTO> getPaymentMethodStats() {
        return ResponseEntity.ok(statisticsService.getPaymentMethodStats());
    }

    @GetMapping("/conversion-rate")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'ROLE_ADMIN')")
    public ResponseEntity<ConversionRateStatsDTO> getConversionRateStats() {
        return ResponseEntity.ok(statisticsService.getConversionRateStats());
    }

    @GetMapping("/customer-segments")
    @PreAuthorize("hasAnyAuthority('REPORT_REVENUE', 'ROLE_ADMIN')")
    public ResponseEntity<CustomerSegmentStatsDTO> getCustomerSegments() {
        return ResponseEntity.ok(statisticsService.getCustomerSegments());
    }

    @GetMapping("/revenue")
    @PreAuthorize("hasAuthority('REPORT_REVENUE')")
    public ResponseEntity<RevenueStatisticsDTO> getRevenueStatistics() {
        return ResponseEntity.ok(statisticsService.getRevenueStatistics());
    }

    @GetMapping("/top-products-legacy")
    @PreAuthorize("hasAuthority('REPORT_SALES')")
    public ResponseEntity<TopProductsStatisticsDTO> getTopProductsStatistics() {
        return ResponseEntity.ok(statisticsService.getTopProductsStatistics());
    }
}
