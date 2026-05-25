-- Auto-generated from electro_store_db.sql by scripts/split-database.py
-- Database: electro_order_db
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_require_primary_key = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `electro_order_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `electro_order_db`;

-- Table: coupons
CREATE TABLE `coupons` (
  `id` int(11) NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Mô tả điều kiện áp dụng',
  `discount_type` enum('PERCENT','FIXED') COLLATE utf8mb4_vietnamese_ci DEFAULT 'PERCENT',
  `discount_value` decimal(10,2) NOT NULL,
  `min_order_value` decimal(15,2) DEFAULT '0.00',
  `max_discount_amount` decimal(15,2) DEFAULT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `used_count` int(11) DEFAULT '0',
  `date_start` datetime NOT NULL,
  `date_end` datetime NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int(11) DEFAULT NULL COMMENT 'Admin tạo mã',
  `updated_by` int(11) DEFAULT NULL COMMENT 'Admin sửa lần cuối',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `coupons` (`id`, `code`, `name`, `description`, `discount_type`, `discount_value`, `min_order_value`, `max_discount_amount`, `usage_limit`, `used_count`, `date_start`, `date_end`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 'SALE10', 'Giảm 10%', 'Giảm 10% cho đơn từ 500k, tối đa giảm 200k', 'PERCENT', 10.00, 500000.00, 200000.00, 100, 5, '2025-01-01 00:00:00', '2027-12-31 23:59:59', 1, NULL, NULL, '2026-03-03 11:20:29', '2026-03-18 03:58:54'),
(2, 'GIAM50K', 'Giảm 50.000đ', 'Giảm thẳng 50k cho đơn từ 300k', 'FIXED', 50000.00, 300000.00, NULL, 200, 0, '2025-01-01 00:00:00', '2027-12-31 23:59:59', 1, NULL, NULL, '2026-03-03 11:20:29', '2026-03-17 03:06:26'),
(3, 'MEGA20', 'Mega Sale 20%', 'Giảm 20% không giới hạn cho đơn từ 1 triệu', 'PERCENT', 20.00, 1000000.00, NULL, 50, 0, '2025-01-01 00:00:00', '2027-12-31 23:59:59', 1, NULL, NULL, '2026-03-03 11:20:29', '2026-03-03 11:20:29'),
(4, 'WELCOME', 'Chào mừng thành viên mới', 'Giảm 100k cho thành viên mới', 'FIXED', 100000.00, 0.00, NULL, 1000, 0, '2025-01-01 00:00:00', '2027-12-31 23:59:59', 1, NULL, NULL, '2026-03-03 11:20:29', '2026-03-03 11:20:29'),
(5, 'EXPIRED', 'Mã đã hết hạn', 'Test mã hết hạn', 'PERCENT', 15.00, 0.00, NULL, 100, 0, '2024-01-01 00:00:00', '2024-12-31 23:59:59', 1, NULL, NULL, '2026-03-03 11:20:29', '2026-03-03 11:20:29'),
(6, 'GIAM10PT', 'Tên Coupon Đã Cập Nhật', 'Giảm 10% cho tất cả đơn hàng từ 1 triệu, tối đa 200k', 'PERCENT', 10.00, 1000000.00, 200000.00, 200, 0, '2026-02-28 17:00:00', '2026-12-31 16:59:59', 1, NULL, NULL, '2026-03-17 02:41:16', '2026-03-17 03:06:20');

ALTER TABLE `coupons`
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `coupon_created_by_fk` (`created_by`),
  ADD KEY `coupon_updated_by_fk` (`updated_by`);

ALTER TABLE `coupons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

-- --------------------------------------------------------

-- Table: order_details
CREATE TABLE `order_details` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_vietnamese_ci NOT NULL COMMENT 'Lưu tên tại thời điểm mua',
  `variant_name` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `sku_code` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL COMMENT 'Giá tại thời điểm mua',
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `total_price` decimal(15,2) NOT NULL,
  `warranty_months` int(11) DEFAULT '12',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `order_details` (`id`, `order_id`, `variant_id`, `product_name`, `variant_name`, `sku_code`, `quantity`, `unit_price`, `discount_amount`, `total_price`, `warranty_months`, `created_at`) VALUES
(1, 1, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-03 04:31:31'),
(2, 1, 18, 'Apple macbook-air-15-inch-m2-2023-', '16GB', 'LAP-APP-60299-16GB', 1, 19391756.00, 0.00, 19391756.00, 12, '2026-03-03 04:31:32'),
(3, 2, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-03 04:33:46'),
(4, 3, 116, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Mặc Định', 'STD-2-DEF', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-03 07:20:45'),
(5, 3, 117, 'Adapter Sạc Type C PD PIQ 3.0 GaN II 30W Anker 313 A2639', 'Mặc Định', 'STD-3-DEF', 1, 350000.00, 0.00, 350000.00, 12, '2026-03-03 07:20:45'),
(6, 4, 118, 'Adapter sạc 2 cổng USB 12W Anker PowerPort Elite 2 A2023', 'Mặc Định', 'STD-4-DEF', 1, 190000.00, 0.00, 190000.00, 12, '2026-03-03 07:22:18'),
(7, 5, 116, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Mặc Định', 'STD-2-DEF', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-03 07:33:13'),
(8, 6, 118, 'Adapter sạc 2 cổng USB 12W Anker PowerPort Elite 2 A2023', 'Mặc Định', 'STD-4-DEF', 1, 190000.00, 0.00, 190000.00, 12, '2026-03-03 07:36:09'),
(9, 7, 116, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Mặc Định', 'STD-2-DEF', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-03 07:43:35'),
(10, 8, 116, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Mặc Định', 'STD-2-DEF', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-04 10:07:16'),
(11, 9, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-09 03:45:31'),
(12, 10, 272, 'Google Tivi COOCAA HD 32 inch 2025 32z85 Tra Gop 0 3 790 000d 5 690 00', 'Đen', 'STV-193-DEF', 1, 23748000.00, 0.00, 23748000.00, 12, '2026-03-09 03:47:28'),
(13, 11, 754, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Trắng', 'SKU-W-83BD1098', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-09 04:31:38'),
(14, 11, 912, 'Apple Mac Studio M4 Max 2025 36GB 512GB', 'Trắng', 'SKU-W-DD562A90', 1, 29110000.00, 0.00, 29110000.00, 12, '2026-03-09 04:31:38'),
(15, 12, 196, 'iPad A16 Gen 11 5G 256GB', '256GB', 'TAB-119-256GB', 1, 9912000.00, 0.00, 9912000.00, 12, '2026-03-09 04:32:37'),
(16, 12, 1005, 'Man Hinh Thong Minh LG Stand By Me 2 27 inch 2025 27lx6tdga Giao Nhanh', 'Bạc', 'SKU-S-26510982', 1, 18560850.00, 0.00, 18560850.00, 12, '2026-03-09 04:32:37'),
(31, 20, 200, 'iPad Air M3 11 inch 512GB WiFi', '512GB', 'TAB-123-512GB', 1, 22012000.00, 0.00, 22012000.00, 12, '2026-03-09 05:20:43'),
(32, 20, 121, 'Cáp Type C - Lightning MFI 0.9m Anker 322 A81B5', 'Đen', 'STD-7-DEF', 1, 200000.00, 0.00, 200000.00, 12, '2026-03-09 05:20:43'),
(33, 20, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:20:43'),
(38, 25, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 2, 16891756.00, 0.00, 33783512.00, 12, '2026-03-09 05:34:30'),
(40, 27, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 2, 250000.00, 0.00, 500000.00, 12, '2026-03-09 05:36:16'),
(41, 28, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 2, 16891756.00, 0.00, 33783512.00, 12, '2026-03-09 05:38:31'),
(42, 29, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:38:37'),
(43, 30, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:41:30'),
(44, 31, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:48:55'),
(45, 32, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:49:04'),
(46, 33, 17, 'Apple macbook-air-15-inch-m2-2023-', '8GB', 'LAP-APP-62255-8GB', 1, 16891756.00, 0.00, 16891756.00, 12, '2026-03-09 05:49:16'),
(47, 34, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-09 06:56:05'),
(48, 35, 990, 'Google Tivi COOCAA HD 32 inch 2025 32z85 Tra Gop 0 3 790 000d 5 690 00', 'Trắng', 'SKU-W-78E98B0F', 1, 23748000.00, 0.00, 23748000.00, 12, '2026-03-09 07:14:40'),
(49, 36, 116, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Đen', 'STD-2-DEF', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-09 07:21:45'),
(50, 37, 755, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Bạc', 'SKU-S-F558317A', 1, 409500.00, 0.00, 409500.00, 12, '2026-03-09 07:25:33'),
(51, 38, 754, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Trắng', 'SKU-W-83BD1098', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-09 07:46:41'),
(52, 39, 18, 'Apple macbook-air-15-inch-m2-2023-', '16GB', 'LAP-APP-60299-16GB', 1, 19391756.00, 0.00, 19391756.00, 12, '2026-03-09 11:26:05'),
(53, 39, 764, 'Cáp Type C - Lightning MFI 0.9m Anker 322 A81B5', 'Trắng', 'SKU-W-53ED3C33', 1, 200000.00, 0.00, 200000.00, 12, '2026-03-09 11:26:05'),
(54, 40, 754, 'Adapter Sạc Type C PD GaN 30W Anker Nano 3 A2147', 'Trắng', 'SKU-W-83BD1098', 1, 390000.00, 0.00, 390000.00, 12, '2026-03-11 09:31:58'),
(55, 41, 752, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Trắng', 'SKU-W-AF067807', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-11 12:58:28'),
(56, 42, 912, 'Apple Mac Studio M4 Max 2025 36GB 512GB', 'Trắng', 'SKU-W-DD562A90', 1, 29110000.00, 0.00, 29110000.00, 12, '2026-03-11 13:42:34'),
(57, 43, 1693, 'Đồng hồ Thông minh', 'Mặc định', 'SKU-E37A8CC5', 2, 10490000.00, 0.00, 20980000.00, 12, '2026-03-14 04:59:13'),
(58, 43, 1697, 'Đồng hồ Thông minh', 'Titan Tự Nhiên', 'SW-TITAN-NATURAL-001', 1, 8990000.00, 0.00, 8990000.00, 12, '2026-03-14 04:59:13'),
(59, 44, 1699, 'Đồng hồ Thông minh', 'Trắng', 'SW-GLD-ML41-004', 1, 3690000.00, 0.00, 3690000.00, 12, '2026-03-15 08:00:38'),
(60, 45, 834, 'Loa Bluetooth JBL Partybox 110', 'Trắng', 'SKU-W-39325A03', 1, 7990000.00, 0.00, 7990000.00, 12, '2026-03-15 08:18:44'),
(61, 46, 441, 'Vga ASUS Dual Radeon RX 7700 Xt OC 12GB GDDR6', 'Đen', 'CMP-362-DEF', 1, 11569000.00, 0.00, 11569000.00, 12, '2026-03-16 12:52:13'),
(62, 47, 1699, 'Đồng hồ Thông minh', 'Trắng', 'SW-GLD-ML41-004', 1, 3690000.00, 0.00, 3690000.00, 12, '2026-03-16 13:48:52'),
(63, 48, 1693, 'Đồng hồ Thông minh', 'Mặc định', 'SKU-E37A8CC5', 1, 10490000.00, 0.00, 10490000.00, 12, '2026-03-17 03:25:19'),
(64, 49, 1693, 'Đồng hồ Thông minh', 'Mặc định', 'SKU-E37A8CC5', 1, 10490000.00, 0.00, 10490000.00, 12, '2026-03-17 03:31:46'),
(65, 50, 1693, 'Đồng hồ Thông minh', 'Mặc định', 'SKU-E37A8CC5', 1, 10490000.00, 0.00, 10490000.00, 12, '2026-03-17 05:59:16'),
(66, 51, 120, 'Cáp Micro USB 0.9m Anker PowerLine+ A8142', 'Đen', 'STD-6-DEF', 1, 120000.00, 0.00, 120000.00, 12, '2026-03-17 07:53:46'),
(67, 52, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 2, 250000.00, 0.00, 500000.00, 12, '2026-03-18 03:58:54'),
(68, 53, 120, 'Cáp Micro USB 0.9m Anker PowerLine+ A8142', 'Đen', 'STD-6-DEF', 1, 120000.00, 0.00, 120000.00, 12, '2026-03-18 04:08:39'),
(69, 54, 121, 'Cáp Type C - Lightning MFI 0.9m Anker 322 A81B5', 'Đen', 'STD-7-DEF', 1, 200000.00, 0.00, 200000.00, 12, '2026-03-18 04:09:20'),
(70, 55, 122, 'Cáp Type C - Lightning MFI 0.9m Anker PowerLine+ II A8652', 'Đen', 'STD-8-DEF', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-18 04:09:52'),
(71, 56, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-18 06:50:15'),
(72, 57, 115, 'Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633', 'Đen', 'STD-1-DEF', 1, 250000.00, 0.00, 250000.00, 12, '2026-03-18 06:54:51'),
(73, 58, 118, 'Adapter sạc 2 cổng USB 12W Anker PowerPort Elite 2 A2023', 'Đen', 'STD-4-DEF', 1, 190000.00, 0.00, 190000.00, 12, '2026-03-23 08:02:25'),
(74, 59, 118, 'Adapter sạc 2 cổng USB 12W Anker PowerPort Elite 2 A2023', 'Đen', 'STD-4-DEF', 1, 190000.00, 0.00, 190000.00, 12, '2026-03-24 13:36:42'),
(75, 60, 1693, 'Đồng hồ Thông minh', 'Mặc định', 'SKU-E37A8CC5', 1, 10490000.00, 0.00, 10490000.00, 12, '2026-03-27 06:02:20'),
(76, 61, 118, 'Adapter sạc 2 cổng USB 12W Anker PowerPort Elite 2 A2023', 'Đen', 'STD-4-DEF', 1, 190000.00, 0.00, 190000.00, 12, '2026-03-27 06:03:40');

ALTER TABLE `order_details`
  ADD KEY `order_details_orders_id_fk` (`order_id`),
  ADD KEY `order_details_variants_id_fk` (`variant_id`);

ALTER TABLE `order_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=77;

-- --------------------------------------------------------

-- Table: order_item_serials
CREATE TABLE `order_item_serials` (
  `id` int(11) NOT NULL,
  `order_detail_id` int(11) NOT NULL,
  `product_item_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `order_item_serials` (`id`, `order_detail_id`, `product_item_id`, `created_at`) VALUES
(1, 57, 7, '2026-03-14 12:41:18'),
(2, 57, 8, '2026-03-14 12:41:35');

ALTER TABLE `order_item_serials`
  ADD UNIQUE KEY `order_item_unique` (`order_detail_id`,`product_item_id`),
  ADD KEY `ois_order_detail_fk` (`order_detail_id`),
  ADD KEY `ois_product_item_fk` (`product_item_id`);

ALTER TABLE `order_item_serials`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

-- --------------------------------------------------------

-- Table: orders
CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `order_code` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL COMMENT 'Mã đơn hàng',
  `user_id` int(11) NOT NULL,
  `user_address_id` int(11) DEFAULT NULL COMMENT 'Địa chỉ giao hàng từ sổ địa chỉ',
  `shipping_name` varchar(255) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `shipping_phone` varchar(20) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `shipping_address` varchar(500) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `shipping_province` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `shipping_district` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `shipping_ward` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `shipping_method_id` int(11) DEFAULT NULL COMMENT 'Phương thức vận chuyển',
  `shipping_fee` decimal(15,2) DEFAULT '0.00',
  `tracking_code` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL COMMENT 'Mã vận đơn GHN',
  `subtotal` decimal(15,2) NOT NULL COMMENT 'Tổng tiền hàng',
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL COMMENT 'Tổng thanh toán',
  `coupon_id` int(11) DEFAULT NULL,
  `coupon_code` varchar(50) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `status` enum('PENDING','CONFIRMED','PROCESSING','SHIPPING','DELIVERED','COMPLETED','CANCELLED','REFUNDED') COLLATE utf8mb4_vietnamese_ci NOT NULL DEFAULT 'PENDING',
  `payment_method` enum('COD','BANK_TRANSFER','MOMO','VNPAY','ZALOPAY') COLLATE utf8mb4_vietnamese_ci NOT NULL DEFAULT 'COD',
  `payment_status` enum('PENDING','PAID','FAILED','REFUNDED') COLLATE utf8mb4_vietnamese_ci DEFAULT 'PENDING',
  `note` text COLLATE utf8mb4_vietnamese_ci,
  `admin_note` text COLLATE utf8mb4_vietnamese_ci,
  `order_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` datetime DEFAULT NULL,
  `shipped_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancel_reason` text COLLATE utf8mb4_vietnamese_ci,
  `paid_at` datetime(6) DEFAULT NULL,
  `payment_url` varchar(1000) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `transaction_ref` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `hidden_at` datetime(6) DEFAULT NULL,
  `hidden_reason` text COLLATE utf8mb4_vietnamese_ci,
  `is_hidden` bit(1) NOT NULL,
  `ghn_order_code` varchar(50) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `to_district_id` int(11) DEFAULT NULL,
  `to_ward_code` varchar(20) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `orders` (`id`, `order_code`, `user_id`, `user_address_id`, `shipping_name`, `shipping_phone`, `shipping_address`, `shipping_province`, `shipping_district`, `shipping_ward`, `shipping_method_id`, `shipping_fee`, `tracking_code`, `subtotal`, `discount_amount`, `total_amount`, `coupon_id`, `coupon_code`, `status`, `payment_method`, `payment_status`, `note`, `admin_note`, `order_date`, `confirmed_at`, `shipped_at`, `delivered_at`, `cancelled_at`, `cancel_reason`, `paid_at`, `payment_url`, `transaction_ref`, `hidden_at`, `hidden_reason`, `is_hidden`, `ghn_order_code`, `to_district_id`, `to_ward_code`) VALUES
(1, 'ORD-20260303113131474', 10542, 1, 'Nguyễn Văn Test', '0909000001', '123 Đường Lê Lợi', 'TP. Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 0.00, NULL, 36283512.00, 0.00, 36283512.00, NULL, NULL, 'CANCELLED', 'COD', 'PENDING', 'Giao giờ hành chính', NULL, '2026-03-03 04:31:31', NULL, NULL, NULL, '2026-03-03 04:54:51', 'Tôi muốn đổi sản phẩm khác', NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(2, 'ORD-20260303113346256', 10542, NULL, 'Trần Thị B', '0902222222', '456 Đường Nguyễn Huệ', 'TP. Hồ Chí Minh', 'Quận 3', 'Phường 6', NULL, 0.00, NULL, 16891756.00, 0.00, 16891756.00, NULL, NULL, 'DELIVERED', 'BANK_TRANSFER', 'PENDING', 'Chuyển khoản trước', NULL, '2026-03-03 04:33:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(3, 'ORD-20260303142045047', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', 'Ninh Phước', NULL, 0.00, NULL, 740000.00, 0.00, 740000.00, NULL, NULL, 'CANCELLED', 'COD', 'PENDING', NULL, NULL, '2026-03-03 07:20:45', NULL, NULL, NULL, '2026-03-03 07:46:39', NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(4, 'ORD-20260303142218172', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', 'Ninh Phước', NULL, 30000.00, NULL, 190000.00, 0.00, 220000.00, NULL, NULL, 'CANCELLED', 'COD', 'PENDING', 'giao ở trước nhà bà 6 giúp tôi nha bạn', NULL, '2026-03-03 07:22:18', NULL, NULL, NULL, '2026-03-03 07:46:41', NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(5, 'ORD-20260303143313457', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', 'Ninh Phước', NULL, 30000.00, NULL, 390000.00, 0.00, 420000.00, NULL, NULL, 'COMPLETED', 'COD', 'PENDING', 'giao ở nhà bà tư', '', '2026-03-03 07:33:13', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(6, 'ORD-20260303143609253', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', 'Ninh Phước', NULL, 30000.00, NULL, 190000.00, 0.00, 220000.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', 'giao ở nhà bà 4 nha bạn', NULL, '2026-03-03 07:36:09', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(7, 'ORD-20260303144334619', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', NULL, NULL, 30000.00, NULL, 390000.00, 0.00, 420000.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-03 07:43:35', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(8, 'ORD-20260304170715599', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Thành Phố Phan Rang - Tháp Chàm - Tỉnh Ninh Thuận', 'không', 'Ninh Phước', NULL, 30000.00, NULL, 390000.00, 0.00, 420000.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-04 10:07:16', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(9, 'ORD-20260309104531414', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 250000.00, 0.00, 281501.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', 'nhớ giao đúng địa chỉ nha bạn', NULL, '2026-03-09 03:45:31', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(10, 'ORD-20260309104728043', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 23748000.00, 0.00, 23779501.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-09 03:47:28', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(11, 'ORD-20260309113137515', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 29500000.00, 0.00, 29531501.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', 'giao hàng tới đúng địa chỉ', NULL, '2026-03-09 04:31:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(12, 'ORD-20260309113236509', 1, NULL, 'Nguyễn Văn Test COD', '0901234567', '123 Lê Lợi, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 28472850.00, 0.00, 28493851.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-09 04:32:37', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(20, 'ORD-20260309122042540', 1, NULL, 'Nguyễn Văn Test COD', '0901234567', '123 Lê Lợi, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 39103756.00, 0.00, 39124757.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-09 05:20:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(25, 'ORD-20260309123430249', 1, NULL, 'Nguyễn Văn Test COD', '0901234567', '123 Lê Lợi, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 33783512.00, 0.00, 33804513.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-09 05:34:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(27, 'ORD-20260309123615664', 10539, NULL, 'Nguyễn Văn Test VNPAY', '0909876543', '456 Nguyễn Huệ, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 500000.00, 0.00, 521001.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 05:36:16', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=52100100&vnp_Command=pay&vnp_CreateDate=20260309123615&vnp_CurrCode=VND&vnp_ExpireDate=20260309125115&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309123615664&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309123615664_1773034575686&vnp_Version=2.1.0&vnp_SecureHash=43ea961dc0b17bd3de8e541642792e524a80794dad83a65c57d45aad22e0f0944ac55969dfc27e93e975be946cb6d9bc4beeca7cad1cc33cc5635cfe960af4f7', 'ORD-20260309123615664_1773034575686', NULL, NULL, b'0', NULL, NULL, NULL),
(28, 'ORD-20260309123831210', 1, NULL, 'Nguyễn Văn Test COD', '0901234567', '123 Lê Lợi, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 33783512.00, 0.00, 33804513.00, NULL, NULL, 'CONFIRMED', 'COD', 'PAID', NULL, '', '2026-03-09 05:38:31', '2026-03-11 13:44:17', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(29, 'ORD-20260309123837010', 1, NULL, 'Nguyễn Văn Test VNPAY', '0909876543', '456 Nguyễn Huệ, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 16891756.00, 0.00, 16912757.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 05:38:37', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1691275700&vnp_Command=pay&vnp_CreateDate=20260309123837&vnp_CurrCode=VND&vnp_ExpireDate=20260309125337&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309123837010&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309123837010_1773034717029&vnp_Version=2.1.0&vnp_SecureHash=7c066a765ec05125879cd194003ba6d1d27d51e6e969de53ccbc8e799a74badf8696e44ef8dbb2f7c3b311b3abe9f9f6adf98cc85852284212f4632dedd7dd6d', 'ORD-20260309123837010_1773034717029', NULL, NULL, b'0', NULL, NULL, NULL),
(30, 'ORD-20260309124129558', 1, NULL, 'Nguyễn Văn Coupon', '0912345678', '789 Đồng Khởi', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 16891756.00, 200000.00, 16712757.00, 1, 'SALE10', 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 05:41:30', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_Command=pay&vnp_CreateDate=20260309124129&vnp_CurrCode=VND&vnp_ExpireDate=20260309125629&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124129558&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124129558_1773034889575&vnp_Version=2.1.0&vnp_SecureHash=4ce18d1095bf315167368bfc3061dc79bb1316b1ce965ca83d0c3bc4e7567dfad9f800f770536dc1d3123101a8ad566629a6bea9dcd7951c50076ddfe72f0911', 'ORD-20260309124129558_1773034889575', NULL, NULL, b'0', NULL, NULL, NULL),
(31, 'ORD-20260309124855134', 1, NULL, 'Nguyễn Văn Test COD', '0901234567', '123 Lê Lợi, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 16891756.00, 0.00, 16912757.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-09 05:48:55', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 12:11:11.018151', 'Ẩn theo yêu cầu Admin', b'1', NULL, NULL, NULL),
(32, 'ORD-20260309124903603', 1, NULL, 'Nguyễn Văn Test VNPAY', '0909876543', '456 Nguyễn Huệ, Quận 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 16891756.00, 0.00, 16912757.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 05:49:04', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1691275700&vnp_Command=pay&vnp_CreateDate=20260309124903&vnp_CurrCode=VND&vnp_ExpireDate=20260309130403&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124903603&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124903603_1773035343622&vnp_Version=2.1.0&vnp_SecureHash=852052a9590c6d7298282d9aa602a585fa9d38212015b6d1d757b4ab183f2c7843f2836648797d713f13e42f78efd4933854f921cc3797058eaf69ebc3db12e2', 'ORD-20260309124903603_1773035343622', '2026-03-09 12:11:14.329653', 'Ẩn theo yêu cầu Admin', b'1', NULL, NULL, NULL),
(33, 'ORD-20260309124916158', 1, NULL, 'Nguyễn Văn Coupon', '0912345678', '789 Đồng Khởi', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 16891756.00, 200000.00, 16712757.00, 1, 'SALE10', 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 05:49:16', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_BankCode=NCB&vnp_Command=pay&vnp_CreateDate=20260309125847&vnp_CurrCode=VND&vnp_ExpireDate=20260309131347&vnp_IpAddr=0%3A0%3A0%3A0%3A0%3A0%3A0%3A1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124916158&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124916158_1773035927296&vnp_Version=2.1.0&vnp_SecureHash=44fafe5c4c7a666529b0c051e8ee8649d13e8bcd58864f5e6563da799c15893653041827d275f46ac2a6c6f6161e2910025b258cad8ab07d5db7ced0ed1dd01c', 'ORD-20260309124916158_1773035927296', NULL, NULL, b'0', NULL, NULL, NULL),
(34, 'ORD-20260309135605318', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 250000.00, 0.00, 281501.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', 'giao đúng ngày nha bạn', NULL, '2026-03-09 06:56:05', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=28150100&vnp_Command=pay&vnp_CreateDate=20260309135605&vnp_CurrCode=VND&vnp_ExpireDate=20260309141105&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309135605318&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309135605318_1773039365370&vnp_Version=2.1.0&vnp_SecureHash=7385474b39e1d5a60216ec24b386997251239e43226318db3c30953710f1feb1ae7c1b50b153bc5076597206c61d1211fbdc703c7f3c7ff83075a1c4e9056242', 'ORD-20260309135605318_1773039365370', NULL, NULL, b'0', NULL, NULL, NULL),
(35, 'ORD-20260309141440328', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 23748000.00, 0.00, 23779501.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 07:14:40', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=2377950100&vnp_Command=pay&vnp_CreateDate=20260309141440&vnp_CurrCode=VND&vnp_ExpireDate=20260309142940&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309141440328&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309141440328_1773040480382&vnp_Version=2.1.0&vnp_SecureHash=b92cbb9c52b7dbfd4cf3f43da7b2d67dff33e6b21484fe6e74a2045442ac37565547d6772cb0f7f992d7980ad105e2a4d8a3d3d58abe7fc71221532d24b6f257', 'ORD-20260309141440328_1773040480382', '2026-03-09 12:11:09.586898', 'Ẩn theo yêu cầu Admin', b'1', NULL, NULL, NULL),
(36, 'ORD-20260309142144984', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 390000.00, 0.00, 421501.00, NULL, NULL, 'PENDING', 'VNPAY', 'PENDING', NULL, NULL, '2026-03-09 07:21:45', NULL, NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260309142145&vnp_CurrCode=VND&vnp_ExpireDate=20260309143645&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309142144984&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309142144984_1773040905031&vnp_Version=2.1.0&vnp_SecureHash=0a968cc072323958639549cc63ced086666746857b70c235935c3b867fa1128bf19f7c69e37f20b997abad4753af84c4eacfd6fc30eddbcc1f10a4e7828781d6', 'ORD-20260309142144984_1773040905031', '2026-03-09 12:11:07.715889', 'Ẩn theo yêu cầu Admin', b'1', NULL, NULL, NULL),
(37, 'ORD-20260309142532518', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 409500.00, 0.00, 441001.00, NULL, NULL, 'PENDING', 'VNPAY', 'PAID', NULL, NULL, '2026-03-09 07:25:33', NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:27:37.244538', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=44100100&vnp_Command=pay&vnp_CreateDate=20260309142532&vnp_CurrCode=VND&vnp_ExpireDate=20260309144032&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309142532518&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309142532518_1773041132563&vnp_Version=2.1.0&vnp_SecureHash=ed5770b10be4de64376195a5df04679c835a3b3f517300668f214ba70d11bfa2180419978a3913eb474a24ff5d3ba8be527d9b51325c09aea8a86a9c8d5ac127', 'ORD-20260309142532518_1773041132563', NULL, NULL, b'0', NULL, NULL, NULL),
(38, 'ORD-20260309144640714', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 390000.00, 0.00, 421501.00, NULL, NULL, 'PENDING', 'VNPAY', 'PAID', NULL, NULL, '2026-03-09 07:46:41', NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:47:35.149237', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260309144640&vnp_CurrCode=VND&vnp_ExpireDate=20260309150140&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309144640714&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309144640714_1773042400763&vnp_Version=2.1.0&vnp_SecureHash=7c3aa62ceb7376b911410227efbaec76c17b7253040893d71188756df0ec66183c9fe1e81a92657d391199efe23880c421961fb2f8edd4176edef680069c3d6b', 'ORD-20260309144640714_1773042400763', NULL, NULL, b'0', NULL, NULL, NULL),
(39, 'ORD-20260309182604985', 1, NULL, 'Nguyễn Văn A', '0987654321', '123 Đường Số 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 19591756.00, 0.00, 19612757.00, NULL, NULL, 'CANCELLED', 'COD', 'PAID', 'Giao hàng giờ hành chính', NULL, '2026-03-09 11:26:05', NULL, NULL, NULL, '2026-03-09 11:26:37', 'Đổi ý không muốn mua nữa', NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(40, 'ORD-20260311163157785', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 31501.00, NULL, 390000.00, 0.00, 421501.00, NULL, NULL, 'CONFIRMED', 'VNPAY', 'PAID', NULL, '', '2026-03-11 09:31:58', '2026-03-14 13:31:48', NULL, NULL, NULL, NULL, '2026-03-11 09:33:42.924136', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260311163157&vnp_CurrCode=VND&vnp_ExpireDate=20260311164657&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260311163157785&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260311163157785_1773221517878&vnp_Version=2.1.0&vnp_SecureHash=e7e6178f2ee345a6ab18ef387afe1a361e3558ed891d8e0ed5654ad88313cea5c1a63bc1d94ba99183abd68a9c00d6543a8d981b82ab2a256e0bdb6964ade28f', 'ORD-20260311163157785_1773221517878', NULL, NULL, b'0', NULL, NULL, NULL),
(41, 'ORD-20260311195827917', 1, NULL, 'Tran Thi B', '0933333333', '789 Tran Phu, P. Hai Chau 1', 'Da Nang', 'Quan Hai Chau', 'Phuong Hai Chau 1', NULL, 30000.00, NULL, 250000.00, 0.00, 280000.00, NULL, NULL, 'PROCESSING', 'VNPAY', 'FAILED', NULL, '', '2026-03-11 12:58:28', '2026-03-11 13:47:19', NULL, NULL, NULL, NULL, NULL, 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=28000000&vnp_Command=pay&vnp_CreateDate=20260311195827&vnp_CurrCode=VND&vnp_ExpireDate=20260311201327&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260311195827917&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260311195827917_1773233907976&vnp_Version=2.1.0&vnp_SecureHash=18635176979b51971e5bc7251f93f395bfe7bb42f2750dc5518e02a991122c0b33cd85ef193e91fc5c9e8e1fdcab6d464104a3f4a25463161c4102542c71bf3f', 'ORD-20260311195827917_1773233907976', NULL, NULL, b'0', NULL, NULL, NULL),
(42, 'ORD-20260311204233538', 1, NULL, 'Nguyễn Văn A', '0987654321', '123 Đường Số 1', 'Hồ Chí Minh', 'Quận 1', 'Phường Bến Nghé', NULL, 21001.00, NULL, 29110000.00, 0.00, 29131001.00, NULL, NULL, 'CANCELLED', 'COD', 'PENDING', 'Giao hàng giờ hành chính', NULL, '2026-03-11 13:42:34', NULL, NULL, NULL, '2026-03-11 13:42:50', 'Đổi ý không muốn mua nữa', NULL, NULL, NULL, '2026-03-11 13:48:46.793633', 'Ẩn theo yêu cầu Admin', b'1', NULL, NULL, NULL),
(43, 'ORD-20260314115913023', 1, NULL, 'Tran Thi B', '0933333333', '789 Tran Phu, P. Hai Chau 1', 'Da Nang', 'Quan Hai Chau', 'Phuong Hai Chau 1', NULL, 30000.00, 'GHN-IMEI-TEST', 29970000.00, 0.00, 30000000.00, NULL, NULL, 'DELIVERED', 'COD', 'PAID', NULL, 'Khách đã nhận hàng — Bảo hành kích hoạt', '2026-03-14 04:59:13', '2026-03-14 12:40:34', '2026-03-14 12:43:29', '2026-03-14 12:43:58', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, NULL, NULL),
(44, 'ORD-20260315150038159', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Khu Phố 4 .Huyện Ninh Phước .Tỉnh Ninh Thuận', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, 'LT4QV9', 3690000.00, 0.00, 3739500.00, NULL, NULL, 'SHIPPING', 'COD', 'PENDING', NULL, '', '2026-03-15 08:00:38', '2026-03-15 08:01:53', '2026-03-15 08:03:18', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', 'LT4QV9', 1986, '450401'),
(45, 'ORD-20260315151844290', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Khu Phố 4 .Huyện Ninh Phước .Tỉnh Ninh Thuận', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 7990000.00, 0.00, 8039500.00, NULL, NULL, 'PROCESSING', 'COD', 'PENDING', NULL, '', '2026-03-15 08:18:44', '2026-03-15 08:19:39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(46, 'ORD-20260316195213214', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, 'LT44G8', 11569000.00, 0.00, 11618500.00, NULL, NULL, 'DELIVERED', 'COD', 'PAID', NULL, '', '2026-03-16 12:52:13', '2026-03-16 12:52:54', '2026-03-16 12:53:12', '2026-03-17 06:03:30', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', 'LT44G8', 1986, '450401'),
(47, 'ORD-20260316204852086', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 3690000.00, 0.00, 3739500.00, NULL, NULL, 'PROCESSING', 'COD', 'PENDING', NULL, '', '2026-03-16 13:48:52', '2026-03-16 13:49:27', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(48, 'ORD-20260317102518619', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 10490000.00, 200000.00, 10339500.00, 1, 'SALE10', 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-17 03:25:19', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(49, 'ORD-20260317103146107', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 10490000.00, 0.00, 10539500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-17 03:31:46', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(50, 'ORD-20260317125916448', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, 'LT48NY', 10490000.00, 200000.00, 10339500.00, 1, 'SALE10', 'COMPLETED', 'COD', 'PAID', NULL, '', '2026-03-17 05:59:16', '2026-03-17 06:02:52', '2026-03-17 06:03:02', '2026-03-17 06:03:05', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', 'LT48NY', 1986, '450401'),
(51, 'ORD-20260317145346184', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, 'LT4Y4A', 120000.00, 0.00, 169500.00, NULL, NULL, 'COMPLETED', 'COD', 'PAID', NULL, '', '2026-03-17 07:53:46', '2026-03-17 07:54:17', '2026-03-17 07:54:28', '2026-03-17 07:54:33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', 'LT4Y4A', 1986, '450401'),
(52, 'ORD-20260318105853894', 10551, NULL, 'Pham Thai Bao', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 500000.00, 50000.00, 499500.00, 1, 'SALE10', 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-18 03:58:54', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(53, 'ORD-20260318110839048', 10552, NULL, 'Nguyễn Mạnh Hùng', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 120000.00, 0.00, 169500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-18 04:08:39', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(54, 'ORD-20260318110919981', 10552, NULL, 'Nguyễn Mạnh Hùng', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 200000.00, 0.00, 249500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-18 04:09:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(55, 'ORD-20260318110952094', 10552, NULL, 'Nguyễn Mạnh Hùng', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 250000.00, 0.00, 299500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-18 04:09:52', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(56, 'ORD-20260318135014771', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 250000.00, 0.00, 299500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-18 06:50:15', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(57, 'ORD-20260318135451188', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, 'LTKP34', 250000.00, 0.00, 299500.00, NULL, NULL, 'DELIVERED', 'COD', 'PAID', NULL, '', '2026-03-18 06:54:51', '2026-03-18 06:55:28', '2026-03-18 06:55:37', '2026-03-18 06:55:45', NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', 'LTKP34', 1986, '450401'),
(58, 'ORD-20260323150225445', 10560, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 190000.00, 0.00, 239500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-23 08:02:25', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(59, 'ORD-20260324203642269', 10561, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 190000.00, 0.00, 239500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-24 13:36:42', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(60, 'ORD-20260327130220269', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 10490000.00, 0.00, 10539500.00, NULL, NULL, 'PENDING', 'COD', 'PENDING', NULL, NULL, '2026-03-27 06:02:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, b'0', NULL, 1986, '450401'),
(61, 'ORD-20260327130339796', 1, NULL, 'Nguyễn Lê Hoàng Khang', '0567649206', 'Thon 4 Xa Ninh Phuoc Tinh Khanh Hoa', 'Ninh Thuận', 'Huyện Ninh Phước', 'Thị trấn Phước Dân', NULL, 49500.00, NULL, 190000.00, 0.00, 239500.00, NULL, NULL, 'PENDING', 'VNPAY', 'PAID', NULL, NULL, '2026-03-27 06:03:40', NULL, NULL, NULL, NULL, NULL, '2026-03-27 06:06:14.430001', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=23950000&vnp_Command=pay&vnp_CreateDate=20260327130339&vnp_CurrCode=VND&vnp_ExpireDate=20260327131839&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260327130339796&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260327130339796_1774591419813&vnp_Version=2.1.0&vnp_SecureHash=d6ceffe5e884605c56864815e5eb7ee3480559ce8240ef260ee66772d6c25418bd8d02bb435448d7094db59e4410167044824fb12e3fc86112932e0be709adc3', 'ORD-20260327130339796_1774591419813', NULL, NULL, b'0', NULL, 1986, '450401');

ALTER TABLE `orders`
  ADD UNIQUE KEY `order_code` (`order_code`),
  ADD KEY `orders_users_id_fk` (`user_id`),
  ADD KEY `orders_user_address_fk` (`user_address_id`),
  ADD KEY `orders_shipping_method_fk` (`shipping_method_id`),
  ADD KEY `orders_coupon_id_fk` (`coupon_id`),
  ADD KEY `orders_status_idx` (`status`),
  ADD KEY `orders_tracking_idx` (`tracking_code`);

ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=62;

-- --------------------------------------------------------

-- Table: payment_transactions
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `payment_method` enum('COD','BANK_TRANSFER','MOMO','VNPAY','ZALOPAY') COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `currency` varchar(10) COLLATE utf8mb4_vietnamese_ci DEFAULT 'VND',
  `status` enum('PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED','REFUNDED') COLLATE utf8mb4_vietnamese_ci DEFAULT 'PENDING',
  `gateway_transaction_id` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL COMMENT 'Mã giao dịch từ cổng thanh toán',
  `gateway_response` json DEFAULT NULL COMMENT 'Response từ cổng thanh toán',
  `bank_code` varchar(50) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `card_type` varchar(50) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `payer_name` varchar(255) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `payer_email` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `payer_phone` varchar(20) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_vietnamese_ci,
  `paid_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `failure_reason` text COLLATE utf8mb4_vietnamese_ci,
  `refunded_at` datetime DEFAULT NULL,
  `refund_amount` decimal(15,2) DEFAULT NULL,
  `refund_reason` text COLLATE utf8mb4_vietnamese_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `callback_data` text COLLATE utf8mb4_vietnamese_ci,
  `order_code` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `payment_url` varchar(2000) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `response_code` varchar(20) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `response_message` varchar(500) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `transaction_ref` varchar(100) COLLATE utf8mb4_vietnamese_ci NOT NULL
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `payment_transactions` (`id`, `order_id`, `payment_method`, `amount`, `currency`, `status`, `gateway_transaction_id`, `gateway_response`, `bank_code`, `card_type`, `payer_name`, `payer_email`, `payer_phone`, `ip_address`, `note`, `paid_at`, `failed_at`, `failure_reason`, `refunded_at`, `refund_amount`, `refund_reason`, `created_at`, `updated_at`, `callback_data`, `order_code`, `payment_url`, `response_code`, `response_message`, `transaction_ref`) VALUES
(1, 27, 'VNPAY', 521001.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:36:16', NULL, NULL, 'ORD-20260309123615664', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=52100100&vnp_Command=pay&vnp_CreateDate=20260309123615&vnp_CurrCode=VND&vnp_ExpireDate=20260309125115&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309123615664&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309123615664_1773034575686&vnp_Version=2.1.0&vnp_SecureHash=43ea961dc0b17bd3de8e541642792e524a80794dad83a65c57d45aad22e0f0944ac55969dfc27e93e975be946cb6d9bc4beeca7cad1cc33cc5635cfe960af4f7', NULL, NULL, 'ORD-20260309123615664_1773034575686'),
(2, 29, 'VNPAY', 16912757.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:38:37', NULL, NULL, 'ORD-20260309123837010', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1691275700&vnp_Command=pay&vnp_CreateDate=20260309123837&vnp_CurrCode=VND&vnp_ExpireDate=20260309125337&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309123837010&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309123837010_1773034717029&vnp_Version=2.1.0&vnp_SecureHash=7c066a765ec05125879cd194003ba6d1d27d51e6e969de53ccbc8e799a74badf8696e44ef8dbb2f7c3b311b3abe9f9f6adf98cc85852284212f4632dedd7dd6d', NULL, NULL, 'ORD-20260309123837010_1773034717029'),
(3, 30, 'VNPAY', 16712757.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:41:30', NULL, NULL, 'ORD-20260309124129558', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_Command=pay&vnp_CreateDate=20260309124129&vnp_CurrCode=VND&vnp_ExpireDate=20260309125629&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124129558&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124129558_1773034889575&vnp_Version=2.1.0&vnp_SecureHash=4ce18d1095bf315167368bfc3061dc79bb1316b1ce965ca83d0c3bc4e7567dfad9f800f770536dc1d3123101a8ad566629a6bea9dcd7951c50076ddfe72f0911', NULL, NULL, 'ORD-20260309124129558_1773034889575'),
(4, 32, 'VNPAY', 16912757.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:49:04', NULL, NULL, 'ORD-20260309124903603', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1691275700&vnp_Command=pay&vnp_CreateDate=20260309124903&vnp_CurrCode=VND&vnp_ExpireDate=20260309130403&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124903603&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124903603_1773035343622&vnp_Version=2.1.0&vnp_SecureHash=852052a9590c6d7298282d9aa602a585fa9d38212015b6d1d757b4ab183f2c7843f2836648797d713f13e42f78efd4933854f921cc3797058eaf69ebc3db12e2', NULL, NULL, 'ORD-20260309124903603_1773035343622'),
(5, 33, 'VNPAY', 16712757.00, 'VND', 'CANCELLED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:49:16', '2026-03-09 05:56:18', NULL, 'ORD-20260309124916158', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_Command=pay&vnp_CreateDate=20260309124916&vnp_CurrCode=VND&vnp_ExpireDate=20260309130416&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124916158&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124916158_1773035356178&vnp_Version=2.1.0&vnp_SecureHash=29d2ff4788524a2e6acd62059dcf0a84524bc3c50a98e53540ae96f5080210cd62afe02a74b91e336097e0ffe31278a092dc1335e7b8e4a6c70f326b0cbed4df', NULL, 'Cancelled due to new payment attempt', 'ORD-20260309124916158_1773035356178'),
(6, 33, 'VNPAY', 16712757.00, 'VND', 'CANCELLED', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0:0:0:0:0:0:0:1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:56:18', '2026-03-09 05:58:47', NULL, 'ORD-20260309124916158', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_Command=pay&vnp_CreateDate=20260309125617&vnp_CurrCode=VND&vnp_ExpireDate=20260309131117&vnp_IpAddr=0%3A0%3A0%3A0%3A0%3A0%3A0%3A1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124916158&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124916158_1773035777749&vnp_Version=2.1.0&vnp_SecureHash=64e40195196e1c96798bc2ce1981746dd7bd5c3c2c710d2b341703d2c1c64e83e5f94baa9dad09b52078872b2487a0f4f120338224c3e002880b46b023b5bf90', NULL, 'Cancelled due to new payment attempt', 'ORD-20260309124916158_1773035777749'),
(7, 33, 'VNPAY', 16712757.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '0:0:0:0:0:0:0:1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 05:58:47', NULL, NULL, 'ORD-20260309124916158', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1671275700&vnp_BankCode=NCB&vnp_Command=pay&vnp_CreateDate=20260309125847&vnp_CurrCode=VND&vnp_ExpireDate=20260309131347&vnp_IpAddr=0%3A0%3A0%3A0%3A0%3A0%3A0%3A1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309124916158&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309124916158_1773035927296&vnp_Version=2.1.0&vnp_SecureHash=44fafe5c4c7a666529b0c051e8ee8649d13e8bcd58864f5e6563da799c15893653041827d275f46ac2a6c6f6161e2910025b258cad8ab07d5db7ced0ed1dd01c', NULL, NULL, 'ORD-20260309124916158_1773035927296'),
(8, 34, 'VNPAY', 281501.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 06:56:05', NULL, NULL, 'ORD-20260309135605318', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=28150100&vnp_Command=pay&vnp_CreateDate=20260309135605&vnp_CurrCode=VND&vnp_ExpireDate=20260309141105&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh+toan+don+hang+ORD-20260309135605318&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309135605318_1773039365370&vnp_Version=2.1.0&vnp_SecureHash=7385474b39e1d5a60216ec24b386997251239e43226318db3c30953710f1feb1ae7c1b50b153bc5076597206c61d1211fbdc703c7f3c7ff83075a1c4e9056242', NULL, NULL, 'ORD-20260309135605318_1773039365370'),
(9, 35, 'VNPAY', 23779501.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:14:40', NULL, NULL, 'ORD-20260309141440328', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=2377950100&vnp_Command=pay&vnp_CreateDate=20260309141440&vnp_CurrCode=VND&vnp_ExpireDate=20260309142940&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309141440328&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309141440328_1773040480382&vnp_Version=2.1.0&vnp_SecureHash=b92cbb9c52b7dbfd4cf3f43da7b2d67dff33e6b21484fe6e74a2045442ac37565547d6772cb0f7f992d7980ad105e2a4d8a3d3d58abe7fc71221532d24b6f257', NULL, NULL, 'ORD-20260309141440328_1773040480382'),
(10, 36, 'VNPAY', 421501.00, 'VND', 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:21:45', NULL, NULL, 'ORD-20260309142144984', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260309142145&vnp_CurrCode=VND&vnp_ExpireDate=20260309143645&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309142144984&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309142144984_1773040905031&vnp_Version=2.1.0&vnp_SecureHash=0a968cc072323958639549cc63ced086666746857b70c235935c3b867fa1128bf19f7c69e37f20b997abad4753af84c4eacfd6fc30eddbcc1f10a4e7828781d6', NULL, NULL, 'ORD-20260309142144984_1773040905031'),
(11, 37, 'VNPAY', 441001.00, 'VND', 'SUCCESS', '15443375', NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:25:33', '2026-03-09 07:27:37', '{vnp_Amount=44100100, vnp_BankCode=NCB, vnp_BankTranNo=VNP15443375, vnp_CardType=ATM, vnp_OrderInfo=Thanh toan don hang ORD-20260309142532518, vnp_PayDate=20260309142733, vnp_ResponseCode=00, vnp_TmnCode=BCFSNG1R, vnp_TransactionNo=15443375, vnp_TransactionStatus=00, vnp_TxnRef=ORD-20260309142532518_1773041132563, vnp_SecureHash=761d28bd6168955a81b30ff87b23186c45b604297be97735878d799100e65748f6b4145d25245c5ce79366279509e537ff3ec72822ec0e5e6aaf80e6d3b9efd0}', 'ORD-20260309142532518', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=44100100&vnp_Command=pay&vnp_CreateDate=20260309142532&vnp_CurrCode=VND&vnp_ExpireDate=20260309144032&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309142532518&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309142532518_1773041132563&vnp_Version=2.1.0&vnp_SecureHash=ed5770b10be4de64376195a5df04679c835a3b3f517300668f214ba70d11bfa2180419978a3913eb474a24ff5d3ba8be527d9b51325c09aea8a86a9c8d5ac127', '00', 'Thanh toán VNPay thành công', 'ORD-20260309142532518_1773041132563'),
(12, 38, 'VNPAY', 421501.00, 'VND', 'SUCCESS', '15443425', NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-09 07:46:41', '2026-03-09 07:47:35', '{vnp_Amount=42150100, vnp_BankCode=NCB, vnp_BankTranNo=VNP15443425, vnp_CardType=ATM, vnp_OrderInfo=Thanh toan don hang ORD-20260309144640714, vnp_PayDate=20260309144730, vnp_ResponseCode=00, vnp_TmnCode=BCFSNG1R, vnp_TransactionNo=15443425, vnp_TransactionStatus=00, vnp_TxnRef=ORD-20260309144640714_1773042400763, vnp_SecureHash=2511a89bfe5e2618734681a145fc06ff287926de75a2dda26f042fed93ccfdbb13ca23eed2337dfa5c611c6771d1c17195dd0816df578416d45d04e902b5ce4c}', 'ORD-20260309144640714', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260309144640&vnp_CurrCode=VND&vnp_ExpireDate=20260309150140&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260309144640714&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260309144640714_1773042400763&vnp_Version=2.1.0&vnp_SecureHash=7c3aa62ceb7376b911410227efbaec76c17b7253040893d71188756df0ec66183c9fe1e81a92657d391199efe23880c421961fb2f8edd4176edef680069c3d6b', '00', 'Thanh toán VNPay thành công', 'ORD-20260309144640714_1773042400763'),
(13, 40, 'VNPAY', 421501.00, 'VND', 'SUCCESS', '15446692', NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-11 09:31:58', '2026-03-11 09:33:43', '{vnp_Amount=42150100, vnp_BankCode=NCB, vnp_BankTranNo=VNP15446692, vnp_CardType=ATM, vnp_OrderInfo=Thanh toan don hang ORD-20260311163157785, vnp_PayDate=20260311163336, vnp_ResponseCode=00, vnp_TmnCode=BCFSNG1R, vnp_TransactionNo=15446692, vnp_TransactionStatus=00, vnp_TxnRef=ORD-20260311163157785_1773221517878, vnp_SecureHash=eaf12d34a517d97a46cbfad0ae60516890eb224419c31f8c55303bab3c9c16be20596b88220d2d742073ce1411150011883236cf8495134f4abcf526b3c23497}', 'ORD-20260311163157785', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=42150100&vnp_Command=pay&vnp_CreateDate=20260311163157&vnp_CurrCode=VND&vnp_ExpireDate=20260311164657&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260311163157785&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260311163157785_1773221517878&vnp_Version=2.1.0&vnp_SecureHash=e7e6178f2ee345a6ab18ef387afe1a361e3558ed891d8e0ed5654ad88313cea5c1a63bc1d94ba99183abd68a9c00d6543a8d981b82ab2a256e0bdb6964ade28f', '00', 'Thanh toán VNPay thành công', 'ORD-20260311163157785_1773221517878'),
(14, 41, 'VNPAY', 280000.00, 'VND', 'FAILED', '0', NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-11 12:58:28', '2026-03-11 12:58:39', '{vnp_Amount=28000000, vnp_BankCode=VNPAY, vnp_CardType=QRCODE, vnp_OrderInfo=Thanh toan don hang ORD-20260311195827917, vnp_PayDate=20260311195828, vnp_ResponseCode=24, vnp_TmnCode=BCFSNG1R, vnp_TransactionNo=0, vnp_TransactionStatus=02, vnp_TxnRef=ORD-20260311195827917_1773233907976, vnp_SecureHash=500c7ffe53f4c6098a0b5edcb2d7c92d74286c162610e5b1bfa1907440a9593c4de6cd7c00133e5310a20f2c6b185cae3b24ce7155b6f05d0bb25b708e7f2045}', 'ORD-20260311195827917', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=28000000&vnp_Command=pay&vnp_CreateDate=20260311195827&vnp_CurrCode=VND&vnp_ExpireDate=20260311201327&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260311195827917&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260311195827917_1773233907976&vnp_Version=2.1.0&vnp_SecureHash=18635176979b51971e5bc7251f93f395bfe7bb42f2750dc5518e02a991122c0b33cd85ef193e91fc5c9e8e1fdcab6d464104a3f4a25463161c4102542c71bf3f', '24', 'Thanh toán VNPay thất bại (code: 24)', 'ORD-20260311195827917_1773233907976'),
(15, 61, 'VNPAY', 239500.00, 'VND', 'SUCCESS', '15470435', NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-27 06:03:40', '2026-03-27 06:06:14', '{vnp_Amount=23950000, vnp_BankCode=NCB, vnp_BankTranNo=VNP15470435, vnp_CardType=ATM, vnp_OrderInfo=Thanh toan don hang ORD-20260327130339796, vnp_PayDate=20260327130437, vnp_ResponseCode=00, vnp_TmnCode=BCFSNG1R, vnp_TransactionNo=15470435, vnp_TransactionStatus=00, vnp_TxnRef=ORD-20260327130339796_1774591419813, vnp_SecureHash=964ff3ecd195f35733558da8100bc441a67e8c446e799cf4bd920709dd16102d96aa984c23fde510d643c6b4902bbada6a07c280233edce5c623ddcb636e56a6}', 'ORD-20260327130339796', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=23950000&vnp_Command=pay&vnp_CreateDate=20260327130339&vnp_CurrCode=VND&vnp_ExpireDate=20260327131839&vnp_IpAddr=127.0.0.1&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD-20260327130339796&vnp_OrderType=other&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A8080%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_TmnCode=BCFSNG1R&vnp_TxnRef=ORD-20260327130339796_1774591419813&vnp_Version=2.1.0&vnp_SecureHash=d6ceffe5e884605c56864815e5eb7ee3480559ce8240ef260ee66772d6c25418bd8d02bb435448d7094db59e4410167044824fb12e3fc86112932e0be709adc3', '00', 'Thanh toán VNPay thành công', 'ORD-20260327130339796_1774591419813');

ALTER TABLE `payment_transactions`
  ADD UNIQUE KEY `UK_6q7mf6i77426tcs4c30g1vaf8` (`transaction_ref`),
  ADD KEY `payment_order_fk` (`order_id`),
  ADD KEY `payment_status_idx` (`status`),
  ADD KEY `payment_method_idx` (`payment_method`);

ALTER TABLE `payment_transactions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

-- --------------------------------------------------------

-- Table: shipping_methods
CREATE TABLE `shipping_methods` (
  `id` int(11) NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `description` text COLLATE utf8mb4_vietnamese_ci,
  `logo_url` text COLLATE utf8mb4_vietnamese_ci,
  `base_fee` decimal(15,2) DEFAULT '0.00',
  `fee_per_kg` decimal(15,2) DEFAULT '0.00',
  `free_shipping_threshold` decimal(15,2) DEFAULT NULL COMMENT 'Miễn phí ship khi đạt giá trị',
  `estimated_days_min` int(11) DEFAULT '1',
  `estimated_days_max` int(11) DEFAULT '3',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `shipping_methods` (`id`, `name`, `code`, `description`, `logo_url`, `base_fee`, `fee_per_kg`, `free_shipping_threshold`, `estimated_days_min`, `estimated_days_max`, `is_active`, `display_order`, `created_at`) VALUES
(1, 'Giao hàng tiêu chuẩn', 'STANDARD', NULL, NULL, 30000.00, 0.00, NULL, 3, 5, 1, 0, '2026-02-25 09:38:09'),
(2, 'Giao hàng nhanh', 'EXPRESS', NULL, NULL, 50000.00, 0.00, NULL, 1, 2, 1, 0, '2026-02-25 09:38:09'),
(3, 'Giao hàng hỏa tốc', 'SAME_DAY', NULL, NULL, 80000.00, 0.00, NULL, 0, 1, 1, 0, '2026-02-25 09:38:09'),
(4, 'Nhận tại cửa hàng', 'PICKUP', NULL, NULL, 0.00, 0.00, NULL, 0, 0, 1, 0, '2026-02-25 09:38:09');

ALTER TABLE `shipping_methods`
  ADD UNIQUE KEY `code` (`code`);

ALTER TABLE `shipping_methods`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

-- --------------------------------------------------------

-- Table: warranty_claims
CREATE TABLE `warranty_claims` (
  `id` int(11) NOT NULL,
  `claim_number` varchar(50) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `order_detail_id` int(11) DEFAULT NULL,
  `product_item_id` int(11) DEFAULT NULL COMMENT 'Serial/IMEI cụ thể',
  `variant_id` int(11) NOT NULL,
  `product_name` varchar(255) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `imei` varchar(20) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `issue_type` enum('DEFECTIVE','DAMAGED','NOT_WORKING','MISSING_PARTS','OTHER') COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `issue_description` text COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `customer_request` enum('REPAIR','REPLACE','REFUND') COLLATE utf8mb4_vietnamese_ci DEFAULT 'REPAIR',
  `status` enum('PENDING','RECEIVED','INSPECTING','APPROVED','REJECTED','REPAIRING','COMPLETED','RETURNED') COLLATE utf8mb4_vietnamese_ci DEFAULT 'PENDING',
  `priority` enum('LOW','NORMAL','HIGH','URGENT') COLLATE utf8mb4_vietnamese_ci DEFAULT 'NORMAL',
  `contact_name` varchar(255) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_vietnamese_ci NOT NULL,
  `contact_email` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL,
  `contact_address` text COLLATE utf8mb4_vietnamese_ci,
  `received_date` datetime DEFAULT NULL COMMENT 'Ngày nhận máy',
  `inspection_date` datetime DEFAULT NULL,
  `inspection_result` text COLLATE utf8mb4_vietnamese_ci,
  `repair_cost` decimal(15,2) DEFAULT '0.00' COMMENT 'Chi phí sửa (nếu hết bảo hành)',
  `is_under_warranty` tinyint(1) DEFAULT '1',
  `completed_date` datetime DEFAULT NULL,
  `returned_date` datetime DEFAULT NULL,
  `staff_id` int(11) DEFAULT NULL COMMENT 'Nhân viên xử lý',
  `staff_notes` text COLLATE utf8mb4_vietnamese_ci,
  `image_url_1` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Ảnh lỗi do khách upload',
  `image_url_2` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Ảnh kiểm tra',
  `image_url_3` text COLLATE utf8mb4_vietnamese_ci COMMENT 'Ảnh sau khi sửa',
  `customer_feedback` text COLLATE utf8mb4_vietnamese_ci,
  `satisfaction_rating` tinyint(1) DEFAULT NULL COMMENT '1-5 sao',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `warranty_claims` (`id`, `claim_number`, `user_id`, `order_id`, `order_detail_id`, `product_item_id`, `variant_id`, `product_name`, `serial_number`, `imei`, `issue_type`, `issue_description`, `customer_request`, `status`, `priority`, `contact_name`, `contact_phone`, `contact_email`, `contact_address`, `received_date`, `inspection_date`, `inspection_result`, `repair_cost`, `is_under_warranty`, `completed_date`, `returned_date`, `staff_id`, `staff_notes`, `image_url_1`, `image_url_2`, `image_url_3`, `customer_feedback`, `satisfaction_rating`, `created_at`, `updated_at`) VALUES
(1, 'WC-2026-001', 1, 3, 4, 4, 116, 'Tai nghe Sony WH-1000XM5 Over-Ear Noise Cancelling', '351234567890123', NULL, 'NOT_WORKING', 'Tai nghe không bật được nguồn dù đã sạc đầy pin, đèn LED không sáng', 'REPAIR', 'RECEIVED', 'HIGH', 'Nguyễn Hoàng Phúc', '0903111222', 'nphuc@gmail.com', '15 Lê Văn Sỹ, Phường 12, Q.3, TP.HCM', '2026-03-15 09:00:00', NULL, NULL, 0.00, 1, NULL, NULL, 1, 'Đã tiếp nhận máy, chuyển sang bộ phận kỹ thuật kiểm tra nguyên nhân', NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(2, 'WC-2026-002', 1, 4, 6, 7, 1693, 'iPhone 15 Pro 256GB Titanium Natural', '990000862471854', '990000862471854', 'DEFECTIVE', 'Camera sau bị mờ, ảnh chụp nhiễu hạt nặng kể cả ban ngày có đủ ánh sáng', 'REPLACE', 'INSPECTING', 'URGENT', 'Nguyễn Hoàng Phúc', '0903111222', 'nphuc@gmail.com', '15 Lê Văn Sỹ, Phường 12, Q.3, TP.HCM', '2026-03-20 10:00:00', NULL, NULL, 0.00, 1, NULL, NULL, 1, 'Camera module bị lỗi OIS, đang liên hệ Apple Vietnam để xử lý đổi máy', NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(3, 'WC-2026-003', 1, 5, 7, 13, 729, 'AirPods Pro 2 (USB-C) 2024', 'IMEI1773812049208', NULL, 'MISSING_PARTS', 'Hộp sản phẩm thiếu nút tai silicone size M và L khi mở hộp lần đầu', 'REPLACE', 'APPROVED', 'NORMAL', 'Nguyễn Hoàng Phúc', '0903111222', 'nphuc@gmail.com', '15 Lê Văn Sỹ, Phường 12, Q.3, TP.HCM', '2026-03-25 14:00:00', NULL, NULL, 0.00, 1, NULL, NULL, 1, 'Đã xác nhận lỗi, yêu cầu Apple gửi bổ sung phụ kiện cho khách', NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(4, 'WC-2026-004', 1, 6, 8, 14, 729, 'AirPods Pro 2 (USB-C) – Case Sạc', 'IMEI1773812049208_2', NULL, 'DAMAGED', 'Case sạc bị nứt nhựa tại bản lề chỉ sau 2 tuần sử dụng nhẹ nhàng', 'REPAIR', 'PENDING', 'LOW', 'Nguyễn Hoàng Phúc', '0903111222', 'nphuc@gmail.com', '15 Lê Văn Sỹ, Phường 12, Q.3, TP.HCM', '2026-04-02 08:30:00', NULL, NULL, 0.00, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(5, 'WC-2026-005', 1, 7, 9, 10, 17, 'Cáp Type C - Type C 0.9m Anker 322 A81F5', '351234567800001', NULL, 'DEFECTIVE', 'Cáp chỉ sạc 5W dù cả thiết bị và củ sạc đều hỗ trợ 60W PD', 'REPLACE', 'COMPLETED', 'NORMAL', 'Nguyễn Hoàng Phúc', '0903111222', 'nphuc@gmail.com', '15 Lê Văn Sỹ, Phường 12, Q.3, TP.HCM', '2026-03-28 15:00:00', NULL, NULL, 0.00, 1, NULL, NULL, 1, 'Chip e-marker bị lỗi sản xuất. Đã đổi cáp mới hoàn toàn cho khách hàng', NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(6, 'WC-2026-006', 1, 8, 10, 11, 116, 'Loa JBL Flip 6 Bluetooth', '351234567800002', NULL, 'NOT_WORKING', 'Loa không phát được âm thanh sau khi bị dính nước dù quảng cáo chống nước IPX7', 'REFUND', 'PENDING', 'HIGH', 'Trần Thị Lan', '0903222333', 'lan.tran@gmail.com', '88 Nguyễn Đinh Chiểu, Q.3, TP.HCM', '2026-04-05 10:00:00', NULL, NULL, 0.00, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57'),
(7, 'WC-2026-007', 1, 1, 1, 4, 17, 'Sản phẩm điện tử – Cáp Anker Type C 0.9m', '351234567890123', NULL, 'OTHER', 'Cáp bị cứng đơ, phần vỏ bọc bị tróc lở chỉ sau 6 tháng dù nhà sản xuất cam kết bền 25.000 lượt uốn', 'REPLACE', 'PENDING', 'NORMAL', 'Lê Minh Khoa', '0903333444', 'khoa.le@gmail.com', '45 Trần Hưng Đạo, Q.1, TP.HCM', '2026-04-07 11:00:00', NULL, NULL, 0.00, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-08 11:01:57', '2026-04-08 11:01:57');

ALTER TABLE `warranty_claims`
  ADD UNIQUE KEY `claim_number` (`claim_number`),
  ADD KEY `warranty_user_fk` (`user_id`),
  ADD KEY `warranty_order_fk` (`order_id`),
  ADD KEY `warranty_order_detail_fk` (`order_detail_id`),
  ADD KEY `warranty_product_item_fk` (`product_item_id`),
  ADD KEY `warranty_variant_fk` (`variant_id`),
  ADD KEY `warranty_staff_fk` (`staff_id`),
  ADD KEY `warranty_status_idx` (`status`);

ALTER TABLE `warranty_claims`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

-- --------------------------------------------------------

-- Table: warranty_tickets
CREATE TABLE `warranty_tickets` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) NOT NULL,
  `issue_description` text NOT NULL,
  `received_at` datetime(6) NOT NULL,
  `repair_cost` decimal(12,2) DEFAULT NULL,
  `resolved_at` datetime(6) DEFAULT NULL,
  `returned_at` datetime(6) DEFAULT NULL,
  `status` enum('PENDING','IN_PROGRESS','COMPLETED','CANCELLED','RETURNED') NOT NULL,
  `technician_note` text,
  `ticket_code` varchar(50) NOT NULL,
  `created_by` int(11) DEFAULT NULL,
  `product_item_id` int(11) NOT NULL
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `warranty_tickets` (`id`, `customer_name`, `customer_phone`, `issue_description`, `received_at`, `repair_cost`, `resolved_at`, `returned_at`, `status`, `technician_note`, `ticket_code`, `created_by`, `product_item_id`) VALUES
(1, 'Trần Khách Hàng', '0987654321', 'Màn hình bị sọc xanh khi xài 1 lúc', '2026-03-15 04:36:42.235451', 0.00, '2026-03-15 04:40:23.809771', '2026-03-15 04:40:39.423600', 'RETURNED', 'Đã trao lại máy cho khách.', 'WR-20260315-001', 10539, 1),
(2, 'Trần Thị Lan', '0903222333', 'Pin dự phòng không sạc được thiết bị, đèn chỉ thị không sáng sau khi cắm điện', '2026-02-18 14:00:00.000000', 0.00, '2026-02-22 11:00:00.000000', '2026-02-23 09:00:00.000000', 'COMPLETED', 'Board mạch nội bộ bị lỗi sản xuất, đã thay mới toàn bộ trong bảo hành', 'WT-2026-002', 1, 2),
(3, 'Lê Minh Khoa', '0903333444', 'Cáp Type-C bị đứt phần đầu kết nối chỉ sau 1 tháng sử dụng nhẹ nhàng', '2026-03-05 10:15:00.000000', 0.00, '2026-03-07 15:00:00.000000', '2026-03-08 10:00:00.000000', 'COMPLETED', 'Lỗi vật liệu bọc đầu cáp – đổi mới hoàn toàn cho khách, còn trong BH', 'WT-2026-003', 1, 3),
(4, 'Phạm Quốc Bảo', '0904444555', 'Màn hình điện thoại xuất hiện điểm chết (dead pixel) ở góc trên phải', '2026-03-12 11:00:00.000000', NULL, NULL, NULL, 'IN_PROGRESS', 'Đang kiểm tra, chờ xác nhận lỗi từ đội kỹ thuật và liên hệ hãng', 'WT-2026-004', 1, 4),
(5, 'Võ Ngọc Hân', '0905555666', 'Củ sạc nóng bất thường sau 5 phút sạc, không đạt công suất 20W theo quảng cáo', '2026-03-20 08:30:00.000000', NULL, NULL, NULL, 'PENDING', NULL, 'WT-2026-005', 1, 5),
(6, 'Đỗ Thanh Tùng', '0906666777', 'Loa phát ra tiếng rè khi tăng âm lượng quá 60%, âm thanh bị méo', '2026-04-01 09:00:00.000000', NULL, NULL, NULL, 'PENDING', NULL, 'WT-2026-006', 1, 6),
(7, 'Hoàng Thị Mai', '0907777888', 'Tai nghe TWS bên phải mất âm thanh hoàn toàn sau 3 tuần sử dụng', '2026-04-03 10:30:00.000000', NULL, NULL, NULL, 'IN_PROGRESS', 'Pin cell bên phải bị phồng, đang chờ linh kiện nhập từ hãng để thay thế', 'WT-2026-007', 1, 7),
(8, 'Nguyễn Văn Dũng', '0908888999', 'Màn hình laptop bị nhòe góc trên bên trái khi cắm sạc 30 phút', '2026-04-05 13:00:00.000000', NULL, NULL, NULL, 'PENDING', NULL, 'WT-2026-008', 1, 8),
(9, 'Bùi Thị Hoa', '0909999111', 'Nút nguồn bị kẹt, không bật tắt được bình thường, phải nhấn nhiều lần', '2026-04-06 09:00:00.000000', NULL, NULL, NULL, 'PENDING', NULL, 'WT-2026-009', 1, 9),
(10, 'Trương Minh Tân', '0911111222', 'Loa bluetooth mất kết nối liên tục trong vòng bán kính 3m, không ổn định', '2026-04-07 14:30:00.000000', NULL, NULL, NULL, 'PENDING', NULL, 'WT-2026-010', 1, 10);

ALTER TABLE `warranty_tickets`
  ADD UNIQUE KEY `UK_tirrx4muy7pteos5eodk5e6vk` (`ticket_code`),
  ADD KEY `FKaimulbvofyk03ubnq6xogm942` (`created_by`),
  ADD KEY `FKr4h52xqbr6qy6vlwbhbpm0s1v` (`product_item_id`);

ALTER TABLE `warranty_tickets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;
SET FOREIGN_KEY_CHECKS = 1;
