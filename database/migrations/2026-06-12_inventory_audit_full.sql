-- Inventory audit full workflow — electro_catalog_db
USE electro_catalog_db;

CREATE TABLE IF NOT EXISTS `inventory_audit_variants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `audit_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `sku_code` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `variant_name` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `system_qty` int(11) NOT NULL DEFAULT 0,
  `actual_qty` int(11) NOT NULL DEFAULT 0,
  `variance` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_audit_variants_audit` (`audit_id`),
  KEY `idx_audit_variants_variant` (`variant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci;
