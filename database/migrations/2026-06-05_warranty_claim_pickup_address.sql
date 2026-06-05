-- Địa chỉ lấy hàng thu hồi BH (form khách + GHN pickup)
USE electro_order_db;

ALTER TABLE `warranty_claims`
  ADD COLUMN `contact_province` VARCHAR(100) NULL COMMENT 'Tỉnh/TP lấy hàng' AFTER `contact_address`,
  ADD COLUMN `contact_district` VARCHAR(100) NULL COMMENT 'Quận/Huyện lấy hàng' AFTER `contact_province`,
  ADD COLUMN `contact_ward` VARCHAR(100) NULL COMMENT 'Phường/Xã lấy hàng' AFTER `contact_district`,
  ADD COLUMN `pickup_to_district_id` INT NULL COMMENT 'Mã quận GHN' AFTER `contact_ward`,
  ADD COLUMN `pickup_to_ward_code` VARCHAR(20) NULL COMMENT 'Mã phường GHN' AFTER `pickup_to_district_id`;
