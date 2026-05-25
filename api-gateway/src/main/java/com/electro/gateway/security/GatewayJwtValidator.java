package com.electro.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

@Component
public class GatewayJwtValidator {

    private static final String TYPE_ACCESS = "access";
    private static final String CLAIM_TYPE = "type";

    private final SecretKey signingKey;

    public GatewayJwtValidator(@Value("${jwt.secret}") String jwtSecret) {
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    /** Chi chap nhan access token — khong dung refresh token goi API business. */
    public boolean validateAccessToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            String type = claims.get(CLAIM_TYPE, String.class);
            return type == null || TYPE_ACCESS.equals(type);
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }
}
