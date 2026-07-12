package com.electro.order.controller;

import com.electro.order.service.OrderStatisticsService;
import com.electro.order.service.FinanceStatisticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders/internal/statistics")
@RequiredArgsConstructor
public class InternalStatisticsController {

    private final OrderStatisticsService orderStatisticsService;
    private final FinanceStatisticsService financeStatisticsService;

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

    @GetMapping("/top-products-by-product")
    public List<Map<String, Object>> topProductsByProduct(@RequestParam(defaultValue = "10") int limit) {
        return orderStatisticsService.getTopSellingProductsByProduct(limit);
    }

    @GetMapping("/sold-quantities")
    public Map<Integer, Long> soldQuantities(@RequestParam List<Integer> productIds) {
        return orderStatisticsService.getSoldQuantitiesByProductIds(productIds);
    }

    @GetMapping("/sold-products/count")
    public Map<String, Long> soldProductsCount() {
        return Map.of("count", orderStatisticsService.countSoldProducts());
    }

    @GetMapping("/orders/recent")
    public Map<String, Object> recentOrders(@RequestParam(defaultValue = "10") int limit) {
        return orderStatisticsService.getRecentOrders(limit);
    }

    @GetMapping("/payment-methods")
    public Map<String, Object> paymentMethods() {
        return orderStatisticsService.getPaymentMethodStats();
    }

    @GetMapping("/action-kpis")
    public Map<String, Object> actionKpis() {
        return orderStatisticsService.getActionKpis();
    }

    @GetMapping("/revenue/by-product")
    public List<Map<String, Object>> revenueByProduct(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return orderStatisticsService.getRevenueByProduct(startDate, endDate);
    }

    @GetMapping("/finance/summary")
    public Map<String, Object> financeSummary(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return financeStatisticsService.getFinanceSummary(startDate, endDate);
    }

    @GetMapping("/finance/ledger")
    public Map<String, Object> financeLedger(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return financeStatisticsService.getFinanceLedger(startDate, endDate, page, limit);
    }
}
