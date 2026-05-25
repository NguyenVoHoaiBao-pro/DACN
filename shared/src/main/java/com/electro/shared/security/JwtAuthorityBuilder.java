package com.electro.shared.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Builds Spring Security authorities from JWT roles + permission codes (RBAC).
 */
public final class JwtAuthorityBuilder {

    private JwtAuthorityBuilder() {
    }

    public static List<GrantedAuthority> buildAuthorities(List<String> roles, List<String> permissions) {
        Set<String> unique = new LinkedHashSet<>();
        if (roles != null) {
            for (String role : roles) {
                if (role == null || role.isBlank()) {
                    continue;
                }
                String normalized = role.trim();
                unique.add(normalized);
                unique.add("ROLE_" + normalized);
            }
        }
        if (permissions != null) {
            for (String permission : permissions) {
                if (permission != null && !permission.isBlank()) {
                    unique.add(permission.trim());
                }
            }
        }
        List<GrantedAuthority> authorities = new ArrayList<>(unique.size());
        for (String code : unique) {
            authorities.add(new SimpleGrantedAuthority(code));
        }
        return authorities;
    }
}
