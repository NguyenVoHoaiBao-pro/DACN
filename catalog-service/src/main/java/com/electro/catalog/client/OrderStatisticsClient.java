package com.electro.catalog.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@FeignClient(name = "order-service", contextId = "orderStatisticsClient", path = "/api/orders/internal/statistics")
public interface OrderStatisticsClient {

    @GetMapping("/top-products-by-product")
    List<Map<String, Object>> getTopProductsByProduct(@RequestParam("limit") int limit);

    @GetMapping("/sold-quantities")
    Map<String, Long> getSoldQuantities(@RequestParam("productIds") List<Integer> productIds);

    @GetMapping("/sold-products/count")
    Map<String, Long> getSoldProductsCount();
}
