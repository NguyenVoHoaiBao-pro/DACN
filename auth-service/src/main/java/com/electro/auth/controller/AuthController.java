package com.electro.auth.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.electro.auth.client.UserClient;
import com.electro.auth.service.RefreshTokenService;
import com.electro.auth.service.RefreshTokenService.TokenPayload;
import com.electro.auth.util.JwtTokenProvider;
import com.electro.shared.dto.ApiResponse;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
     
    @Autowired
    private UserClient userClient;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private RefreshTokenService refreshTokenService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@RequestBody Map<String, String> loginRequest) {
        try {
            // Dòng 36: Dùng FeignClient gọi xuyên qua User Service
            Map<String, Object> verifyResponse = userClient.verifyLogin(loginRequest);
            // Nếu User Service chửi (báo sai mật khẩu) thì đá văng ra!
            if (verifyResponse != null && Boolean.TRUE.equals(verifyResponse.get("success"))) {
                return ResponseEntity.ok(ApiResponse.success(buildAuthData(verifyResponse)));
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "Invalid username or password"));
        } catch (DataAccessException e) {
            return redisUnavailable("Login failed: Redis unavailable for refresh token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Map<String, Object>>> register(@RequestBody Map<String, String> registerRequest) {
        String username = registerRequest.get("username");
        String email = registerRequest.get("email");
        String password = registerRequest.get("password");

        if (!StringUtils.hasText(username) || !StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "username, email and password are required"));
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("username", username.trim());
            payload.put("email", email.trim());
            payload.put("password", password);
            String name = registerRequest.get("name");
            payload.put("name", StringUtils.hasText(name) ? name.trim() : username.trim());
            if (StringUtils.hasText(registerRequest.get("phone"))) {
                payload.put("phone", registerRequest.get("phone").trim());
            }
            payload.put("roleId", 4);

            Map<String, Object> registerResponse = userClient.register(payload);
            if (registerResponse != null && Boolean.TRUE.equals(registerResponse.get("success"))) {
                return ResponseEntity.status(HttpStatus.CREATED)
                        .body(ApiResponse.success("Registration successful", buildAuthData(registerResponse)));
            }

            String message = registerResponse != null && registerResponse.get("message") != null
                    ? registerResponse.get("message").toString()
                    : "Registration failed";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, message));
        } catch (DataAccessException e) {
            return redisUnavailable("Registration failed: Redis unavailable for refresh token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<Map<String, Object>>> refresh(@RequestBody Map<String, String> refreshRequest) {
        String refreshToken = refreshRequest != null ? refreshRequest.get("refreshToken") : null;
        if (!StringUtils.hasText(refreshToken)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "refreshToken is required"));
        }

        try {
            Optional<TokenPayload> rotated = refreshTokenService.rotate(refreshToken.trim());
            if (rotated.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(ApiResponse.error(401, "Invalid or expired refresh token"));
            }

            TokenPayload payload = rotated.get();
            Map<String, Object> data = new HashMap<>();
            data.put("accessToken", jwtTokenProvider.generateTokenFromUsername(
                    payload.username(), payload.roles(), payload.permissions()));
            data.put("refreshToken", payload.refreshToken());
            data.put("tokenType", "Bearer");
            data.put("username", payload.username());

            return ResponseEntity.ok(ApiResponse.success(data));
        } catch (DataAccessException e) {
            return redisUnavailable("Refresh failed: Redis unavailable");
        }
    }

    @PostMapping("/google")
    public ResponseEntity<ApiResponse<Map<String, Object>>> googleLogin(@RequestBody Map<String, String> body) {
        String idToken = body != null ? body.get("idToken") : null;
        if (!StringUtils.hasText(idToken)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "idToken is required"));
        }
        try {
            Map<String, String> payload = Map.of("idToken", idToken.trim());
            Map<String, Object> googleResponse = userClient.googleLogin(payload);
            if (googleResponse != null && Boolean.TRUE.equals(googleResponse.get("success"))) {
                return ResponseEntity.ok(ApiResponse.success(buildAuthData(googleResponse)));
            }
            String message = googleResponse != null && googleResponse.get("message") != null
                    ? googleResponse.get("message").toString()
                    : "Google login failed";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, message));
        } catch (DataAccessException e) {
            return redisUnavailable("Google login failed: Redis unavailable for refresh token");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Google login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody(required = false) Map<String, String> body) {
        if (body != null && StringUtils.hasText(body.get("refreshToken"))) {
            try {
                refreshTokenService.revoke(body.get("refreshToken").trim());
            } catch (DataAccessException e) {
                return redisUnavailable("Logout failed: Redis unavailable");
            }
        }
        return ResponseEntity.ok(ApiResponse.success("Logged out", null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body != null ? body.get("email") : null;
        if (!StringUtils.hasText(email)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "Email is required"));
        }
        try {
            Map<String, Object> result = userClient.forgotPassword(Map.of("email", email.trim()));
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                String message = result.get("message") != null
                        ? result.get("message").toString()
                        : "Email đã được gửi";
                return ResponseEntity.ok(ApiResponse.success(message, null));
            }
            String message = result != null && result.get("message") != null
                    ? result.get("message").toString()
                    : "Không thể gửi email";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(400, message));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Forgot password failed: " + e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody Map<String, String> body) {
        if (body == null || !StringUtils.hasText(body.get("token"))
                || !StringUtils.hasText(body.get("newPassword"))
                || !StringUtils.hasText(body.get("confirmPassword"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "token, newPassword and confirmPassword are required"));
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("token", body.get("token").trim());
            payload.put("newPassword", body.get("newPassword"));
            payload.put("confirmPassword", body.get("confirmPassword"));
            Map<String, Object> result = userClient.resetPassword(payload);
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                String message = result.get("message") != null
                        ? result.get("message").toString()
                        : "Đặt lại mật khẩu thành công";
                return ResponseEntity.ok(ApiResponse.success(message, null));
            }
            String message = result != null && result.get("message") != null
                    ? result.get("message").toString()
                    : "Đặt lại mật khẩu thất bại";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(400, message));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Reset password failed: " + e.getMessage()));
        }
    }

    @GetMapping("/qr/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateQrToken() {
        try {
            Map<String, Object> result = userClient.generateQrToken();
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                Map<String, Object> data = new HashMap<>();
                data.put("qrToken", result.get("qrToken"));
                return ResponseEntity.ok(ApiResponse.success(data));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "Failed to generate QR token"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "QR generate failed: " + e.getMessage()));
        }
    }

    @GetMapping("/qr/status/{token}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getQrStatus(@PathVariable String token) {
        try {
            Map<String, Object> result = userClient.getQrStatus(token);
            if (result == null || Boolean.FALSE.equals(result.get("success"))) {
                String message = result != null && result.get("message") != null
                        ? result.get("message").toString()
                        : "Invalid QR token";
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(400, message));
            }

            Map<String, Object> data = new HashMap<>();
            String status = result.get("status") != null ? result.get("status").toString() : "PENDING";
            data.put("status", status);

            if ("VERIFIED".equals(status)) {
                data.putAll(buildAuthData(result));
            }

            return ResponseEntity.ok(ApiResponse.success(data));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "QR status failed: " + e.getMessage()));
        }
    }

    @PostMapping("/qr/verify")
    public ResponseEntity<ApiResponse<Void>> verifyQrToken(
            @RequestParam String token,
            @RequestParam Integer userId) {
        if (!StringUtils.hasText(token) || userId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(400, "token and userId are required"));
        }
        try {
            Map<String, Object> result = userClient.verifyQrToken(token.trim(), userId);
            if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                return ResponseEntity.ok(ApiResponse.success("QR verified", null));
            }
            String message = result != null && result.get("message") != null
                    ? result.get("message").toString()
                    : "QR verification failed";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(400, message));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "QR verify failed: " + e.getMessage()));
        }
    }

    private Map<String, Object> buildAuthData(Map<String, Object> userServiceResponse) {
        String username = (String) userServiceResponse.get("username");
        List<String> roles = extractStringList(userServiceResponse.get("roles"));
        List<String> permissions = extractStringList(userServiceResponse.get("permissions"));

        Map<String, Object> data = new HashMap<>();
        data.put("accessToken", jwtTokenProvider.generateTokenFromUsername(username, roles, permissions));
        data.put("refreshToken", refreshTokenService.issue(username, roles, permissions));
        data.put("tokenType", "Bearer");
        data.put("roles", roles);
        data.put("permissions", permissions);
        data.put("user", userServiceResponse.get("user"));
        return data;
    }

    @SuppressWarnings("unchecked")
    private static List<String> extractStringList(Object value) {
        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .collect(java.util.stream.Collectors.toList());
        }
        return List.of();
    }

    private static <T> ResponseEntity<ApiResponse<T>> redisUnavailable(String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(ApiResponse.error(503, message));
    }
}
