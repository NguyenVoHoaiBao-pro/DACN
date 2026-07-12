-- =============================================================================
-- PO + Warehouse: migration gộp, an toàn chạy nhiều lần (idempotent)
-- Database: electro_catalog_db (Aiven MySQL 8+)
--
-- Gộp từ:
--   2026-06-11_po_warehouse_receiving.sql
--   2026-06-11_po_imei_tracking.sql
--   2026-06-11_warehouse_full_usecase.sql
--
-- Cách chạy (Aiven Console / MySQL Workbench / CLI):
--   mysql -h <HOST> -P <PORT> -u <USER> -p electro_catalog_db < database/migrations/2026-06-11_po_warehouse_consolidated_safe.sql
--
-- Sau khi chạy xong: restart catalog-service, thử lại "Phê duyệt đơn hàng".
-- =============================================================================

USE electro_catalog_db;

-- ---------------------------------------------------------------------------
-- Helper: thêm cột nếu chưa tồn tại (không cần DELIMITER / stored procedure)
-- ---------------------------------------------------------------------------
SET @db = DATABASE();

-- purchase_order_items.quantity_damaged
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'quantity_damaged') = 0,
  'ALTER TABLE `purchase_order_items` ADD COLUMN `quantity_damaged` int(11) NOT NULL DEFAULT 0 AFTER `quantity_received`',
  'SELECT ''skip: purchase_order_items.quantity_damaged'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_order_items.quantity_imei_scanned
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'quantity_imei_scanned') = 0,
  'ALTER TABLE `purchase_order_items` ADD COLUMN `quantity_imei_scanned` int(11) NOT NULL DEFAULT 0 AFTER `quantity_damaged`',
  'SELECT ''skip: purchase_order_items.quantity_imei_scanned'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_orders.discrepancy_reason
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'discrepancy_reason') = 0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `discrepancy_reason` text COLLATE utf8mb4_vietnamese_ci NULL AFTER `notes`',
  'SELECT ''skip: purchase_orders.discrepancy_reason'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_orders.discrepancy_evidence
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'discrepancy_evidence') = 0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `discrepancy_evidence` mediumtext COLLATE utf8mb4_vietnamese_ci NULL AFTER `discrepancy_reason`',
  'SELECT ''skip: purchase_orders.discrepancy_evidence'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_orders.received_by_user_id
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'received_by_user_id') = 0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `received_by_user_id` int(11) NULL AFTER `user_id`',
  'SELECT ''skip: purchase_orders.received_by_user_id'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_orders.approved_by_user_id
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'approved_by_user_id') = 0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `approved_by_user_id` int(11) NULL COMMENT ''Admin duyệt PO'' AFTER `received_by_user_id`',
  'SELECT ''skip: purchase_orders.approved_by_user_id'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- purchase_orders.approved_at
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'approved_at') = 0,
  'ALTER TABLE `purchase_orders` ADD COLUMN `approved_at` datetime NULL AFTER `approved_by_user_id`',
  'SELECT ''skip: purchase_orders.approved_at'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- ENUM status: bắt buộc — sửa lỗi "Data truncated for column 'status'"
-- Chạy lại nhiều lần vẫn an toàn.
-- ---------------------------------------------------------------------------
ALTER TABLE `purchase_orders`
  MODIFY `status` enum(
    'DRAFT','PENDING','APPROVED','IN_TRANSIT','RECEIVING','RECEIVED','COMPLETED','CANCELLED'
  ) COLLATE utf8mb4_vietnamese_ci DEFAULT 'DRAFT';

-- product_variants.requires_serial
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_variants' AND COLUMN_NAME = 'requires_serial') = 0,
  'ALTER TABLE `product_variants` ADD COLUMN `requires_serial` tinyint(1) NOT NULL DEFAULT 1 COMMENT ''1=phải quét serial'' AFTER `low_stock_threshold`',
  'SELECT ''skip: product_variants.requires_serial'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- product_items.stock_lot_id
SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'product_items' AND COLUMN_NAME = 'stock_lot_id') = 0,
  'ALTER TABLE `product_items` ADD COLUMN `stock_lot_id` int(11) NULL AFTER `purchase_order_id`',
  'SELECT ''skip: product_items.stock_lot_id'' AS migration_status'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Bảng mới (CREATE IF NOT EXISTS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_lots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lot_number` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `purchase_order_id` int(11) NOT NULL,
  `receive_wave` int(11) NOT NULL DEFAULT 1,
  `status` enum('OPEN','CLOSED','RECALL') COLLATE utf8mb4_vietnamese_ci NOT NULL DEFAULT 'OPEN',
  `received_at` datetime NOT NULL,
  `received_by_user_id` int(11) DEFAULT NULL,
  `expected_quantity` int(11) NOT NULL DEFAULT 0 COMMENT 'SL tốt cần quét serial trong đợt',
  `notes` text COLLATE utf8mb4_vietnamese_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_lot_number` (`lot_number`),
  KEY `idx_stock_lots_po` (`purchase_order_id`),
  KEY `idx_stock_lots_received` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

CREATE TABLE IF NOT EXISTS `inventory_audits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `audit_code` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `status` enum('DRAFT','IN_PROGRESS','COMPLETED') COLLATE utf8mb4_vietnamese_ci NOT NULL DEFAULT 'DRAFT',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_by_user_id` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_vietnamese_ci,
  `total_scanned` int(11) NOT NULL DEFAULT 0,
  `total_matched` int(11) NOT NULL DEFAULT 0,
  `total_missing` int(11) NOT NULL DEFAULT 0,
  `total_extra` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_audit_code` (`audit_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

CREATE TABLE IF NOT EXISTS `inventory_audit_lines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `audit_id` int(11) NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `product_item_id` int(11) DEFAULT NULL,
  `scan_result` enum('MATCH','MISSING','EXTRA') COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `system_status` varchar(30) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `scanned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_lines_audit` (`audit_id`),
  KEY `idx_audit_lines_serial` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;

-- ---------------------------------------------------------------------------
-- Kiểm tra sau migration
-- ---------------------------------------------------------------------------
SELECT
  'purchase_orders.status ENUM' AS check_item,
  COLUMN_TYPE AS current_value
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'purchase_orders'
  AND COLUMN_NAME = 'status';

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME IN ('purchase_orders', 'purchase_order_items', 'product_variants', 'product_items')
  AND COLUMN_NAME IN (
    'status', 'discrepancy_reason', 'discrepancy_evidence',
    'received_by_user_id', 'approved_by_user_id', 'approved_at',
    'quantity_damaged', 'quantity_imei_scanned', 'requires_serial', 'stock_lot_id'
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME IN ('stock_lots', 'inventory_audits', 'inventory_audit_lines')
ORDER BY TABLE_NAME;
