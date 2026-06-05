-- Theo dõi thu hồi máy lỗi sau khi Sales duyệt (APPROVED)
USE electro_order_db;

ALTER TABLE `warranty_claims`
  ADD COLUMN `return_carrier` VARCHAR(50) NULL COMMENT 'Đơn vị VC thu hồi (GHTK, GHN...)' AFTER `staff_notes`;

ALTER TABLE `warranty_claims`
  ADD COLUMN `return_tracking_code` VARCHAR(100) NULL COMMENT 'Mã vận đơn thu hồi' AFTER `return_carrier`;

-- Ticket đã APPROVED trước khi có cột — gán mã tra cứu mặc định
UPDATE `warranty_claims`
SET
  `return_carrier` = COALESCE(`return_carrier`, 'GHTK'),
  `return_tracking_code` = COALESCE(`return_tracking_code`, CONCAT('GHTK-', `claim_number`))
WHERE `status` IN ('APPROVED', 'RECEIVED', 'INSPECTING', 'REPAIRING', 'COMPLETED');
