-- =============================================================================
-- PATCH: Bổ sung nghiệp vụ Sales + Warehouse từ Electro Store Microservices
-- Database đích: cd_web (monolithic — dùng cho môn khác / tái sử dụng domain)
--
-- Gộp từ các migration trong database/migrations/ (2026-06-02 → 2026-06-17)
-- An toàn chạy nhiều lần (idempotent).
--
-- Cách chạy (Navicat / MySQL Workbench / CLI):
--   mysql -h HOST -P PORT -u USER -p cd_web < database/cd_web_patch_microservices_sales_warehouse.sql
--
-- Sau khi chạy: restart các service hoặc import lại cd_web.sql đã được cập nhật.
-- =============================================================================

USE `cd_web`;

SET NAMES utf8mb4;
SET @db = DATABASE();

-- =============================================================================
-- 1. PERMISSIONS — Sales / Warehouse / Hoàn tiền (theo CODE, tránh trùng ID)
-- =============================================================================

INSERT IGNORE INTO `permissions` (`code`, `name`, `description`, `created_at`) VALUES
('ORDER_EDIT_DELIVERY', 'Sửa giao hàng đơn', 'Sửa tên/SĐT/địa chỉ và ghi chú khi đơn chưa đóng gói.', NOW()),
('REFUND_APPROVE', 'Duyệt hoàn tiền', 'Admin duyệt hoàn tiền cổng (VNPay/MoMo) và xác nhận chuyển khoản COD.', NOW()),
('REFUND_VIEW', 'Xem hoàn tiền', 'Sales/Admin xem danh sách yêu cầu hoàn tiền sau khi Kho xử lý RT.', NOW()),
('REFUND_BANK_INFO', 'Nhập STK hoàn tiền', 'Sales nhập thông tin ngân hàng khách (đơn COD).', NOW());

-- Admin: toàn quyền hoàn tiền + sửa giao hàng
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'ADMIN' AND p.code IN ('ORDER_EDIT_DELIVERY','REFUND_APPROVE','REFUND_VIEW','REFUND_BANK_INFO');

-- Sales: xem đơn, sửa giao hàng, xem/nhập STK hoàn tiền (không duyệt chi)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'SALES' AND p.code IN (
  'ORDER_EDIT_DELIVERY','REFUND_VIEW','REFUND_BANK_INFO',
  'CUSTOMER_VIEW','REPORT_SALES','ORDER_CREATE','PRODUCT_VIEW','INVENTORY_STAT'
);

-- Warehouse: trả hàng kho (STOCK_RETURN đã có trong cd_web id=27)
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.name = 'WAREHOUSE' AND p.code IN (
  'STOCK_RETURN','STOCK_IMPORT','IMEI_MANAGE','INVENTORY_STAT',
  'ORDER_VIEW_ALL','ORDER_ASSIGN_SHIPPING','ORDER_TRACKING_UPDATE','ORDER_CANCEL','PRODUCT_VIEW'
);

-- =============================================================================
-- 2. ORDERS — Sales assignment, pipeline, GHN webhook, COD đối soát
-- =============================================================================

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='assigned_sales_user_id')=0,
  'ALTER TABLE `orders` ADD COLUMN `assigned_sales_user_id` INT NULL AFTER `user_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='order_source')=0,
  'ALTER TABLE `orders` ADD COLUMN `order_source` VARCHAR(30) NOT NULL DEFAULT ''WEB_ORGANIC'' COMMENT ''WEB_ORGANIC|WEB_ASSIGNED|SALES_CHAT|SALES_LINK|ADMIN_SALES'' AFTER `assigned_sales_user_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='sales_pipeline_status')=0,
  'ALTER TABLE `orders` ADD COLUMN `sales_pipeline_status` VARCHAR(40) NOT NULL DEFAULT ''NEW_ASSIGNED'' COMMENT ''NEW_ASSIGNED|CALLING|THINKING|APPROVED_WAREHOUSE'' AFTER `order_source`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='ghn_shipping_status')=0,
  'ALTER TABLE `orders` ADD COLUMN `ghn_shipping_status` VARCHAR(50) NULL AFTER `ghn_order_code`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='ghn_status_updated_at')=0,
  'ALTER TABLE `orders` ADD COLUMN `ghn_status_updated_at` DATETIME NULL AFTER `ghn_shipping_status`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='orders' AND COLUMN_NAME='cod_reconciled')=0,
  'ALTER TABLE `orders` ADD COLUMN `cod_reconciled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `payment_status`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE `orders` SET `cod_reconciled` = 1 WHERE `payment_method` = 'COD' AND `payment_status` = 'PAID' AND `cod_reconciled` = 0;
UPDATE `orders` SET `order_source` = 'WEB_ORGANIC' WHERE `order_source` IS NULL OR `order_source` = '';
UPDATE `orders` SET `sales_pipeline_status` = 'NEW_ASSIGNED' WHERE `sales_pipeline_status` IS NULL OR `sales_pipeline_status` = '';

-- =============================================================================
-- 3. SALES KPI
-- =============================================================================

CREATE TABLE IF NOT EXISTS `sales_kpi_config` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `monthly_revenue_target` DECIMAL(15,2) NOT NULL DEFAULT 200000000.00,
  `commission_rate_organic` DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
  `commission_rate_web` DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
  `commission_rate_sales_assisted` DECIMAL(8,4) NOT NULL DEFAULT 0.0100,
  `commission_rate_sales_link` DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
  `max_cancel_rate_percent` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `updated_by_user_id` INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

INSERT IGNORE INTO `sales_kpi_config` (`id`) VALUES (1);

-- =============================================================================
-- 4. HOÀN TIỀN — refund_requests + refund_audit_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS `refund_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `refund_code` VARCHAR(30) NOT NULL UNIQUE,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
  `order_id` INT NOT NULL,
  `order_code` VARCHAR(50) NOT NULL,
  `return_slip_id` INT NULL,
  `return_slip_code` VARCHAR(30) NULL,
  `warranty_claim_id` INT NULL,
  `warranty_claim_code` VARCHAR(50) NULL,
  `serial_number` VARCHAR(100) NULL,
  `customer_name` VARCHAR(200) NULL,
  `customer_phone` VARCHAR(30) NULL,
  `product_name` VARCHAR(300) NULL,
  `refund_amount` DECIMAL(15,2) NOT NULL,
  `coupon_allocated_discount` DECIMAL(15,2) NULL,
  `shipping_excluded_amount` DECIMAL(15,2) NULL,
  `payment_method` VARCHAR(20) NOT NULL,
  `refund_channel` VARCHAR(30) NOT NULL,
  `is_defective` TINYINT(1) NULL,
  `defective_reason` VARCHAR(40) NULL,
  `return_reason` TEXT NULL,
  `voucher_code` VARCHAR(30) NULL,
  `customer_bank_name` VARCHAR(100) NULL,
  `customer_bank_account` VARCHAR(50) NULL,
  `customer_bank_account_name` VARCHAR(200) NULL,
  `bank_info_saved_by` VARCHAR(100) NULL,
  `bank_info_saved_at` DATETIME NULL,
  `gateway_refund_id` VARCHAR(100) NULL,
  `gateway_response` TEXT NULL,
  `failure_reason` TEXT NULL,
  `approved_by` VARCHAR(100) NULL,
  `approved_at` DATETIME NULL,
  `rejected_by` VARCHAR(100) NULL,
  `rejected_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `executed_by` VARCHAR(100) NULL,
  `executed_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `transfer_reference` VARCHAR(100) NULL,
  `receipt_image_url` VARCHAR(500) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_refund_status` (`status`),
  INDEX `idx_refund_order` (`order_id`),
  INDEX `idx_refund_slip` (`return_slip_id`),
  INDEX `idx_refund_warranty_claim` (`warranty_claim_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

CREATE TABLE IF NOT EXISTS `refund_audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `refund_id` INT NOT NULL,
  `refund_code` VARCHAR(30) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `actor_username` VARCHAR(100) NOT NULL,
  `actor_role` VARCHAR(50) NULL,
  `detail` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_refund_audit_refund` (`refund_id`),
  INDEX `idx_refund_audit_code` (`refund_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

-- Cột bổ sung nếu bảng refund_requests đã tồn tại từ bản cũ
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='refund_requests' AND COLUMN_NAME='warranty_claim_id')=0,
  'ALTER TABLE `refund_requests` ADD COLUMN `warranty_claim_id` INT NULL, ADD COLUMN `warranty_claim_code` VARCHAR(50) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- =============================================================================
-- 5. TRẢ HÀNG KHO — product_return_slips
-- =============================================================================

CREATE TABLE IF NOT EXISTS `product_return_slips` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slip_code` VARCHAR(30) NOT NULL UNIQUE,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `serial_number` VARCHAR(100) NOT NULL,
  `product_item_id` INT NULL,
  `variant_id` INT NULL,
  `order_id` INT NULL,
  `order_code` VARCHAR(50) NULL,
  `customer_name` VARCHAR(200) NULL,
  `customer_phone` VARCHAR(30) NULL,
  `product_name` VARCHAR(300) NULL,
  `sku_code` VARCHAR(100) NULL,
  `variant_name` VARCHAR(150) NULL,
  `tracking_code` VARCHAR(100) NULL,
  `item_status_before` VARCHAR(30) NULL,
  `condition_type` VARCHAR(20) NULL,
  `is_defective` TINYINT(1) NULL,
  `defective_reason` VARCHAR(40) NULL,
  `reason` TEXT NULL,
  `warehouse_notes` TEXT NULL,
  `processed_by_user_id` INT NULL,
  `processed_at` DATETIME NULL,
  `created_by_user_id` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_return_slip_status` (`status`),
  INDEX `idx_return_slip_serial` (`serial_number`),
  INDEX `idx_return_slip_order` (`order_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

-- =============================================================================
-- 6. PURCHASE ORDER + WAREHOUSE RECEIVING
-- =============================================================================

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_order_items' AND COLUMN_NAME='quantity_damaged')=0,
  'ALTER TABLE `purchase_order_items` ADD COLUMN `quantity_damaged` INT NOT NULL DEFAULT 0 AFTER `quantity_received`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_order_items' AND COLUMN_NAME='quantity_imei_scanned')=0,
  'ALTER TABLE `purchase_order_items` ADD COLUMN `quantity_imei_scanned` INT NOT NULL DEFAULT 0 AFTER `quantity_damaged`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='received_by_user_id')=0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `received_by_user_id` INT NULL AFTER `user_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='approved_by_user_id')=0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `approved_by_user_id` INT NULL COMMENT ''Admin duyệt PO'' AFTER `received_by_user_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='approved_at')=0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `approved_at` DATETIME NULL AFTER `approved_by_user_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='discrepancy_reason')=0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `discrepancy_reason` TEXT NULL AFTER `notes`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='purchase_orders' AND COLUMN_NAME='discrepancy_evidence')=0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `discrepancy_evidence` MEDIUMTEXT NULL AFTER `discrepancy_reason`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

ALTER TABLE `purchase_orders`
  MODIFY `status` ENUM(
    'DRAFT','PENDING','APPROVED','IN_TRANSIT','RECEIVING','RECEIVED','COMPLETED','CANCELLED'
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_vietnamese_ci DEFAULT 'DRAFT';

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='product_variants' AND COLUMN_NAME='requires_serial')=0,
  'ALTER TABLE `product_variants` ADD COLUMN `requires_serial` TINYINT(1) NOT NULL DEFAULT 1 COMMENT ''1=phải quét serial'' AFTER `low_stock_threshold`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='product_items' AND COLUMN_NAME='stock_lot_id')=0,
  'ALTER TABLE `product_items` ADD COLUMN `stock_lot_id` INT NULL AFTER `purchase_order_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS `stock_lots` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `lot_number` VARCHAR(50) NOT NULL,
  `purchase_order_id` INT NOT NULL,
  `receive_wave` INT NOT NULL DEFAULT 1,
  `status` ENUM('OPEN','CLOSED','RECALL') NOT NULL DEFAULT 'OPEN',
  `received_at` DATETIME NOT NULL,
  `received_by_user_id` INT DEFAULT NULL,
  `expected_quantity` INT NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lot_number` (`lot_number`),
  KEY `idx_stock_lots_po` (`purchase_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

-- =============================================================================
-- 7. KIỂM KÊ KHO
-- =============================================================================

CREATE TABLE IF NOT EXISTS `inventory_audits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `audit_code` VARCHAR(50) NOT NULL,
  `status` ENUM('DRAFT','IN_PROGRESS','COMPLETED','PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_by_user_id` INT DEFAULT NULL,
  `approved_by_user_id` INT DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT NULL,
  `notes` TEXT,
  `total_scanned` INT NOT NULL DEFAULT 0,
  `total_matched` INT NOT NULL DEFAULT 0,
  `total_missing` INT NOT NULL DEFAULT 0,
  `total_extra` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_code` (`audit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

CREATE TABLE IF NOT EXISTS `inventory_audit_lines` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `audit_id` INT NOT NULL,
  `serial_number` VARCHAR(100) NOT NULL,
  `variant_id` INT DEFAULT NULL,
  `product_item_id` INT DEFAULT NULL,
  `scan_result` ENUM('MATCH','MISSING','EXTRA') NOT NULL,
  `system_status` VARCHAR(30) DEFAULT NULL,
  `scanned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_lines_audit` (`audit_id`),
  KEY `idx_audit_lines_serial` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

CREATE TABLE IF NOT EXISTS `inventory_audit_variants` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `audit_id` INT NOT NULL,
  `variant_id` INT NOT NULL,
  `product_name` VARCHAR(255) DEFAULT NULL,
  `sku_code` VARCHAR(100) DEFAULT NULL,
  `variant_name` VARCHAR(255) DEFAULT NULL,
  `system_qty` INT NOT NULL DEFAULT 0,
  `actual_qty` INT NOT NULL DEFAULT 0,
  `variance` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_audit_variants_audit` (`audit_id`),
  KEY `idx_audit_variants_variant` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='inventory_audits' AND COLUMN_NAME='approved_by_user_id')=0,
  'ALTER TABLE `inventory_audits` ADD COLUMN `approved_by_user_id` INT NULL, ADD COLUMN `approved_at` DATETIME NULL, ADD COLUMN `rejection_reason` TEXT NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

ALTER TABLE `inventory_audits`
  MODIFY `status` ENUM(
    'DRAFT','IN_PROGRESS','COMPLETED','PENDING_APPROVAL','APPROVED','REJECTED'
  ) NOT NULL DEFAULT 'DRAFT';

-- =============================================================================
-- 8. BẢO HÀNH — luồng Sales + Kho tiếp nhận
-- =============================================================================

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='warranty_claims' AND COLUMN_NAME='video_url')=0,
  'ALTER TABLE `warranty_claims` ADD COLUMN `video_url` TEXT NULL COMMENT ''Video lỗi khách upload''', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='warranty_claims' AND COLUMN_NAME='final_resolution')=0,
  'ALTER TABLE `warranty_claims` ADD COLUMN `final_resolution` ENUM(''REPLACE'',''REPAIR_RETURN'',''REJECT'') NULL COMMENT ''Phán quyết Sales''', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='warranty_claims' AND COLUMN_NAME='contact_province')=0,
  'ALTER TABLE `warranty_claims` ADD COLUMN `contact_province` VARCHAR(100) NULL AFTER `contact_address`, ADD COLUMN `contact_district` VARCHAR(100) NULL AFTER `contact_province`, ADD COLUMN `contact_ward` VARCHAR(100) NULL AFTER `contact_district`, ADD COLUMN `pickup_to_district_id` INT NULL AFTER `contact_ward`, ADD COLUMN `pickup_to_ward_code` VARCHAR(20) NULL AFTER `pickup_to_district_id`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='warranty_claims' AND COLUMN_NAME='return_carrier')=0,
  'ALTER TABLE `warranty_claims` ADD COLUMN `return_carrier` VARCHAR(50) NULL COMMENT ''Đơn vị VC thu hồi'' AFTER `staff_notes`, ADD COLUMN `return_tracking_code` VARCHAR(100) NULL COMMENT ''Mã vận đơn thu hồi'' AFTER `return_carrier`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='warranty_claims' AND COLUMN_NAME='received_box_condition')=0,
  'ALTER TABLE `warranty_claims` ADD COLUMN `received_box_condition` VARCHAR(20) NULL COMMENT ''INTACT|DAMAGED'' AFTER `return_tracking_code`, ADD COLUMN `received_imei` VARCHAR(100) NULL AFTER `received_box_condition`, ADD COLUMN `warehouse_inbound_notes` TEXT NULL AFTER `received_imei`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- Mở rộng status warranty (Sales flow)
ALTER TABLE `warranty_claims`
  MODIFY `status` ENUM(
    'PENDING','APPROVED','REJECTED','RECEIVED','INSPECTING',
    'REPAIRING','COMPLETED','RETURNED','CANCELLED'
  ) DEFAULT 'PENDING';

SELECT 'cd_web patch Sales+Warehouse completed OK' AS migration_status;
