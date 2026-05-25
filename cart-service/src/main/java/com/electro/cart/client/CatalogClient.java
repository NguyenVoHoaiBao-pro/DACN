package com.electro.cart.client;

import com.electro.cart.dto.CartDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "catalog-service", path = "/api/internal/catalog")
public interface CatalogClient {

    @GetMapping("/variants/{variantId}/cart-info")
    CartDto.CartVariantDto getVariantForCart(@PathVariable("variantId") Integer variantId);
}
