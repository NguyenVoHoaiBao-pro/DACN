import { useSelector } from "react-redux";
import { selectUser } from "../redux/appSlice";

/**
 * Hook tùy chỉnh để quản lý logic phân quyền (RBAC) trên phía Frontend.
 * Hàm này lấy thông tin user từ Redux, giải mã tất cả các quyền (permissions)
 * mà user có từ danh sách roles, và cung cấp các hàm tiện ích kiểm tra.
 */
export const usePermissions = () => {
    const user = useSelector(selectUser);

    // Gộp tất cả các permissions từ các roles của user lại thành 1 mảng phẳng (flat array)
    // Loại bỏ các quyền trùng lặp bằng cách dùng Set
    const allPermissions = (() => {
        if (!user || (!user.roles && !user.role)) return [];

        let perms = [];

        // Nếu API trả về mảng roles (Set<RoleDto>)
        if (Array.isArray(user.roles)) {
            user.roles.forEach((role) => {
                if (Array.isArray(role.permissions)) {
                    // Lấy mã quyền (nếu API backend trả mảng string hoặc mảng Object)
                    role.permissions.forEach(p => perms.push(typeof p === 'string' ? p : p.code || p.name));
                }
            });
        } else if (user.role && Array.isArray(user.role.permissions)) {
            // Logic dự phòng nếu chỉ có 1 role object
            user.role.permissions.forEach(p => perms.push(typeof p === 'string' ? p : p.code || p.name));
        }

        // Tạm thời fix cứng cho các Vai trò nếu hệ thống Backend chưa gửi permission list
        const isAdmin = user?.roles?.some(r => r.name === "ROLE_ADMIN" || r.name === "ADMIN") || user?.role?.name === "ROLE_ADMIN" || user?.role?.name === "ADMIN";
        const isWarehouse = user?.roles?.some(r => r.name === "WAREHOUSE") || user?.role?.name === "WAREHOUSE";
        const isSales = user?.roles?.some(r => r.name === "SALES") || user?.role?.name === "SALES";

        if (perms.length === 0 || isAdmin) {

            if (isAdmin) {
                // Admin: Full Quyền Hệ thống
                perms = [
                    "PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_UPDATE", "STOCK_IMPORT", "IMEI_MANAGE",
                    "INVENTORY_STAT", "ORDER_VIEW_ALL", "ORDER_CONFIRM", "ORDER_CANCEL", "ORDER_ASSIGN_SHIPPING",
                    "ORDER_TRACKING_UPDATE", "USER_PROFILE_UPDATE", "USER_ORDER_HISTORY", "USER_WARRANTY_LOOKUP",
                    "USER_MANAGE", "ROLE_PERM_EDIT", "REPORT_REVENUE", "STOCK_RETURN", "ORDER_CREATE",
                    "CUSTOMER_VIEW", "REPORT_SALES", "CATEGORY_VIEW", "BANNER_MANAGE", "POST_MANAGE", "WARRANTY_MANAGE",
                    "PRODUCT_MANAGE"
                ];

            } else if (isWarehouse) {
                // Thủ kho: Chuyên nhập xuất hàng, gạch bỏ các quyền sửa xóa SP và đơn hàng
                perms = [
                    "PRODUCT_VIEW", "STOCK_IMPORT", "IMEI_MANAGE", "INVENTORY_STAT", "ORDER_VIEW_ALL",
                    "ORDER_ASSIGN_SHIPPING", "ORDER_TRACKING_UPDATE", "STOCK_RETURN"
                ];
            } else if (isSales) {
                // Nhân viên Sale: Dịch vụ khách hàng, Không rớ vào tồn kho hệ thống hoặc kho bãi
                perms = [
                    "PRODUCT_VIEW", "ORDER_VIEW_ALL", "ORDER_CONFIRM", "ORDER_CANCEL", "USER_PROFILE_UPDATE",
                    "USER_ORDER_HISTORY", "USER_WARRANTY_LOOKUP", "WARRANTY_MANAGE", "ORDER_CREATE", "CUSTOMER_VIEW", "REPORT_SALES"
                ];
            }
        }

        return [...new Set(perms)]; // Trả về mảng các phân quyền duy nhất
    })();

    const hasPermission = (permissionCode) => {
        return allPermissions.includes(permissionCode);
    };

    const hasAnyPermission = (permissionCodes) => {
        return permissionCodes.some(code => allPermissions.includes(code));
    };

    const hasAllPermissions = (permissionCodes) => {
        return permissionCodes.every(code => allPermissions.includes(code));
    };

    return {
        permissions: allPermissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions
    };
};
