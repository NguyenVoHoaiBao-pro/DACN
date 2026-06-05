package com.electro.order.security;

import com.electro.order.entity.Order;
import com.electro.order.exception.BadRequestException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Set;

public final class OrderSecurityHelper {

    private static final Set<String> FULL_ORDER_ACCESS = Set.of(
            "USER_MANAGE", "ROLE_ADMIN", "ADMIN");

    private static final Set<String> WAREHOUSE_FULFILLMENT = Set.of(
            "ORDER_ASSIGN_SHIPPING", "ORDER_TRACKING_UPDATE", "IMEI_MANAGE");

    private static final Set<String> SALES_CONFIRM = Set.of("ORDER_CONFIRM");

    private static final Set<String> SALES_CANCEL = Set.of(
            "ORDER_CANCEL");

    private OrderSecurityHelper() {
    }

    public static boolean hasFullOrderManageAccess() {
        return hasAnyAuthority(FULL_ORDER_ACCESS);
    }

    public static boolean hasWarehouseFulfillmentAccess() {
        return hasFullOrderManageAccess() || hasAnyAuthority(WAREHOUSE_FULFILLMENT);
    }

    public static boolean hasSalesConfirmAccess() {
        return hasAnyAuthority(SALES_CONFIRM);
    }

    public static boolean hasSalesCancelAccess() {
        return hasFullOrderManageAccess() || hasAnyAuthority(SALES_CANCEL);
    }

    /** Sales staff (không phải Admin hệ thống) — chỉ xem đơn được gán cho mình. */
    public static boolean isSalesStaffOnly() {
        return hasAnyAuthority(SALES_CONFIRM) && !hasFullOrderManageAccess();
    }

    /**
     * Kiểm tra quyền chuyển trạng thái sau khi đã validate flow nghiệp vụ chung.
     */
    public static void assertCanUpdateOrderStatus(Order.OrderStatus current, Order.OrderStatus target) {
        if (hasFullOrderManageAccess()) {
            return;
        }
        if (target == Order.OrderStatus.REFUNDED) {
            throw new BadRequestException("Chỉ Admin hệ thống mới được chuyển sang trạng thái Hoàn tiền (REFUNDED).");
        }

        boolean allowed = false;
        if (hasSalesConfirmAccess() && SalesOrderStatusPolicy.canTransition(current, target)) {
            allowed = true;
        }
        if (hasWarehouseFulfillmentAccess() && WarehouseOrderStatusPolicy.canTransition(current, target)) {
            allowed = true;
        }

        if (!allowed) {
            throw new BadRequestException(roleDeniedStatusMessage(current, target));
        }
    }

    public static void assertCanUpdatePaymentStatus() {
        if (!hasFullOrderManageAccess() && !hasWarehouseFulfillmentAccess()) {
            throw new BadRequestException(
                    "Nhân viên Sales không được cập nhật trạng thái thanh toán. Liên hệ Kho hoặc Admin.");
        }
    }

    public static void assertCanToggleVisibility() {
        if (!hasFullOrderManageAccess()) {
            throw new BadRequestException("Chỉ Admin hệ thống mới được ẩn / hiện đơn hàng.");
        }
    }

    public static void assertCanAssignImei() {
        if (!hasWarehouseFulfillmentAccess()) {
            throw new BadRequestException(
                    "Chỉ Thủ kho (hoặc Admin) mới được gán IMEI cho đơn hàng.");
        }
    }

    public static void assertCanCancelOrder(Order.OrderStatus status) {
        if (hasFullOrderManageAccess()) {
            return;
        }
        if (hasWarehouseFulfillmentAccess()
                && (status == Order.OrderStatus.PROCESSING || status == Order.OrderStatus.SHIPPING)) {
            return;
        }
        if (hasSalesCancelAccess() && SalesOrderEditPolicy.canEditDelivery(status)) {
            return;
        }
        throw new BadRequestException(
                "Bạn không có quyền hủy đơn ở trạng thái " + status
                        + ". Sales: PENDING/CONFIRMED; Kho: PROCESSING/SHIPPING; Admin: mọi trạng thái (trừ COMPLETED).");
    }

    private static String roleDeniedStatusMessage(Order.OrderStatus current, Order.OrderStatus target) {
        if (hasSalesConfirmAccess() && !hasWarehouseFulfillmentAccess()) {
            return "Sales chỉ được: PENDING → Đã xác nhận / Hủy; CONFIRMED → Hủy. "
                    + "Không thể chuyển từ " + current + " sang " + target + ".";
        }
        if (hasWarehouseFulfillmentAccess() && !hasSalesConfirmAccess()) {
            return "Thủ kho chỉ được: CONFIRMED → Đóng gói → Giao → Hoàn tất. "
                    + "Không thể chuyển từ " + current + " sang " + target + ".";
        }
        return "Không có quyền chuyển từ " + current + " sang " + target + ".";
    }

    private static boolean hasAnyAuthority(Set<String> codes) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (authority != null && codes.contains(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
