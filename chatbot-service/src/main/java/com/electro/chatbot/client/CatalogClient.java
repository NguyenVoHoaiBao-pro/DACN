package com.electro.chatbot.client;

import com.electro.chatbot.dto.CustomPageResponse;
import com.electro.chatbot.dto.ProductResponseDto;
import com.electro.shared.dto.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "catalog-service", path = "/api/products")
public interface CatalogClient {

    @GetMapping
    ApiResponse<CustomPageResponse<ProductResponseDto>> getAllProducts(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    );

    @GetMapping("/{id}")
    ApiResponse<ProductResponseDto> getProductById(@PathVariable("id") Integer id);
}
