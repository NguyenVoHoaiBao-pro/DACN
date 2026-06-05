import { useSelector } from "react-redux";
import { selectUser } from "../redux/appSlice";

const SALES_DEFAULTS = [
    "PRODUCT_VIEW", "INVENTORY_STAT", "ORDER_VIEW_ALL", "ORDER_CONFIRM", "ORDER_CANCEL",
    "USER_PROFILE_UPDATE", "USER_ORDER_HISTORY", "USER_WARRANTY_LOOKUP", "WARRANTY_MANAGE",
    "ORDER_CREATE", "CUSTOMER_VIEW", "REPORT_SALES", "ORDER_EDIT_DELIVERY",
];

const WAREHOUSE_DEFAULTS = [
    "PRODUCT_VIEW", "STOCK_IMPORT", "IMEI_MANAGE", "INVENTORY_STAT", "ORDER_VIEW_ALL",
    "ORDER_ASSIGN_SHIPPING", "ORDER_TRACKING_UPDATE", "ORDER_CANCEL", "STOCK_RETURN",
];

const ADMIN_DEFAULTS = [
    "PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "STOCK_IMPORT", "IMEI_MANAGE",
    "INVENTORY_STAT", "ORDER_VIEW_ALL", "ORDER_CONFIRM", "ORDER_CANCEL", "ORDER_ASSIGN_SHIPPING",
    "ORDER_TRACKING_UPDATE", "ORDER_EDIT_DELIVERY", "USER_PROFILE_UPDATE", "USER_ORDER_HISTORY", "USER_WARRANTY_LOOKUP",
    "USER_MANAGE", "ROLE_PERM_EDIT", "REPORT_REVENUE", "STOCK_RETURN", "ORDER_CREATE",
    "CUSTOMER_VIEW", "REPORT_SALES", "CATEGORY_VIEW", "BANNER_MANAGE", "POST_MANAGE", "WARRANTY_MANAGE",
    "PRODUCT_MANAGE",
];

const normalizeRoleName = (name) => (name || "").replace(/^ROLE_/i, "").trim().toUpperCase();

const getRoleNames = (user) => {
    if (!user) return [];
    if (Array.isArray(user.roles)) {
        return user.roles
            .map((r) => normalizeRoleName(typeof r === "string" ? r : r?.name))
            .filter(Boolean);
    }
    if (user.role?.name) {
        return [normalizeRoleName(user.role.name)];
    }
    if (Array.isArray(user.permissions) && user.permissions.includes("USER_MANAGE")) {
        return ["ADMIN"];
    }
    return [];
};

const isAdminFromPermissions = (perms) =>
    perms.includes("USER_MANAGE") || perms.includes("REPORT_REVENUE") || perms.includes("ROLE_PERM_EDIT");

/**
 * SALES / WAREHOUSE: whitelist only (khớp RolePermissionDefaults.java).
 * ADMIN: full admin set (+ quyền từ DB nếu có trên role khác).
 */
const buildPermissionSet = (user) => {
    if (!user) return [];
    const loginPermsEarly = Array.isArray(user.permissions)
        ? user.permissions.map((p) => (typeof p === "string" ? p : p?.code || p?.name)).filter(Boolean)
        : [];
    if (!user.roles && !user.role && loginPermsEarly.length === 0) return [];

    const roleNames = getRoleNames(user);
    const loginPerms = Array.isArray(user.permissions)
        ? user.permissions.map((p) => (typeof p === "string" ? p : p?.code || p?.name)).filter(Boolean)
        : [];
    const isAdmin =
        roleNames.includes("ADMIN") || isAdminFromPermissions(loginPerms);
    const isSales = roleNames.includes("SALES") && !isAdmin;
    const isWarehouse = roleNames.includes("WAREHOUSE") && !isAdmin;

    if (isAdmin) {
        const fromDb = new Set(ADMIN_DEFAULTS);
        if (Array.isArray(user.roles)) {
            user.roles.forEach((role) => {
                const roleName = typeof role === "string" ? role : role?.name;
                if (normalizeRoleName(roleName) === "ADMIN" && Array.isArray(role.permissions)) {
                    role.permissions.forEach((p) => {
                        const code = typeof p === "string" ? p : p.code || p.name;
                        if (code) fromDb.add(code);
                    });
                }
            });
        }
        return [...fromDb];
    }

    const perms = new Set();
    if (isSales) SALES_DEFAULTS.forEach((p) => perms.add(p));
    if (isWarehouse) WAREHOUSE_DEFAULTS.forEach((p) => perms.add(p));

    if (perms.size === 0 && Array.isArray(user.roles)) {
        user.roles.forEach((role) => {
            if (Array.isArray(role.permissions)) {
                role.permissions.forEach((p) => {
                    const code = typeof p === "string" ? p : p.code || p.name;
                    if (code) perms.add(code);
                });
            }
        });
    }

    return [...perms];
};

export const usePermissions = () => {
    const user = useSelector(selectUser);
    const allPermissions = buildPermissionSet(user);
    const roleNames = getRoleNames(user);
    const isAdminUser =
        roleNames.includes("ADMIN") || isAdminFromPermissions(allPermissions);

    const hasPermission = (permissionCode) => allPermissions.includes(permissionCode);

    const hasAnyPermission = (permissionCodes) =>
        permissionCodes.some((code) => allPermissions.includes(code));

    const hasAllPermissions = (permissionCodes) =>
        permissionCodes.every((code) => allPermissions.includes(code));

    const hasRole = (roleName) => roleNames.includes(normalizeRoleName(roleName));

    return {
        permissions: allPermissions,
        roleNames,
        hasRole,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isAdminUser,
        isSalesUser: roleNames.includes("SALES") && !isAdminUser,
        isWarehouseUser: roleNames.includes("WAREHOUSE") && !isAdminUser,
    };
};
