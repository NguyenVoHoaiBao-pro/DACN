-- Sales: xem hồ sơ khách hàng (read-only) — CUSTOMER_VIEW
INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `created_at`) VALUES
(25, 'CUSTOMER_VIEW', 'Xem khách hàng', 'Xem hồ sơ khách hàng, lịch sử mua (read-only).', NOW());

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 25);
