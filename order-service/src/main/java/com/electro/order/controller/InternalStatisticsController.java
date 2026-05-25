package com.electro.order.controller;

import com.electro.order.service.OrderStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/internal/statistics")
@RequiredArgsConstructor
public class InternalStatisticsController {

    private final OrderStatisticsService orderStatisticsService;

    @GetMapping("/overview")
    public Map<String, Object> overview() {
        return orderStatisticsService.getOverviewStatistics();
    }

    @GetMapping("/revenue/chart")
    public Map<String, Object> revenueChart(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return orderStatisticsService.getRevenueChart(period, startDate, endDate);
    }

    @GetMapping("/orders/by-status")
    public Map<String, Object> orderStatus() {
        return orderStatisticsService.getOrderStatusStats();
    }

    @GetMapping("/top-products")
    public List<Map<String, Object>> topProducts(@RequestParam(defaultValue = "10") int limit) {
        return orderStatisticsService.getTopSellingProducts(limit);
    }

    @GetMapping("/orders/recent")
    public Map<String, Object> recentOrders(@RequestParam(defaultValue = "10") int limit) {
        return orderStatisticsService.getRecentOrders(limit);
    }

    @GetMapping("/payment-methods")
    public Map<String, Object> paymentMethods() {
        return orderStatisticsService.getPaymentMethodStats();
    }
}
