-- =============================================================================
-- Electro Store — Gán sản phẩm Nổi Bật (is_featured = 1)
-- Database: electro_catalog_db
--
-- Điều kiện hiển thị tab "Nổi Bật" trên Frontend:
--   is_featured = 1  AND  is_active = 1
-- =============================================================================

USE `electro_catalog_db`;

-- Bước 1: Reset cờ nổi bật (tùy chọn — giữ lại nếu muốn merge thêm sản phẩm cũ)
-- UPDATE products SET is_featured = 0 WHERE is_featured = 1;

-- Bước 2: Đánh dấu 12 sản phẩm nổi bật (đa danh mục, đang bán)
UPDATE products
SET
    is_featured = 1,
    updated_at  = NOW()
WHERE id IN (
    108,  -- MacBook Pro 14 inch M3 Pro 2023 (Laptop Apple)
    106,  -- MacBook Air 15 inch M2 2023 (Laptop Apple)
    121,  -- iPad Air M3 11 inch 128GB WiFi (Tablet)
    133,  -- iPad Mini 7 A17 128GB WiFi (Tablet)
    583,  -- iPhone 16 Pro Max (Điện thoại flagship — bật lại is_active)
    587,  -- Đồng hồ Thông minh / Apple Watch Series 9 (Wearable)
    87,   -- Samsung Galaxy Buds 2 Pro (Tai nghe)
    259,  -- Sony Bravia 7 Mini LED 4K 55 inch (Smart TV)
    149,  -- Samsung Galaxy Tab S9 Fe WiFi 128GB (Tablet)
    113,  -- Dell XPS (Laptop cao cấp)
    574,  -- Robot hút bụi Roborock S7 MaxV Ultra (Smart Home)
    65    -- Bộ loa Sony 5.1 HT-S700RF 1000W (Loa / Giải trí)
);

-- iPhone 16 Pro Max đang bị ẩn (is_active = 0) — bật lại để hiện tab Nổi Bật
UPDATE products
SET
    is_active   = 1,
    is_featured = 1,
    updated_at  = NOW()
WHERE id = 583;

-- Kiểm tra kết quả
SELECT
    p.id,
    p.name,
    pt.name AS category,
    pr.name AS brand,
    p.base_price,
    p.is_active,
    p.is_featured
FROM products p
JOIN product_types pt ON pt.id = p.product_type_id
JOIN producers pr ON pr.id = p.producer_id
WHERE p.is_featured = 1 AND p.is_active = 1
ORDER BY p.id;
