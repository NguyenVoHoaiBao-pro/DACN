package com.electro.order.client;

import com.electro.order.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/api/internal/users/addresses/{addressId}")
    UserAddressDto getAddressById(@PathVariable("addressId") Integer addressId);

    @GetMapping("/api/internal/users/{userId}")
    UserDto.Response getUserById(@PathVariable("userId") Integer userId);

    @GetMapping("/api/internal/users/username/{username}")
    UserDto.Response getUserByUsername(@PathVariable("username") String username);
}
