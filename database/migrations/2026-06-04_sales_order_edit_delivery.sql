-- Sales: sửa thông tin giao hàng & ghi chú (PENDING / CONFIRMED only — enforced in order-service)
INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `created_at`) VALUES
(26, 'ORDER_EDIT_DELIVERY', 'Sửa giao hàng đơn', 'Sửa tên/SĐT/địa chỉ và ghi chú khi đơn chưa đóng gói.', NOW());

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 26);
