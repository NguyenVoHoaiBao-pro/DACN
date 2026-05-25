package com.electro.review.client;

import com.electro.review.dto.CatalogClientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "catalog-service", path = "/api/products/internal")
public interface CatalogClient {

    @GetMapping("/{productId}")
    CatalogClientDto.ProductResponse getProductById(@PathVariable("productId") Integer productId);

    @GetMapping("/variants/{variantId}")
    CatalogClientDto.VariantResponse getVariantById(@PathVariable("variantId") Integer variantId);
}
