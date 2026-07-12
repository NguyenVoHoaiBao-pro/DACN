-- Quyền duyệt yêu cầu trả hàng — electro_user_db
USE electro_user_db;

INSERT IGNORE INTO `permissions` (`id`, `code`, `name`, `description`, `created_at`) VALUES
(34, 'RETURN_REQUEST_REVIEW', 'Duyệt yêu cầu trả hàng', 'Sales/Admin duyệt hoặc từ chối yêu cầu trả hàng của khách.', NOW());

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 34),
(3, 34);
