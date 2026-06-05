-- Bổ sung cột cho luồng Sales bảo hành online (chạy một lần; bỏ qua nếu cột đã tồn tại)
ALTER TABLE `warranty_claims` ADD COLUMN `video_url` TEXT NULL COMMENT 'Video lỗi khách upload';
ALTER TABLE `warranty_claims` ADD COLUMN `final_resolution` ENUM('REPLACE','REPAIR_RETURN','REJECT') NULL COMMENT 'Phán quyết Sales';
