package com.electro.cart.client;

import lombok.Data;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/api/internal/users/username/{username}")
    UserResponse getUserByUsername(@PathVariable String username);

    @Data
    class UserResponse {
        private Integer id;
        private String username;
        private String email;
        private String name;
    }
}
