package com.electro.catalog.client;

import com.electro.catalog.dto.UserClientDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/api/internal/users/username/{username}")
    UserClientDto.Response getUserByUsername(@PathVariable("username") String username);
}
