package com.electro.order.client;

import com.electro.order.dto.CartDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "cart-service", path = "/api/carts")
public interface CartClient {

    @GetMapping("/internal/{userId}")
    CartDto.CartResponse getCartByUserId(@PathVariable("userId") Integer userId);

    @DeleteMapping("/internal/{userId}/clear")
    void clearCartByUserId(@PathVariable("userId") Integer userId);
}
