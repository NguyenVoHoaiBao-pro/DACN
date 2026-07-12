-- =============================================================================
-- Seed serial/IMEI AVAILABLE — electro_catalog_db
-- Logic: mỗi variant active với stock_quantity > 0 phải có đủ serial AVAILABLE.
-- Chạy thực tế: python database/migrations/run_seed_product_serials.py
-- =============================================================================

USE electro_catalog_db;

-- Báo cáo thiếu serial
SELECT
    v.id AS variant_id,
    v.sku_code,
    v.stock_quantity,
    COALESCE(av.cnt, 0) AS available_serials,
    GREATEST(v.stock_quantity - COALESCE(av.cnt, 0), 0) AS need_insert
FROM product_variants v
LEFT JOIN (
    SELECT variant_id, COUNT(*) AS cnt
    FROM product_items
    WHERE status = 'AVAILABLE'
    GROUP BY variant_id
) av ON av.variant_id = v.id
WHERE v.is_active = 1
  AND v.stock_quantity > 0
  AND COALESCE(av.cnt, 0) < v.stock_quantity
ORDER BY need_insert DESC;
