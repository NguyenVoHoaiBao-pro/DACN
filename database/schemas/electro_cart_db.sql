-- Auto-generated from electro_store_db.sql by scripts/split-database.py
-- Database: electro_cart_db
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_require_primary_key = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `electro_cart_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `electro_cart_db`;

-- Table: cart_items
CREATE TABLE `cart_items` (
  `id` int(11) NOT NULL,
  `cart_id` int(11) NOT NULL,
  `variant_id` int(11) NOT NULL COMMENT 'Liên kết với biến thể cụ thể',
  `quantity` int(11) NOT NULL DEFAULT '1',
  `unit_price` decimal(15,2) DEFAULT NULL COMMENT 'Đơn giá tại thời điểm thêm vào giỏ',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

ALTER TABLE `cart_items`
  ADD UNIQUE KEY `cart_variant_unique` (`cart_id`,`variant_id`),
  ADD KEY `cart_items_carts_id_fk` (`cart_id`),
  ADD KEY `cart_items_variants_id_fk` (`variant_id`);

ALTER TABLE `cart_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

-- Table: carts
CREATE TABLE `carts` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(100) COLLATE utf8mb4_vietnamese_ci DEFAULT NULL COMMENT 'Cho khách không đăng nhập',
  `coupon_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
,
  PRIMARY KEY (`id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_vietnamese_ci ROW_FORMAT=DYNAMIC;

INSERT INTO `carts` (`id`, `user_id`, `session_id`, `coupon_id`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, NULL, '2026-03-02 12:05:15', '2026-03-02 12:05:15'),
(2, 10542, NULL, NULL, '2026-03-03 04:14:56', '2026-03-03 04:14:56'),
(3, 10539, NULL, NULL, '2026-03-05 06:35:17', '2026-03-05 06:35:17'),
(4, 10543, NULL, NULL, '2026-03-07 12:03:23', '2026-03-07 12:03:23'),
(5, 10548, NULL, NULL, '2026-03-08 05:57:25', '2026-03-08 05:57:25'),
(6, 10547, NULL, NULL, '2026-03-08 12:04:26', '2026-03-08 12:04:26'),
(7, 10549, NULL, NULL, '2026-03-18 03:28:58', '2026-03-18 03:28:58'),
(8, 10551, NULL, NULL, '2026-03-18 03:57:13', '2026-03-18 03:57:13'),
(9, 10552, NULL, NULL, '2026-03-18 04:07:12', '2026-03-18 04:07:12'),
(10, 10555, NULL, NULL, '2026-03-18 13:53:13', '2026-03-18 13:53:13'),
(11, 10556, NULL, NULL, '2026-03-19 03:55:34', '2026-03-19 03:55:34'),
(12, 10557, NULL, NULL, '2026-03-19 05:16:40', '2026-03-19 05:16:40'),
(13, 10553, NULL, NULL, '2026-03-20 07:59:16', '2026-03-20 07:59:16'),
(14, 10559, NULL, NULL, '2026-03-21 04:16:32', '2026-03-21 04:16:32'),
(15, 10560, NULL, NULL, '2026-03-22 13:14:41', '2026-03-22 13:14:41'),
(16, 10561, NULL, NULL, '2026-03-23 08:04:35', '2026-03-23 08:04:35'),
(17, 2, NULL, NULL, '2026-04-25 12:50:18', '2026-04-25 12:50:18');

ALTER TABLE `carts`
  ADD KEY `carts_users_id_fk` (`user_id`),
  ADD KEY `carts_coupon_id_fk` (`coupon_id`);

ALTER TABLE `carts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;
SET FOREIGN_KEY_CHECKS = 1;
