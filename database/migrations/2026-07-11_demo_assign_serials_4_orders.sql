-- Gán mã Serial demo cho 4 đơn hàng (tra cứu & bảo hành online)
-- Chạy: mysql -u root < database/migrations/2026-07-11_demo_assign_serials_4_orders.sql

USE electro_catalog_db;

-- 1) Asus Zenbook — ORD-20260711102010005 (CONFIRMED) — variant 32
UPDATE product_items
SET serial_number = 'ES-DEMO-ZENBOOK-001',
    imei          = 'ES-DEMO-ZENBOOK-001',
    status        = 'RESERVED',
    reserved_at   = NOW()
WHERE id = 994 AND variant_id = 32;

USE electro_order_db;

INSERT INTO order_item_serials (order_detail_id, product_item_id, imei, serial_number)
SELECT 137, 994, 'ES-DEMO-ZENBOOK-001', 'ES-DEMO-ZENBOOK-001'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM order_item_serials WHERE order_detail_id = 137
);

USE electro_catalog_db;

-- 2) Adapter 5W — ORD-20260711101903934 (CONFIRMED) — variant 729
UPDATE product_items pi
JOIN (
    SELECT id FROM product_items
    WHERE variant_id = 729 AND status = 'AVAILABLE'
    ORDER BY id LIMIT 1
) src ON pi.id = src.id
SET pi.serial_number = 'ES-DEMO-ADPT5W-001',
    pi.imei          = 'ES-DEMO-ADPT5W-001',
    pi.status        = 'RESERVED',
    pi.reserved_at   = NOW();

USE electro_order_db;

INSERT INTO order_item_serials (order_detail_id, product_item_id, imei, serial_number)
SELECT 136, pi.id, 'ES-DEMO-ADPT5W-001', 'ES-DEMO-ADPT5W-001'
FROM electro_catalog_db.product_items pi
WHERE pi.serial_number = 'ES-DEMO-ADPT5W-001'
  AND NOT EXISTS (SELECT 1 FROM order_item_serials WHERE order_detail_id = 136);

USE electro_catalog_db;

-- 3) Adapter 65W — ORD-20260711101752259 (CONFIRMED) — variant 184
UPDATE product_items pi
JOIN (
    SELECT id FROM product_items
    WHERE variant_id = 184 AND status = 'AVAILABLE'
    ORDER BY id LIMIT 1
) src ON pi.id = src.id
SET pi.serial_number = 'ES-DEMO-ADPT65W-001',
    pi.imei          = 'ES-DEMO-ADPT65W-001',
    pi.status        = 'RESERVED',
    pi.reserved_at   = NOW();

USE electro_order_db;

INSERT INTO order_item_serials (order_detail_id, product_item_id, imei, serial_number)
SELECT 135, pi.id, 'ES-DEMO-ADPT65W-001', 'ES-DEMO-ADPT65W-001'
FROM electro_catalog_db.product_items pi
WHERE pi.serial_number = 'ES-DEMO-ADPT65W-001'
  AND NOT EXISTS (SELECT 1 FROM order_item_serials WHERE order_detail_id = 135);

USE electro_catalog_db;

-- 4) Đồng hồ thông minh — ORD-20260711100927170 (COMPLETED) — variant 1699 + kích hoạt BH
UPDATE product_items pi
JOIN (
    SELECT id FROM product_items
    WHERE variant_id = 1699 AND status = 'AVAILABLE'
    ORDER BY id LIMIT 1
) src ON pi.id = src.id
SET pi.serial_number      = 'ES-DEMO-WATCH-001',
    pi.imei               = 'ES-DEMO-WATCH-001',
    pi.status             = 'SOLD',
    pi.sold_at            = NOW(),
    pi.warranty_start_date = '2026-07-11',
    pi.warranty_months    = 12;

USE electro_order_db;

INSERT INTO order_item_serials (order_detail_id, product_item_id, imei, serial_number)
SELECT 134, pi.id, 'ES-DEMO-WATCH-001', 'ES-DEMO-WATCH-001'
FROM electro_catalog_db.product_items pi
WHERE pi.serial_number = 'ES-DEMO-WATCH-001'
  AND NOT EXISTS (SELECT 1 FROM order_item_serials WHERE order_detail_id = 134);

-- Kiểm tra kết quả
SELECT o.order_code, o.status, ois.serial_number, ois.product_item_id
FROM orders o
JOIN order_details od ON od.order_id = o.id
LEFT JOIN order_item_serials ois ON ois.order_detail_id = od.id
WHERE o.id IN (118, 119, 120, 121)
ORDER BY o.id DESC;
