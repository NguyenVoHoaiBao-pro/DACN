-- =============================================================================
-- Electro Store — Liệt kê / xóa ảnh sản phẩm không hợp lệ
-- Database: electro_catalog_db
-- Khuyên dùng: python scripts/cleanup-invalid-product-images.py --execute
-- =============================================================================

USE `electro_catalog_db`;

-- 1) LIỆT KÊ ảnh không hợp lệ
SELECT
    i.id,
    i.product_id,
    i.variant_id,
    CASE
        WHEN TRIM(COALESCE(i.image_url, '')) = '' THEN 'empty_url'
        WHEN LOWER(TRIM(i.image_url)) IN ('null', 'undefined', 'none', 'n/a') THEN 'placeholder_text'
        WHEN i.image_url LIKE 'data:image%' THEN 'base64_embedded'
        WHEN i.image_url LIKE 'http://localhost:%/img/%'
          OR i.image_url LIKE 'https://localhost:%/img/%'
          OR i.image_url LIKE '/img/%' THEN 'broken_local_img_path'
        WHEN i.product_id IS NULL AND i.variant_id IS NULL THEN 'orphan_no_product_no_variant'
        WHEN i.product_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id = i.product_id
        ) THEN 'missing_product'
        WHEN i.variant_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM product_variants v WHERE v.id = i.variant_id
        ) THEN 'missing_variant'
        ELSE 'other'
    END AS reason,
    LEFT(i.image_url, 120) AS image_url_preview,
    p.name AS product_name
FROM images i
LEFT JOIN products p ON p.id = i.product_id
WHERE (
    TRIM(COALESCE(i.image_url, '')) = ''
    OR LOWER(TRIM(i.image_url)) IN ('null', 'undefined', 'none', 'n/a')
    OR i.image_url LIKE 'data:image%'
    OR i.image_url LIKE 'http://localhost:%/img/%'
    OR i.image_url LIKE 'https://localhost:%/img/%'
    OR i.image_url LIKE '/img/%'
    OR (i.product_id IS NULL AND i.variant_id IS NULL)
    OR (i.product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM products p2 WHERE p2.id = i.product_id
    ))
    OR (i.variant_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM product_variants v WHERE v.id = i.variant_id
    ))
)
ORDER BY i.id;

-- 2) Sản phẩm không còn ảnh URL hợp lệ (tham khảo, KHÔNG xóa products)
SELECT
    p.id,
    p.name,
    p.is_active,
    COUNT(i.id) AS total_images
FROM products p
LEFT JOIN images i ON i.product_id = p.id
    AND TRIM(COALESCE(i.image_url, '')) <> ''
    AND i.image_url NOT LIKE 'data:image%'
    AND i.image_url NOT LIKE 'http://localhost:%/img/%'
    AND i.image_url NOT LIKE 'https://localhost:%/img/%'
    AND i.image_url NOT LIKE '/img/%'
GROUP BY p.id, p.name, p.is_active
HAVING COUNT(i.id) = 0
ORDER BY p.is_active DESC, p.id;

-- 3) XÓA ảnh không hợp lệ (bỏ comment khi chắc chắn)
/*
DELETE i FROM images i
WHERE (
    TRIM(COALESCE(i.image_url, '')) = ''
    OR LOWER(TRIM(i.image_url)) IN ('null', 'undefined', 'none', 'n/a')
    OR i.image_url LIKE 'data:image%'
    OR i.image_url LIKE 'http://localhost:%/img/%'
    OR i.image_url LIKE 'https://localhost:%/img/%'
    OR i.image_url LIKE '/img/%'
    OR (i.product_id IS NULL AND i.variant_id IS NULL)
    OR (i.product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM products p WHERE p.id = i.product_id
    ))
    OR (i.variant_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM product_variants v WHERE v.id = i.variant_id
    ))
);
*/
