package com.electro.user.client;

import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.math.BigDecimal;

@FeignClient(name = "catalog-service", path = "/api/products/internal")
public interface CatalogClient {

    @GetMapping("/{productId}")
    ProductResponse getProductById(@PathVariable Integer productId);

    @GetMapping("/variants/{variantId}")
    VariantResponse getVariantById(@PathVariable Integer variantId);

    @Data
    class ProductResponse {
        private Integer id;
        private String name;
        private Boolean isActive;
    }

    @Data
    class VariantResponse {
        private Integer id;
        private String skuCode;
        private String variantName;
        private BigDecimal price;
        private String imageUrl;
        private ProductResponse product;
    }
}
