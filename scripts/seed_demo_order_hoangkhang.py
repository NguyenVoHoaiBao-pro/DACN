"""Seed demo DELIVERED order with IMEI for user nguyenbibi280@gmail.com (id 10565)."""
from datetime import datetime
from pathlib import Path

import pymysql

env = {}
for line in Path(".env").read_text(encoding="utf-8", errors="ignore").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

USER_ID = 10565
USER_EMAIL = "nguyenbibi280@gmail.com"
# SOLD + con han BH den 08/12/2026
PRODUCT_ITEM_ID = 1
IMEI = "IMEI_CON_HAN_001"
VARIANT_ID = 115
PRODUCT_NAME = "Adapter Sạc Type C PD 20W Anker PowerPort III Nano A2633"
VARIANT_NAME = "Đen"
SKU = "STD-1-DEF"
UNIT_PRICE = 250000.00


def connect(db):
    return pymysql.connect(
        host=env["MYSQL_HOST"],
        port=int(env["MYSQL_PORT"]),
        user=env["MYSQL_USER"],
        password=env["MYSQL_PASSWORD"],
        database=db,
        ssl={"ssl": True},
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def main():
    uc = connect("electro_user_db")
    c = uc.cursor()
    c.execute("SELECT id, name, email, phone FROM users WHERE id=%s", (USER_ID,))
    user = c.fetchone()
    if not user:
        raise SystemExit(f"User id {USER_ID} not found")
    print("User:", user)

    cat = connect("electro_catalog_db")
    cc = cat.cursor()
    cc.execute(
        "SELECT id, imei, status, warranty_start_date, warranty_months, variant_id FROM product_items WHERE id=%s",
        (PRODUCT_ITEM_ID,),
    )
    item = cc.fetchone()
    if not item or item["imei"] != IMEI:
        raise SystemExit(f"Product item {PRODUCT_ITEM_ID} / {IMEI} not found")
    print("IMEI item:", item)

    oc = connect("electro_order_db")
    cur = oc.cursor()

    # Skip if demo order already exists for this user+IMEI
    cur.execute(
        """
        SELECT o.id, o.order_code, o.status
        FROM orders o
        JOIN order_details od ON od.order_id = o.id
        JOIN order_item_serials ois ON ois.order_detail_id = od.id
        WHERE o.user_id = %s AND ois.product_item_id = %s
        LIMIT 1
        """,
        (USER_ID, PRODUCT_ITEM_ID),
    )
    existing = cur.fetchone()
    if existing:
        oc.commit()
        print("\n=== DA CO DON DEMO ===")
        print(f"order_id={existing['id']} code={existing['order_code']} status={existing['status']}")
        print(f"IMEI demo: {IMEI}")
        return

    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM orders")
    order_id = cur.fetchone()["n"]
    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM order_details")
    detail_id = cur.fetchone()["n"]
    cur.execute("SELECT COALESCE(MAX(id), 0) + 1 AS n FROM order_item_serials")
    serial_id = cur.fetchone()["n"]

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    order_code = datetime.now().strftime("ORD-DEMO-%Y%m%d%H%M%S")

    shipping_name = user["name"] or "Nguyễn Lê Hoàng Khang"
    shipping_phone = user["phone"] or "0567649206"

    cur.execute(
        """
        INSERT INTO orders (
            id, order_code, user_id, shipping_name, shipping_phone, shipping_address,
            shipping_province, shipping_district, shipping_ward, shipping_fee,
            subtotal, discount_amount, total_amount, status, payment_method, payment_status,
            note, order_date, confirmed_at, shipped_at, delivered_at, paid_at, is_hidden
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s
        )
        """,
        (
            order_id,
            order_code,
            USER_ID,
            shipping_name,
            shipping_phone,
            "15 Lê Văn Sỹ, Phường 12, Quận 3, TP.HCM",
            "TP. Hồ Chí Minh",
            "Quận 3",
            "Phường 12",
            30000.00,
            UNIT_PRICE,
            0.00,
            UNIT_PRICE + 30000.00,
            "DELIVERED",
            "COD",
            "PAID",
            "DON DEMO BH ONLINE - Hoang Khang",
            now,
            now,
            now,
            now,
            now,
            0,
        ),
    )

    cur.execute(
        """
        INSERT INTO order_details (
            id, order_id, variant_id, product_name, variant_name, sku_code,
            quantity, unit_price, discount_amount, total_price, warranty_months, created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            detail_id,
            order_id,
            VARIANT_ID,
            PRODUCT_NAME,
            VARIANT_NAME,
            SKU,
            1,
            UNIT_PRICE,
            0.00,
            UNIT_PRICE,
            12,
            now,
        ),
    )

    cur.execute(
        """
        INSERT INTO order_item_serials (id, order_detail_id, product_item_id, created_at)
        VALUES (%s, %s, %s, %s)
        """,
        (serial_id, detail_id, PRODUCT_ITEM_ID, now),
    )

    # Ensure catalog item is SOLD with warranty (already should be)
    cc.execute(
        """
        UPDATE product_items
        SET status='SOLD', warranty_start_date='2025-12-08', warranty_months=12,
            sold_at=COALESCE(sold_at, %s)
        WHERE id=%s
        """,
        (now, PRODUCT_ITEM_ID),
    )

    oc.commit()
    cat.commit()

    print("\n=== TAO DON DEMO THANH CONG ===")
    print(f"Khach: {user['name']} ({USER_EMAIL}) user_id={USER_ID}")
    print(f"Ma don: {order_code} (id={order_id})")
    print(f"Trang thai: DELIVERED | COD | PAID")
    print(f"San pham: {PRODUCT_NAME}")
    print(f"\n>>> IMEI DE DEMO YEU CAU BAO HANH: {IMEI}")
    print(f"    BH tu 08/12/2025 den 08/12/2026 (con han)")
    print("\nHuong dan:")
    print("1. Dang nhap nguyenbibi280@gmail.com")
    print("2. Vao /warranty-check hoac form Yeu cau BH online")
    print(f"3. Nhap IMEI: {IMEI}")

    uc.close()
    cat.close()
    oc.close()


if __name__ == "__main__":
    main()
