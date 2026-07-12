-- Phân quyền hoàn tiền: Sales (xem + nhập STK) vs Admin (duyệt chi tiền)
USE electro_user_db;

INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `created_at`) VALUES
(28, 'REFUND_VIEW', 'Xem hoàn tiền', 'Sales/Admin xem danh sách yêu cầu hoàn tiền sau khi Kho xử lý RT.', NOW()),
(29, 'REFUND_BANK_INFO', 'Nhập STK hoàn tiền', 'Sales nhập thông tin ngân hàng khách (đơn COD).', NOW());

UPDATE `permissions`
SET `description` = 'Admin duyệt hoàn tiền cổng (VNPay/MoMo) và xác nhận chuyển khoản COD.'
WHERE `code` = 'REFUND_APPROVE';

-- Admin: toàn quyền hoàn tiền
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 28),
(1, 29);

-- Sales: xem + nhập STK (không duyệt chi tiền)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(3, 28),
(3, 29);
