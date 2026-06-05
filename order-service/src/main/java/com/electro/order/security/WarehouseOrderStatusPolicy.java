package com.electro.order.security;

import com.electro.order.entity.Order;

/**
 * Warehouse / fulfillment: đóng gói → giao → hoàn tất (sau khi Sales đã xác nhận).
 */
public final class WarehouseOrderStatusPolicy {

    private WarehouseOrderStatusPolicy() {
    }

    public static boolean canTransition(Order.OrderStatus from, Order.OrderStatus to) {
        if (from == null || to == null) {
            return false;
        }
        return switch (from) {
            case CONFIRMED -> to == Order.OrderStatus.PROCESSING;
            case PROCESSING -> to == Order.OrderStatus.SHIPPING || to == Order.OrderStatus.CANCELLED;
            case SHIPPING -> to == Order.OrderStatus.DELIVERED || to == Order.OrderStatus.CANCELLED;
            case DELIVERED -> to == Order.OrderStatus.COMPLETED;
            default -> false;
        };
    }
}
