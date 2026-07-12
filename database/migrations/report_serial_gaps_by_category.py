#!/usr/bin/env python3
"""Báo cáo serial thiếu theo danh mục sản phẩm."""
import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_catalog_db"


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
        database=DB_NAME,
        charset="utf8mb4",
        ssl=ctx,
    )

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                pt.id,
                pt.code,
                pt.name,
                COUNT(DISTINCT v.id) AS variants_with_gap,
                SUM(GREATEST(v.stock_quantity - COALESCE(av.cnt, 0), 0)) AS serials_needed
            FROM product_types pt
            JOIN products p ON p.product_type_id = pt.id AND p.is_active = 1
            JOIN product_variants v ON v.product_id = p.id AND v.is_active = 1 AND v.stock_quantity > 0
            LEFT JOIN (
                SELECT variant_id, COUNT(*) AS cnt
                FROM product_items
                WHERE status = 'AVAILABLE'
                GROUP BY variant_id
            ) av ON av.variant_id = v.id
            WHERE COALESCE(av.cnt, 0) < v.stock_quantity
            GROUP BY pt.id, pt.code, pt.name
            ORDER BY serials_needed DESC
            """
        )
        rows = cur.fetchall()

        cur.execute(
            """
            SELECT COUNT(DISTINCT v.id),
                   SUM(GREATEST(v.stock_quantity - COALESCE(av.cnt, 0), 0))
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
            """
        )
        total_variants, total_serials = cur.fetchone()

        cur.execute("SELECT COUNT(*) FROM product_types WHERE is_active = 1")
        total_categories = cur.fetchone()[0]

    conn.close()

    print("=== Báo cáo serial thiếu theo danh mục ===")
    print(f"Tổng danh mục active: {total_categories}")
    print(f"Danh mục còn thiếu serial: {len(rows)}")
    print(f"Variant cần bổ sung: {total_variants}")
    print(f"Tổng serial cần chèn: {total_serials}")
    print()
    if not rows:
        print("Tất cả danh mục đã đủ serial AVAILABLE.")
        return 0
    print(f"{'ID':<4} {'CODE':<18} {'VARIANTS':>8} {'CẦN CHÈN':>10}  TÊN")
    print("-" * 70)
    for pt_id, code, name, variants, need in rows:
        print(f"{pt_id:<4} {code:<18} {variants:>8} {need:>10}  {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
