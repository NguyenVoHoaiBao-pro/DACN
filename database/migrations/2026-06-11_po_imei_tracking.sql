-- Theo dõi số IMEI đã quét theo từng dòng PO
USE electro_catalog_db;

ALTER TABLE `purchase_order_items`
  ADD COLUMN `quantity_imei_scanned` int(11) NOT NULL DEFAULT 0 AFTER `quantity_damaged`;
