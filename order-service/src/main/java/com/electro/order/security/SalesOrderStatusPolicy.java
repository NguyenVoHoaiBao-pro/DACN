package com.electro.order.security;

import com.electro.order.entity.Order;

/**
 * Sales: xác nhận đơn & hủy trước khi chuyển kho đóng gói.
 */
public final class SalesOrderStatusPolicy {

    private SalesOrderStatusPolicy() {
    }

    public static boolean canTransition(Order.OrderStatus from, Order.OrderStatus to) {
        if (from == null || to == null) {
            return false;
        }
        return switch (from) {
            case PENDING -> to == Order.OrderStatus.CONFIRMED || to == Order.OrderStatus.CANCELLED;
            case CONFIRMED -> to == Order.OrderStatus.CANCELLED;
            default -> false;
        };
    }
}
