-- Ghi nhận tiếp nhận máy tại kho (nhập tay)
USE electro_order_db;

ALTER TABLE `warranty_claims`
  ADD COLUMN `received_box_condition` VARCHAR(20) NULL COMMENT 'INTACT | DAMAGED' AFTER `return_tracking_code`;

ALTER TABLE `warranty_claims`
  ADD COLUMN `received_imei` VARCHAR(100) NULL COMMENT 'IMEI thực tế khi kho nhận' AFTER `received_box_condition`;

ALTER TABLE `warranty_claims`
  ADD COLUMN `warehouse_inbound_notes` TEXT NULL COMMENT 'Ghi chú nội bộ kho khi nhận máy' AFTER `received_imei`;
