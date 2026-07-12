package com.electro.auth.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

@FeignClient(name = "user-service")
public interface UserClient {

    @PostMapping("/api/internal/users/login")
    Map<String, Object> verifyLogin(@RequestBody Map<String, String> loginRequest);

    @PostMapping("/api/internal/users/register")
    Map<String, Object> register(@RequestBody Map<String, Object> registerRequest);

    @PostMapping("/api/internal/users/google-login")
    Map<String, Object> googleLogin(@RequestBody Map<String, String> request);

    @GetMapping("/api/internal/users/details")
    Map<String, Object> getUserDetails(@RequestParam("username") String username);

    @PostMapping("/api/internal/users/forgot-password")
    Map<String, Object> forgotPassword(@RequestBody Map<String, String> request);

    @PostMapping("/api/internal/users/reset-password")
    Map<String, Object> resetPassword(@RequestBody Map<String, Object> request);

    @PostMapping("/api/internal/users/qr/generate")
    Map<String, Object> generateQrToken();

    @GetMapping("/api/internal/users/qr/status/{token}")
    Map<String, Object> getQrStatus(@PathVariable("token") String token);

    @PostMapping("/api/internal/users/qr/verify")
    Map<String, Object> verifyQrToken(@RequestParam("token") String token, @RequestParam("userId") Integer userId);
}
