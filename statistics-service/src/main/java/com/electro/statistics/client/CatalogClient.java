package com.electro.statistics.client;

import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "catalog-service", path = "/api/products/internal")
public interface CatalogClient {

    @GetMapping("/{productId}")
    ProductResponse getProductById(@PathVariable Integer productId);

    @GetMapping("/low-stock")
    List<LowStockVariant> getLowStockVariants();

    @Data
    class ProductResponse {
        private Integer id;
        private String name;
    }

    @Data
    class LowStockVariant {
        private Integer productId;
        private String productName;
        private Integer variantId;
        private String variantName;
        private Integer stockQuantity;
        private Integer lowStockThreshold;
    }
}
