package com.electro.statistics.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "order-service", path = "/api/orders/internal/statistics")
public interface OrderStatisticsClient {

    @GetMapping("/overview")
    Map<String, Object> getOverview();

    @GetMapping("/revenue/chart")
    Map<String, Object> getRevenueChart(
            @RequestParam(defaultValue = "month") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate);

    @GetMapping("/orders/by-status")
    Map<String, Object> getOrderStatusStats();

    @GetMapping("/top-products")
    List<Map<String, Object>> getTopProducts(@RequestParam(defaultValue = "10") int limit);

    @GetMapping("/orders/recent")
    Map<String, Object> getRecentOrders(@RequestParam(defaultValue = "10") int limit);

    @GetMapping("/payment-methods")
    Map<String, Object> getPaymentMethodStats();
}
