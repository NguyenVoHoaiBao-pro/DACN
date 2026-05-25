package com.electro.order.client;

import com.electro.order.dto.CatalogClientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "catalog-service", path = "/api/products")
public interface CatalogClient {

    @GetMapping("/internal/{productId}")
    CatalogClientDto.ProductResponse getProductById(@PathVariable("productId") Integer productId);

    @GetMapping("/internal/variants/{variantId}")
    CatalogClientDto.VariantResponse getVariantById(@PathVariable("variantId") Integer variantId);

    @PutMapping("/internal/variants/{variantId}/stock")
    void updateStock(@PathVariable("variantId") Integer variantId, @RequestParam("delta") Integer delta);

    @GetMapping("/internal/items/by-code")
    CatalogClientDto.ProductItemResponse findItemByCode(@RequestParam("value") String value);

    @GetMapping("/internal/items/{id}")
    CatalogClientDto.ProductItemResponse findItemById(@PathVariable("id") Integer id);

    @PutMapping("/internal/items/{id}/reserve")
    CatalogClientDto.ProductItemResponse reserveItem(@PathVariable("id") Integer id);

    @PutMapping("/internal/items/{id}/release")
    void releaseItem(@PathVariable("id") Integer id);

    @PutMapping("/internal/items/activate-warranty")
    CatalogClientDto.ActivateWarrantyResponse activateWarranty(
            @RequestBody CatalogClientDto.ActivateWarrantyRequest request);

    @PutMapping("/internal/items/{id}/status")
    CatalogClientDto.ProductItemResponse updateItemStatus(
            @PathVariable("id") Integer id,
            @RequestParam("status") String status);
}
