-- PO warehouse receiving: damaged qty, discrepancy fields, new statuses
USE electro_catalog_db;

ALTER TABLE `purchase_order_items`
  ADD COLUMN `quantity_damaged` int(11) NOT NULL DEFAULT 0 AFTER `quantity_received`;

ALTER TABLE `purchase_orders`
  ADD COLUMN `discrepancy_reason` text COLLATE utf8mb4_vietnamese_ci NULL AFTER `notes`,
  ADD COLUMN `discrepancy_evidence` mediumtext COLLATE utf8mb4_vietnamese_ci NULL AFTER `discrepancy_reason`,
  ADD COLUMN `received_by_user_id` int(11) NULL AFTER `user_id`;

ALTER TABLE `purchase_orders`
  MODIFY `status` enum(
    'DRAFT','PENDING','APPROVED','IN_TRANSIT','RECEIVING','RECEIVED','COMPLETED','CANCELLED'
  ) COLLATE utf8mb4_vietnamese_ci DEFAULT 'DRAFT';

-- Demo data: PO chờ kho xử lý
UPDATE `purchase_orders` SET `status` = 'IN_TRANSIT' WHERE `po_number` = 'PO-2026-004';
UPDATE `purchase_orders` SET `status` = 'APPROVED' WHERE `po_number` = 'PO-2026-006';
