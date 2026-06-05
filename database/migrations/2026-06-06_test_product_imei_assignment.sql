-- =============================================================================
-- Sản phẩm TEST chuyên dùng gán IMEI vào đơn hàng (QA / demo)
-- Chạy trên: electro_catalog_db
-- Rollback: xóa product_items → variants → images → product WHERE slug = 'test-dong-ho-gan-imei-qa'
-- =============================================================================

USE electro_catalog_db;

-- ── 1. Sản phẩm ─────────────────────────────────────────────────────────────
INSERT INTO products (
    id, name, slug, description, short_description,
    product_type_id, producer_id, base_price,
    is_active, is_featured, requires_imei,
    meta_title, meta_description, created_at, updated_at
)
SELECT
    589,
    '[TEST] Đồng Hồ Gán IMEI (QA)',
    'test-dong-ho-gan-imei-qa',
    'San pham danh rieng test gan IMEI vao don hang. 3 bien the: Den, Bac, Xanh. IMEI prefix ETEST9000000000xx trang thai AVAILABLE.',
    'Sản phẩm test — gán IMEI đơn hàng, tra cứu BH',
    14,
    2,
    1990000.00,
    1,
    0,
    1,
    'Test gán IMEI đơn hàng',
    'Chỉ dùng nội bộ QA — Electro Store',
    NOW(),
    NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE slug = 'test-dong-ho-gan-imei-qa'
);

-- ── 2. Biến thể (3 màu) ─────────────────────────────────────────────────────
INSERT INTO product_variants (
    id, product_id, sku_code, variant_name, price, original_price,
    is_default, is_active, stock_quantity, low_stock_threshold,
    color, color_code, created_at, updated_at
)
SELECT * FROM (
    SELECT 1702 AS id, 589 AS product_id, 'SKU-TEST-IMEI-BLK' AS sku_code, 'Đen' AS variant_name,
           1990000.00 AS price, 2190000.00 AS original_price, 1 AS is_default, 1 AS is_active,
           5 AS stock_quantity, 2 AS low_stock_threshold, 'Đen' AS color, '#1a1a1a' AS color_code,
           NOW() AS created_at, NOW() AS updated_at
    UNION ALL
    SELECT 1703, 589, 'SKU-TEST-IMEI-SLV', 'Bạc', 2090000.00, 2290000.00, 0, 1, 3, 2, 'Bạc', '#c0c0c0', NOW(), NOW()
    UNION ALL
    SELECT 1704, 589, 'SKU-TEST-IMEI-GRN', 'Xanh', 1990000.00, 2190000.00, 0, 1, 2, 2, 'Xanh', '#22c55e', NOW(), NOW()
) AS v
WHERE EXISTS (SELECT 1 FROM products WHERE id = 589)
  AND NOT EXISTS (SELECT 1 FROM product_variants WHERE id = 1702);

-- ── 3. Ảnh sản phẩm ─────────────────────────────────────────────────────────
INSERT INTO images (id, product_id, variant_id, image_url, alt_text, is_primary, display_order, created_at)
SELECT
    861,
    589,
    NULL,
    'https://file.hstatic.net/200000289371/file/dong-ho-thong-minh-tre-em-kids-life-xanh_78ae7218ba7e41e8b0a19800f4cb1d5d_grande.jpg',
    '[TEST] Đồng hồ gán IMEI QA',
    1,
    0,
    NOW()
FROM DUAL
WHERE EXISTS (SELECT 1 FROM products WHERE id = 589)
  AND NOT EXISTS (SELECT 1 FROM images WHERE id = 861);

INSERT INTO images (id, product_id, variant_id, image_url, alt_text, is_primary, display_order, created_at)
SELECT 862, 589, 1702, 'https://cdn.tgdd.vn/Products/Images/7077/262620/redmi-watch-2-lite-den-tn-600x600.jpeg', 'Đen', 0, 1, NOW()
FROM DUAL WHERE EXISTS (SELECT 1 FROM product_variants WHERE id = 1702) AND NOT EXISTS (SELECT 1 FROM images WHERE id = 862);

INSERT INTO images (id, product_id, variant_id, image_url, alt_text, is_primary, display_order, created_at)
SELECT 863, 589, 1703, 'https://bizweb.dktcdn.net/thumb/1024x1024/100/468/275/products/y68-hong.jpg?v=1693370809333', 'Bạc', 0, 2, NOW()
FROM DUAL WHERE EXISTS (SELECT 1 FROM product_variants WHERE id = 1703) AND NOT EXISTS (SELECT 1 FROM images WHERE id = 863);

INSERT INTO images (id, product_id, variant_id, image_url, alt_text, is_primary, display_order, created_at)
SELECT 864, 589, 1704, 'https://file.hstatic.net/200000289371/file/dong-ho-thong-minh-tre-em-kids-life-xanh_78ae7218ba7e41e8b0a19800f4cb1d5d_grande.jpg', 'Xanh', 0, 3, NOW()
FROM DUAL WHERE EXISTS (SELECT 1 FROM product_variants WHERE id = 1704) AND NOT EXISTS (SELECT 1 FROM images WHERE id = 864);

-- ── 4. IMEI / Serial trong kho (AVAILABLE — sẵn sàng gán đơn) ───────────────
INSERT INTO product_items (
    id, variant_id, serial_number, imei, batch_number, manufacture_date,
    warranty_months, status, `condition`, location, notes, created_at, updated_at
)
SELECT * FROM (
    SELECT 20 AS id, 1702 AS variant_id, 'ETEST900000000001' AS serial_number, 'ETEST900000000001' AS imei,
           'BATCH_TEST_IMEI_QA_2026' AS batch_number, '2026-06-01' AS manufacture_date, 12 AS warranty_months,
           'AVAILABLE' AS status, 'NEW' AS `condition`, 'Kho-A-TEST' AS location,
           'QA: variant Đen — chiếc 1/2' AS notes, NOW() AS created_at, NOW() AS updated_at
    UNION ALL
    SELECT 21, 1702, 'ETEST900000000002', 'ETEST900000000002', 'BATCH_TEST_IMEI_QA_2026', '2026-06-01', 12,
           'AVAILABLE', 'NEW', 'Kho-A-TEST', 'QA: variant Đen — chiếc 2/2 (đơn SL=2)', NOW(), NOW()
    UNION ALL
    SELECT 22, 1703, 'ETEST900000000003', 'ETEST900000000003', 'BATCH_TEST_IMEI_QA_2026', '2026-06-01', 12,
           'AVAILABLE', 'NEW', 'Kho-A-TEST', 'QA: variant Bạc', NOW(), NOW()
    UNION ALL
    SELECT 23, 1704, 'ETEST900000000004', 'ETEST900000000004', 'BATCH_TEST_IMEI_QA_2026', '2026-06-01', 12,
           'AVAILABLE', 'NEW', 'Kho-A-TEST', 'QA: variant Xanh', NOW(), NOW()
) AS items
WHERE EXISTS (SELECT 1 FROM product_variants WHERE id = 1702)
  AND NOT EXISTS (SELECT 1 FROM product_items WHERE imei = 'ETEST900000000001');

ALTER TABLE products AUTO_INCREMENT = 590;
ALTER TABLE product_variants AUTO_INCREMENT = 1705;
ALTER TABLE product_items AUTO_INCREMENT = 24;
ALTER TABLE images AUTO_INCREMENT = 865;
