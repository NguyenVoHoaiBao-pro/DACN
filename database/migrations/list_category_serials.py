#!/usr/bin/env python3
"""List AVAILABLE serials by product category name (electro_catalog_db)."""
import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_catalog_db"

# Usage: python list_category_serials.py "Laptop"
SEARCH = sys.argv[1] if len(sys.argv) > 1 else "Laptop"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def main() -> int:
    env = load_env(ENV_FILE)
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
    conn = pymysql.connect(
        host=env["MYSQL_HOST"],
        port=int(env["MYSQL_PORT"]),
        user=env["MYSQL_USER"],
        password=env["MYSQL_PASSWORD"],
        database=DB_NAME,
        charset="utf8mb4",
        ssl=ssl_ctx,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, code, parent_id
                FROM product_types
                WHERE is_active = 1
                  AND (LOWER(name) LIKE LOWER(%s) OR LOWER(code) LIKE LOWER(%s))
                ORDER BY id
                """,
                (f"%{SEARCH}%", f"%{SEARCH}%"),
            )
            types = cur.fetchall()
            if not types:
                print(f"No category matching: {SEARCH!r}")
                return 1

            print("=== Matching categories ===")
            for tid, name, code, parent_id in types:
                print(f"  id={tid}  code={code}  parent_id={parent_id}  name={name}")

            type_ids = [t[0] for t in types]
            placeholders = ",".join(["%s"] * len(type_ids))
            cur.execute(
                f"""
                SELECT
                    pt.id AS type_id,
                    pt.name AS category_name,
                    p.name AS product_name,
                    v.id AS variant_id,
                    v.sku_code,
                    v.variant_name,
                    v.stock_quantity,
                    pi.serial_number,
                    pi.imei,
                    pi.status,
                    pi.location
                FROM product_items pi
                JOIN product_variants v ON v.id = pi.variant_id
                JOIN products p ON p.id = v.product_id
                JOIN product_types pt ON pt.id = p.product_type_id
                WHERE pi.status = 'AVAILABLE'
                  AND pi.serial_number IS NOT NULL
                  AND (
                    pt.id IN ({placeholders})
                    OR pt.parent_id IN ({placeholders})
                  )
                ORDER BY pt.name, p.name, v.sku_code, pi.created_at ASC
                """,
                type_ids + type_ids,
            )
            rows = cur.fetchall()
            print(f"\n=== AVAILABLE serials: {len(rows)} ===\n")
            current_sku = None
            for row in rows:
                sku = row[4]
                if sku != current_sku:
                    current_sku = sku
                    print(f"\n--- [{row[1]}] {row[2]} | {row[5] or 'default'} | SKU: {sku} | stock={row[6]} ---")
                loc = row[10] or "-"
                print(f"  {row[7]}  (imei={row[8]}, loc={loc})")

            cur.execute(
                f"""
                SELECT COUNT(DISTINCT v.id)
                FROM product_variants v
                JOIN products p ON p.id = v.product_id
                JOIN product_types pt ON pt.id = p.product_type_id
                WHERE v.is_active = 1 AND v.stock_quantity > 0
                  AND (pt.id IN ({placeholders}) OR pt.parent_id IN ({placeholders}))
                """,
                type_ids + type_ids,
            )
            variants_with_stock = cur.fetchone()[0]
            cur.execute(
                f"""
                SELECT COUNT(DISTINCT v.id)
                FROM product_variants v
                JOIN products p ON p.id = v.product_id
                JOIN product_types pt ON pt.id = p.product_type_id
                WHERE v.is_active = 1 AND v.stock_quantity > 0
                  AND (pt.id IN ({placeholders}) OR pt.parent_id IN ({placeholders}))
                  AND NOT EXISTS (
                    SELECT 1 FROM product_items pi
                    WHERE pi.variant_id = v.id AND pi.status = 'AVAILABLE'
                  )
                """,
                type_ids + type_ids,
            )
            variants_no_serial = cur.fetchone()[0]
            print(f"\n=== Summary ===")
            print(f"Variants with stock > 0: {variants_with_stock}")
            print(f"Variants with stock but NO AVAILABLE serial: {variants_no_serial}")
            if variants_no_serial:
                print("WARN: Run run_seed_product_serials.py for missing serials before audit.")
            return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
