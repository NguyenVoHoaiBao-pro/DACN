package com.electro.catalog.security;

import com.electro.catalog.client.UserClient;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CatalogActorContext {

    private final UserClient userClient;

    /** ID user đang đăng nhập — dùng ghi inventory_transactions.user_id */
    public Integer currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            return null;
        }
        try {
            return userClient.getUserByUsername(auth.getName()).getId();
        } catch (Exception e) {
            return null;
        }
    }
}
