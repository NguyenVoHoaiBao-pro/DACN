-- =============================================================================
-- Xóa sản phẩm test khỏi electro_catalog_db
--   #583  iPhone 16 Pro Max
--   #584  Sản phẩm test tối giản
--   #589  techguru123
--
-- Database chính: electro_catalog_db
-- Bảng gốc     : products
-- =============================================================================

USE `electro_catalog_db`;

-- Kiểm tra trước khi xóa
SELECT id, name, slug, is_active, is_featured, base_price
FROM products
WHERE id IN (583, 584, 589)
   OR name IN ('techguru123', 'Sản phẩm test tối giản', 'iPhone 16 Pro Max');

-- =============================================================================
-- CÁCH 1 (KHUYÊN DÙNG): Ẩn khỏi giao diện — giống nút Xóa trong Admin
-- Public API chỉ lấy is_active = 1 → sản phẩm biến mất khỏi Shop/Trang chủ
-- =============================================================================
/*
UPDATE products
SET
    is_active   = 0,
    is_featured = 0,
    updated_at  = NOW()
WHERE id IN (583, 584, 589);
*/

-- =============================================================================
-- CÁCH 2: XÓA HẲN khỏi database (xóa cả variant, ảnh, spec liên quan)
-- Chạy lần lượt từ trên xuống trong 1 transaction
-- =============================================================================
/*
START TRANSACTION;

-- 1) Ảnh (theo product hoặc variant của product)
DELETE i FROM images i
LEFT JOIN product_variants pv ON pv.id = i.variant_id
WHERE i.product_id IN (583, 584, 589)
   OR pv.product_id IN (583, 584, 589);

-- 2) Thuộc tính variant
DELETE vav FROM variant_attribute_values vav
INNER JOIN product_variants pv ON pv.id = vav.variant_id
WHERE pv.product_id IN (583, 584, 589);

-- 3) Giao dịch kho / IMEI (nếu có)
DELETE it FROM inventory_transactions it
INNER JOIN product_variants pv ON pv.id = it.variant_id
WHERE pv.product_id IN (583, 584, 589);

DELETE pi FROM product_items pi
INNER JOIN product_variants pv ON pv.id = pi.variant_id
WHERE pv.product_id IN (583, 584, 589);

-- 4) Thông số kỹ thuật sản phẩm
DELETE FROM product_specifications
WHERE product_id IN (583, 584, 589);

-- 5) Biến thể
DELETE FROM product_variants
WHERE product_id IN (583, 584, 589);

-- 6) Sản phẩm
DELETE FROM products
WHERE id IN (583, 584, 589);

COMMIT;
*/

-- Xác nhận sau khi xóa
-- SELECT COUNT(*) FROM products WHERE id IN (583, 584, 589);
