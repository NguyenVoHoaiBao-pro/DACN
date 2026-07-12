#!/usr/bin/env python3
"""Báo cáo serial PHONE_TABLET."""
import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"


def main() -> int:
    env = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    conn = pymysql.connect(
        host=env["MYSQL_HOST"],
        port=int(env["MYSQL_PORT"]),
        user=env["MYSQL_USER"],
        password=env["MYSQL_PASSWORD"],
        database="electro_catalog_db",
        charset="utf8mb4",
        ssl=ctx,
    )
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(DISTINCT p.id), COUNT(DISTINCT v.id), SUM(v.stock_quantity)
            FROM products p
            JOIN product_types pt ON pt.id = p.product_type_id
            JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1
            WHERE pt.code = 'PHONE_TABLET' AND p.is_active = 1
            """
        )
        products, variants, stock = cur.fetchone()
        cur.execute(
            """
            SELECT COUNT(*)
            FROM product_items pi
            JOIN product_variants v ON v.id = pi.variant_id
            JOIN products p ON p.id = v.product_id
            JOIN product_types pt ON pt.id = p.product_type_id
            WHERE pt.code = 'PHONE_TABLET' AND pi.status = 'AVAILABLE'
            """
        )
        avail = cur.fetchone()[0]
        cur.execute(
            """
            SELECT v.id, v.sku_code, p.name, v.stock_quantity,
                   (SELECT COUNT(*) FROM product_items pi
                    WHERE pi.variant_id = v.id AND pi.status = 'AVAILABLE') AS avail
            FROM product_variants v
            JOIN products p ON p.id = v.product_id
            JOIN product_types pt ON pt.id = p.product_type_id
            WHERE pt.code = 'PHONE_TABLET' AND v.is_active = 1
              AND v.stock_quantity > 0
              AND (SELECT COUNT(*) FROM product_items pi
                   WHERE pi.variant_id = v.id AND pi.status = 'AVAILABLE') < v.stock_quantity
            ORDER BY v.id
            LIMIT 20
            """
        )
        gaps = cur.fetchall()

    print(f"PHONE_TABLET: {products} products, {variants} variants, stock={stock}, avail_serials={avail}")
    print(f"Variants still missing serials: {len(gaps)}")
    for row in gaps:
        print("  gap:", row)
    conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
