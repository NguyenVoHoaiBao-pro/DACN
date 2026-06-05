package com.electro.order.security;

import com.electro.order.entity.Order;

import java.util.EnumSet;
import java.util.Set;

/**
 * Sales may edit delivery info only while the order is still before warehouse dispatch.
 * PROCESSING = đóng gói; SHIPPING+ = đã in nhãn / đang giao.
 */
public final class SalesOrderEditPolicy {

    private static final Set<Order.OrderStatus> EDITABLE = EnumSet.of(
            Order.OrderStatus.PENDING,
            Order.OrderStatus.CONFIRMED);

    private static final Set<Order.OrderStatus> LOCKED_AFTER = EnumSet.of(
            Order.OrderStatus.PROCESSING,
            Order.OrderStatus.SHIPPING,
            Order.OrderStatus.DELIVERED,
            Order.OrderStatus.COMPLETED,
            Order.OrderStatus.CANCELLED,
            Order.OrderStatus.REFUNDED);

    private SalesOrderEditPolicy() {
    }

    public static boolean canEditDelivery(Order.OrderStatus status) {
        return status != null && EDITABLE.contains(status);
    }

    public static String lockMessage(Order.OrderStatus status) {
        if (status == null) {
            return "Không xác định được trạng thái đơn hàng.";
        }
        return switch (status) {
            case PROCESSING ->
                    "Đơn đang ở trạng thái Đang đóng gói (PROCESSING). Không thể sửa địa chỉ vì nhãn vận chuyển có thể đã được tạo.";
            case SHIPPING ->
                    "Đơn đã giao cho đơn vị vận chuyển / Đang giao hàng (SHIPPING). Không thể sửa thông tin giao hàng.";
            case DELIVERED, COMPLETED ->
                    "Đơn đã giao hoặc hoàn tất. Không thể sửa thông tin giao hàng.";
            case CANCELLED, REFUNDED ->
                    "Đơn đã hủy hoặc hoàn tiền. Không thể sửa thông tin giao hàng.";
            default ->
                    "Chỉ được sửa khi đơn ở trạng thái Chờ xử lý (PENDING) hoặc Đã xác nhận (CONFIRMED). Trạng thái hiện tại: "
                            + status;
        };
    }

    public static boolean isLockedStatus(Order.OrderStatus status) {
        return status != null && LOCKED_AFTER.contains(status);
    }
}
