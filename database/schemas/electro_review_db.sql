-- Auto-generated from electro_store_db.sql by scripts/split-database.py
-- Database: electro_review_db
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_require_primary_key = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `electro_review_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `electro_review_db`;

-- Table: review_images
CREATE TABLE `review_images` (
  `id` int(11) NOT NULL,
  `review_id` int(11) NOT NULL,
  `image_url` text COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `display_order` int(11) DEFAULT '0'
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `review_images` (`id`, `review_id`, `image_url`, `display_order`) VALUES
(1, 4, 'http://localhost:8080/img/uploads/62767d82-7cb4-4a2f-b102-d7f30c90d08c.jpg', 0),
(2, 2, 'https://cdn.example.com/reviews/img_review_03.jpg', 1),
(3, 3, 'https://cdn.example.com/reviews/img_review_04.jpg', 1),
(4, 4, 'https://cdn.example.com/reviews/img_review_05.jpg', 1),
(5, 5, 'https://cdn.example.com/reviews/img_review_06.jpg', 1),
(6, 5, 'https://cdn.example.com/reviews/img_review_07.jpg', 2);

ALTER TABLE `review_images`
  ADD KEY `review_images_review_fk` (`review_id`);

ALTER TABLE `review_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

-- --------------------------------------------------------

-- Table: reviews
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `variant_id` int(11) DEFAULT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL COMMENT 'Đánh giá từ đơn hàng nào',
  `rating` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_vietnamese_ci,
  `pros` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Ưu điểm',
  `cons` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Nhược điểm',
  `is_verified_purchase` tinyint(1) DEFAULT '0',
  `is_approved` tinyint(1) DEFAULT '0',
  `helpful_count` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `replied_at` datetime(6) DEFAULT NULL,
  `reply_content` text COLLATE utf8mb4_vietnamese_ci
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `reviews` (`id`, `product_id`, `variant_id`, `user_id`, `order_id`, `rating`, `title`, `content`, `pros`, `cons`, `is_verified_purchase`, `is_approved`, `helpful_count`, `created_at`, `updated_at`, `replied_at`, `reply_content`) VALUES
(2, 1, NULL, 1, NULL, 5, 'Đánh giá Sản Phẩm', 'Sản phẩm Vẫn Chưa Được ổn lắm nha bạn ', 'Chống nước ', 'nhanh hư', 0, 1, 0, '2026-03-17 06:14:41', '2026-03-17 07:43:26', '2026-03-17 07:43:26.275078', 'Bạn nói rõ hơn giúp mình'),
(3, 587, NULL, 1, NULL, 5, 'sơavafafavavavvava', 'vavavavavavavvavav', 'avavava', 'vavavvava', 0, 1, 0, '2026-03-17 06:36:03', '2026-03-17 07:44:30', '2026-03-17 07:43:00.049430', 'Cảm ơn bạn đã đánh giá\n'),
(4, 6, NULL, 1, 51, 5, 'Sản Phẩm hơi lỏ ', 'Nhưng mà tôi vẫn chưa thích lắm nha bạn ', 'Chống nức', 'nhanh hử', 1, 1, 0, '2026-03-17 07:55:35', '2026-03-17 07:56:12', NULL, NULL),
(5, 1, NULL, 1, 3, 5, 'Củ sạc Anker 20W – nhỏ mà sạc siêu nhanh', 'Đang dùng cho iPhone 14, sạc từ 0-80% chỉ mất khoảng 45 phút. Size nhỏ hơn củ sạc Apple đi kèm rất nhiều mà công suất lại mạnh hơn. Không nóng sau 1 giờ sạc liên tục.', 'Nhỏ gọn, sạc nhanh PD 20W, không nóng, giá hợp lý', 'Chỉ 1 cổng USB-C, dây sạc không đi kèm', 1, 1, 14, '2026-02-20 09:00:00', '2026-02-20 09:00:00', NULL, NULL),
(6, 5, NULL, 1, 4, 5, 'Cáp Lightning MFI Anker – bền vượt trội so với cáp Apple gốc', 'Mình đã dùng qua cáp Apple gốc, chỉ 3 tháng là bong tróc đầu cắm. Cáp Anker Powerline II Nylon này dùng gần 6 tháng vẫn như mới. Sạc ổn định, truyền dữ liệu không bị ngắt.', 'Bền, vỏ Nylon chắc chắn, MFI chuẩn Apple, sạc ổn định', 'Giá nhỉnh hơn cáp thường nhưng xứng đáng', 1, 1, 9, '2026-02-25 10:00:00', '2026-02-25 10:00:00', NULL, NULL),
(7, 17, NULL, 1, 5, 4, 'Pin sạc MagSafe Anker tiện lợi cho người dùng iPhone', 'Tính năng hút nam châm MagSafe rất tiện khi vừa làm việc vừa sạc. Không cần cắm dây, chỉ úp lưng là sạc ngay. Tuy nhiên công suất 15W không ấn tượng bằng sạc có dây.', 'MagSafe chuẩn, nam châm mạnh, thiết kế mỏng đẹp', 'Giá khá cao, sạc không dây chậm hơn có dây', 1, 1, 6, '2026-03-01 08:30:00', '2026-03-01 08:30:00', NULL, NULL),
(8, 106, 17, 1, 6, 5, 'Sản phẩm xuất sắc, hoàn toàn hài lòng', 'Đặt hàng chiều hôm nay giao sáng hôm sau, đóng gói kỹ càng. Sản phẩm hoạt động tốt ngay từ đầu, đúng với mô tả. Nhân viên hỗ trợ nhiệt tình tư vấn trước khi mua.', 'Chất lượng cao, giao hàng nhanh, đóng gói cẩn thận', 'Không có điểm trừ', 1, 1, 4, '2026-03-10 11:00:00', '2026-03-10 11:00:00', NULL, NULL),
(9, 18, NULL, 1, 9, 5, 'Pin dự phòng 10000mAh sạc 30W – vũ khí du lịch không thể thiếu', 'Vừa dùng trong chuyến đi Đà Lạt 3 ngày không cần tìm ổ điện. Sạc điện thoại Android 3 lần đầy, iPad được khoảng 1.5 lần. Tốc độ 30W thực tế rất ấn tượng so với pin thương hiệu khác', 'Dung lượng thật, sạc nhanh 30W thực tế, nhỏ gọn bỏ túi', 'Thời gian sạc đầy bản thân pin mất khoảng 3 tiếng', 1, 1, 11, '2026-03-15 14:00:00', '2026-03-15 14:00:00', NULL, NULL),
(10, 109, 26, 2, 7, 4, 'Hàng chính hãng, chất lượng xứng đáng với giá tiền', 'Sản phẩm nhận đúng mô tả, đóng hộp nguyên seal chưa bóc. Dùng được 1 tuần thấy hoạt động ổn định. Chỉ tiếc giao hàng hơi trễ hơn dự kiến 1 ngày.', 'Hàng chính hãng, seal nguyên, chất lượng tốt', 'Giao trễ hơn dự kiến 1 ngày', 1, 1, 3, '2026-03-20 09:00:00', '2026-03-20 09:00:00', NULL, NULL),
(11, 110, 29, 3, 8, 3, 'Dùng tạm ổn nhưng pin tụt hơi nhanh', 'Chức năng đủ dùng cho công việc cơ bản. Build quality ổn nhưng pin sau 8 tiếng dùng văn phòng đã còn 15%. Kỳ vọng được nhiều hơn ở mức giá này. Phần mềm đôi khi giật lag.', 'Đủ tính năng cơ bản, giá cạnh tranh trong phân khúc', 'Pin tụt nhanh, phần mềm đôi khi lag', 1, 1, 2, '2026-03-25 16:00:00', '2026-03-25 16:00:00', NULL, NULL),
(12, 9, NULL, 1, 10, 5, 'Cáp Type-C Anker 322 – giá mềm, chất lượng cứng', 'Dùng cáp này cắm vào MacBook Pro và Galaxy S24, sạc nhanh ổn định 60W. Sợi cáp mềm dễ cuộn, không bị cứng hay gãy gập. Mua thêm 2 cái dự phòng cho gia đình.', 'Giá rẻ, sạc 60W ổn định, dây mềm, đầu cắm vừa vặn', 'Không có điểm trừ đáng kể', 1, 1, 7, '2026-03-28 10:00:00', '2026-03-28 10:00:00', NULL, NULL);

ALTER TABLE `reviews`
  ADD KEY `reviews_product_fk` (`product_id`),
  ADD KEY `reviews_variant_fk` (`variant_id`),
  ADD KEY `reviews_user_fk` (`user_id`),
  ADD KEY `reviews_order_fk` (`order_id`);

ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;
SET FOREIGN_KEY_CHECKS = 1;
