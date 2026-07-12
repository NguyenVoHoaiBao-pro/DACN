#!/usr/bin/env python3
"""
Khoi phuc stock + seed 673 serial cho danh muc Laptop & Desktop (product_type_id=12).

Chay: python database/migrations/run_seed_laptop_desktop_serials.py
"""

from __future__ import annotations

import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_catalog_db"
CATEGORY_ID = 12
BATCH_SIZE = 500
SERIAL_PREFIX = "ES"

# stock_quantity goc (tong 673) truoc khi kiem ke dieu chinh ve 0
LAPTOP_DESKTOP_STOCK = {
    "LAP-APP-62255-8GB": 103,
    "LAP-APP-60299-16GB": 70,
    "LAP-APP-64321-32GB": 50,
    "LAP-APP-11490-8GB": 50,
    "LAP-APP-48348-16GB": 50,
    "LAP-APP-22573-32GB": 50,
    "LAP-APP-10941-8GB": 50,
    "LAP-APP-27069-16GB": 50,
    "LAP-APP-23435-32GB": 50,
    "LAP-APP-46185-8GB": 50,
    "LAP-APP-92037-16GB": 50,
    "LAP-APP-15621-32GB": 50,
}


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def shelf_location(variant_id: int) -> str:
    shelf = chr(65 + (variant_id % 3))
    floor = 1 + (variant_id % 3)
    slot = 1 + (variant_id % 10)
    return f"Ke {shelf} - Tang {floor} - O {slot}"


def serial_code(variant_id: int, seq: int) -> str:
    return f"{SERIAL_PREFIX}{variant_id:06d}{seq:07d}"


def max_existing_seq(cursor, variant_id: int) -> int:
    prefix = f"{SERIAL_PREFIX}{variant_id:06d}"
    cursor.execute(
        """
        SELECT MAX(CAST(SUBSTRING(serial_number, %s) AS UNSIGNED))
        FROM product_items
        WHERE serial_number LIKE %s
        """,
        (len(prefix) + 1, f"{prefix}%"),
    )
    row = cursor.fetchone()
    return int(row[0]) if row and row[0] is not None else 0


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
        autocommit=False,
    )

    insert_sql = """
        INSERT INTO product_items (
            variant_id, serial_number, imei, batch_number,
            warranty_months, status, `condition`, location, notes,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s,
            12, 'AVAILABLE', 'NEW', %s, %s,
            NOW(), NOW()
        )
    """

    try:
        with conn.cursor() as cur:
            print("=== Laptop & Desktop serial restore ===")
            print(f"Target stock total: {sum(LAPTOP_DESKTOP_STOCK.values())}")

            # 1. Restore stock_quantity
            for sku, stock in LAPTOP_DESKTOP_STOCK.items():
                cur.execute(
                    """
                    UPDATE product_variants v
                    JOIN products p ON p.id = v.product_id
                    SET v.stock_quantity = %s
                    WHERE v.sku_code = %s AND p.product_type_id = %s
                    """,
                    (stock, sku, CATEGORY_ID),
                )
                print(f"  stock {sku} -> {stock} (rows {cur.rowcount})")

            # 2. Fetch variants + available counts
            cur.execute(
                """
                SELECT v.id, v.sku_code, v.stock_quantity, COALESCE(av.cnt, 0)
                FROM product_variants v
                JOIN products p ON p.id = v.product_id
                LEFT JOIN (
                    SELECT variant_id, COUNT(*) cnt FROM product_items
                    WHERE status = 'AVAILABLE' GROUP BY variant_id
                ) av ON av.variant_id = v.id
                WHERE p.product_type_id = %s AND v.is_active = 1
                ORDER BY v.sku_code
                """,
                (CATEGORY_ID,),
            )
            variants = cur.fetchall()

            total_insert = 0
            batch: list[tuple] = []
            for vid, sku, stock, avail in variants:
                need = int(stock) - int(avail)
                if need <= 0:
                    print(f"  skip seed {sku}: already {avail}/{stock}")
                    continue
                start = max_existing_seq(cur, vid) + 1
                loc = shelf_location(vid)
                for i in range(need):
                    seq = start + i
                    code = serial_code(vid, seq)
                    batch.append(
                        (vid, code, code, "BATCH_LAPTOP_DESKTOP_2026", loc,
                         "Restore serial Laptop Desktop demo")
                    )
                total_insert += need
                print(f"  seed {sku}: +{need} (avail {avail} -> {stock})")

                while len(batch) >= BATCH_SIZE:
                    chunk = batch[:BATCH_SIZE]
                    batch = batch[BATCH_SIZE:]
                    cur.executemany(insert_sql, chunk)
                    conn.commit()

            if batch:
                cur.executemany(insert_sql, batch)
                conn.commit()

            print(f"\nInserted {total_insert} new serials")

            # Verify
            cur.execute(
                """
                SELECT COUNT(*) FROM product_items pi
                JOIN product_variants v ON v.id = pi.variant_id
                JOIN products p ON p.id = v.product_id
                WHERE p.product_type_id = %s AND pi.status = 'AVAILABLE'
                """,
                (CATEGORY_ID,),
            )
            avail_total = cur.fetchone()[0]
            cur.execute(
                """
                SELECT SUM(v.stock_quantity) FROM product_variants v
                JOIN products p ON p.id = v.product_id
                WHERE p.product_type_id = %s AND v.is_active = 1
                """,
                (CATEGORY_ID,),
            )
            stock_total = cur.fetchone()[0]
            print(f"=== Result: stock={stock_total}, AVAILABLE serials={avail_total} ===")
            conn.commit()
            return 0
    except Exception as exc:
        conn.rollback()
        print("Failed:", exc)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
