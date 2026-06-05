-- Sales (role_id=3): read-only inventory — INVENTORY_STAT only, not STOCK_IMPORT / IMEI_MANAGE
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES (3, 6);
