package com.electro.review.client;

import com.electro.review.dto.UserClientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/api/internal/users/username/{username}")
    UserClientDto.UserResponse getUserByUsername(@PathVariable("username") String username);

    @GetMapping("/api/internal/users/{userId}")
    UserClientDto.UserResponse getUserById(@PathVariable("userId") Integer userId);
}
