package com.electro.user.security;

import com.electro.user.entity.Permission;
import com.electro.user.entity.Role;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Canonical permission codes per staff role.
 * SALES / WAREHOUSE use whitelist only (DB role_permissions cannot elevate them).
 */
public final class RolePermissionDefaults {

    private static final Set<String> WHITELIST_ONLY_ROLES = Set.of("SALES", "WAREHOUSE");

    private RolePermissionDefaults() {
    }

    private static final Map<String, List<String>> BY_ROLE = Map.of(
            "SALES", List.of(
                    "PRODUCT_VIEW", "INVENTORY_STAT", "ORDER_VIEW_ALL", "ORDER_CONFIRM", "ORDER_CANCEL",
                    "USER_PROFILE_UPDATE", "USER_ORDER_HISTORY", "USER_WARRANTY_LOOKUP", "WARRANTY_MANAGE",
                    "ORDER_CREATE", "CUSTOMER_VIEW", "REPORT_SALES", "ORDER_EDIT_DELIVERY"),
            "WAREHOUSE", List.of(
                    "PRODUCT_VIEW", "STOCK_IMPORT", "IMEI_MANAGE", "INVENTORY_STAT", "ORDER_VIEW_ALL",
                    "ORDER_ASSIGN_SHIPPING", "ORDER_TRACKING_UPDATE", "ORDER_CANCEL", "STOCK_RETURN"));

    /** @deprecated use {@link #resolvePermissionsForRole(Role)} */
    public static void mergeForRole(String roleName, Set<String> codes) {
        if (roleName == null || roleName.isBlank()) {
            return;
        }
        List<String> defaults = BY_ROLE.get(roleName.trim());
        if (defaults != null) {
            codes.addAll(defaults);
        }
    }

    public static Set<String> resolvePermissionsForRole(Role role) {
        if (role == null || role.getName() == null || role.getName().isBlank()) {
            return Set.of();
        }
        String roleName = role.getName().trim();
        List<String> defaults = BY_ROLE.get(roleName);

        if (WHITELIST_ONLY_ROLES.contains(roleName)) {
            return defaults == null ? Set.of() : new LinkedHashSet<>(defaults);
        }

        Set<String> codes = new LinkedHashSet<>();
        if (role.getPermissions() != null) {
            for (Permission permission : role.getPermissions()) {
                if (permission.getCode() != null && !permission.getCode().isBlank()) {
                    codes.add(permission.getCode().trim());
                }
            }
        }
        if (defaults != null) {
            codes.addAll(defaults);
        }
        return codes;
    }
}
