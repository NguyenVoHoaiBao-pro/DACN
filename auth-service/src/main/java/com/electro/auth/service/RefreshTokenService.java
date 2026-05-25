package com.electro.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RefreshTokenService {

    private static final String KEY_PREFIX = "auth:refresh:";

    private final StringRedisTemplate redisTemplate;
    private final long refreshTtlMs;

    public RefreshTokenService(
            StringRedisTemplate redisTemplate,
            @Value("${jwt.refresh-expiration:604800000}") long refreshTtlMs) {
        this.redisTemplate = redisTemplate;
        this.refreshTtlMs = refreshTtlMs;
    }

    public String issue(String username, List<String> roles, List<String> permissions) {
        String token = UUID.randomUUID().toString();
        String value = encodeValue(username, roles, permissions);
        redisTemplate.opsForValue().set(KEY_PREFIX + token, value, Duration.ofMillis(refreshTtlMs));
        return token;
    }

    /** @deprecated use {@link #issue(String, List, List)} */
    public String issue(String username, List<String> roles) {
        return issue(username, roles, List.of());
    }

    public Optional<TokenPayload> validate(String token) {
        if (!StringUtils.hasText(token)) {
            return Optional.empty();
        }
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + token.trim());
        if (!StringUtils.hasText(value)) {
            return Optional.empty();
        }
        return Optional.of(decodeValue(value));
    }

    /** Validates old token, revokes it, and issues a new refresh token (rotation). */
    public Optional<TokenPayload> rotate(String oldToken) {
        return validate(oldToken).map(payload -> {
            revoke(oldToken);
            String newToken = issue(payload.username(), payload.roles(), payload.permissions());
            return new TokenPayload(payload.username(), payload.roles(), payload.permissions(), newToken);
        });
    }

    public void revoke(String token) {
        if (StringUtils.hasText(token)) {
            redisTemplate.delete(KEY_PREFIX + token.trim());
        }
    }

    private static String encodeValue(String username, List<String> roles, List<String> permissions) {
        String rolePart = roles == null ? "" : String.join(",", roles);
        String permPart = permissions == null ? "" : String.join(",", permissions);
        return username + "|" + rolePart + "|" + permPart;
    }

    private static TokenPayload decodeValue(String value) {
        String[] parts = value.split("\\|", -1);
        if (parts.length == 1) {
            return new TokenPayload(parts[0], List.of(), List.of(), null);
        }
        String username = parts[0];
        List<String> roles = parseCsv(parts.length > 1 ? parts[1] : "");
        List<String> permissions = parts.length > 2 ? parseCsv(parts[2]) : List.of();
        return new TokenPayload(username, roles, permissions, null);
    }

    private static List<String> parseCsv(String part) {
        if (part == null || part.isBlank()) {
            return List.of();
        }
        return Arrays.stream(part.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public record TokenPayload(String username, List<String> roles, List<String> permissions, String refreshToken) {
    }
}
