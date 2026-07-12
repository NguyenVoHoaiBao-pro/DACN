-- Warehouse full use case: stock lots, PO approval, serial tracking, inventory audit
USE electro_catalog_db;

-- PO approval tracking
ALTER TABLE `purchase_orders`
  ADD COLUMN `approved_by_user_id` int(11) NULL COMMENT 'Admin duyệt PO' AFTER `received_by_user_id`,
  ADD COLUMN `approved_at` datetime NULL AFTER `approved_by_user_id`;

ALTER TABLE `product_variants`
  ADD COLUMN `requires_serial` tinyint(1) NOT NULL DEFAULT 1 COMMENT '1=phải quét serial' AFTER `low_stock_threshold`;

ALTER TABLE `product_items`
  ADD COLUMN `stock_lot_id` int(11) NULL AFTER `purchase_order_id`;

-- Stock lots (mã lô / đợt giao)
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

-- Inventory audit (kiểm kê kho)
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
