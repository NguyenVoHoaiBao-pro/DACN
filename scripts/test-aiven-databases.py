#!/usr/bin/env python3
"""Test Aiven MySQL connection and sample data for each microservice database."""
from __future__ import annotations

import ssl
import sys
from pathlib import Path

try:
    import pymysql
except ImportError:
    print("Can pymysql: pip install pymysql")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent

# Load .env if present
env_path = ROOT / ".env"
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        import os

        os.environ.setdefault(k.strip(), v.strip())

HOST = "mysql-11ae5c82-cjcakvalvajvjallh.i.aivencloud.com"
PORT = int(__import__("os").environ.get("MYSQL_PORT", "28570"))
USER = __import__("os").environ.get("MYSQL_USER", "avnadmin")
PASSWORD = __import__("os").environ.get("MYSQL_PASSWORD", "")

DATABASES = [
    ("catalog-service", "electro_catalog_db", "products", "SELECT id, name, base_price FROM products ORDER BY id LIMIT 3"),
    ("user-service", "electro_user_db", "users", "SELECT id, username, email FROM users ORDER BY id LIMIT 3"),
    ("cart-service", "electro_cart_db", "carts", "SELECT id, user_id, created_at FROM carts ORDER BY id LIMIT 3"),
    ("order-service", "electro_order_db", "orders", "SELECT id, user_id, status, total_amount FROM orders ORDER BY id LIMIT 3"),
    ("review-service", "electro_review_db", "reviews", "SELECT id, product_id, user_id, rating FROM reviews ORDER BY id LIMIT 3"),
    (
        "statistics-service",
        "electro_statistics_db",
        "user_interactions",
        "SELECT id, user_id, product_id, action_type FROM user_interactions ORDER BY id LIMIT 3",
    ),
]


def connect(db: str):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        database=db,
        ssl=ctx,
        charset="utf8mb4",
        connect_timeout=30,
        cursorclass=pymysql.cursors.DictCursor,
    )


def main() -> int:
    if not PASSWORD:
        print("ERROR: MYSQL_PASSWORD not set (.env or env var)")
        return 1

    print("=" * 70)
    print(f"Aiven MySQL test: {HOST}:{PORT} user={USER}")
    print("=" * 70)

    failed = 0
    for service, db, table, query in DATABASES:
        print(f"\n[{service}] -> {db}")
        try:
            conn = connect(db)
            with conn.cursor() as cur:
                cur.execute("SELECT DATABASE() AS db, COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = %s", (db,))
                meta = cur.fetchone()
                cur.execute(f"SELECT COUNT(*) AS row_count FROM `{table}`")
                count = cur.fetchone()["row_count"]
                cur.execute(query)
                rows = cur.fetchall()
            conn.close()
            print(f"  OK  Connected | tables in schema | `{table}` rows: {count}")
            for i, row in enumerate(rows, 1):
                print(f"  sample {i}: {row}")
        except Exception as e:
            failed += 1
            print(f"  FAIL: {e}")

    print("\n" + "=" * 70)
    if failed:
        print(f"KET QUA: {len(DATABASES) - failed}/{len(DATABASES)} thanh cong, {failed} loi")
        return 1
    print(f"KET QUA: Tat ca {len(DATABASES)} database ket noi OK va co du lieu mau")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
