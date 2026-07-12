#!/usr/bin/env python3
"""
Seed serial/IMEI AVAILABLE cho mọi product_variant còn tồn kho.

- Idempotent: chỉ chèn phần thiếu (stock_quantity - count AVAILABLE).
- Prefix serial: ES{variant_id:06d}{seq:07d} (unique toàn cục).
- Chạy: python database/migrations/run_seed_product_serials.py
- Dry-run: python database/migrations/run_seed_product_serials.py --dry-run
- Một SKU: python database/migrations/run_seed_product_serials.py --sku TAB-118-128GB
- Một danh mục: python database/migrations/run_seed_product_serials.py --category-code PHONE_TABLET
"""

from __future__ import annotations

import argparse
import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_catalog_db"
BATCH_SIZE = 500
SERIAL_PREFIX = "ES"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.is_file():
        raise FileNotFoundError(f"Không tìm thấy {path}")
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


def fetch_gaps(
    cursor,
    max_per_variant: int | None,
    category_code: str | None = None,
) -> list[tuple[int, str, int, int]]:
    category_filter = ""
    params: list = []
    if category_code:
        category_filter = """
          AND EXISTS (
            SELECT 1 FROM products p
            JOIN product_types pt ON pt.id = p.product_type_id
            WHERE p.id = v.product_id AND pt.code = %s
          )
        """
        params.append(category_code)

    cursor.execute(
        f"""
        SELECT v.id, v.sku_code, v.stock_quantity, COALESCE(av.cnt, 0) AS avail
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
          {category_filter}
        ORDER BY v.id
        """,
        params,
    )
    rows = []
    for vid, sku, stock, avail in cursor.fetchall():
        need = stock - avail
        if max_per_variant is not None:
            need = min(need, max_per_variant)
        if need > 0:
            rows.append((vid, sku, stock, need))
    return rows


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


def ensure_category_flags(cursor, category_code: str, dry_run: bool) -> None:
    """Bật requires_imei + requires_serial cho sản phẩm thuộc danh mục."""
    cursor.execute(
        """
        SELECT COUNT(*) FROM products p
        JOIN product_types pt ON pt.id = p.product_type_id
        WHERE pt.code = %s AND (p.requires_imei = 0 OR p.requires_imei IS NULL)
        """,
        (category_code,),
    )
    need_imei = cursor.fetchone()[0]
    cursor.execute(
        """
        SELECT COUNT(*) FROM product_variants v
        JOIN products p ON p.id = v.product_id
        JOIN product_types pt ON pt.id = p.product_type_id
        WHERE pt.code = %s AND v.is_active = 1 AND (v.requires_serial = 0 OR v.requires_serial IS NULL)
        """,
        (category_code,),
    )
    need_serial = cursor.fetchone()[0]
    print(f"Products need requires_imei=1: {need_imei}")
    print(f"Variants need requires_serial=1: {need_serial}")
    if dry_run or (need_imei == 0 and need_serial == 0):
        return
    cursor.execute(
        """
        UPDATE products p
        JOIN product_types pt ON pt.id = p.product_type_id
        SET p.requires_imei = 1, p.updated_at = NOW()
        WHERE pt.code = %s AND (p.requires_imei = 0 OR p.requires_imei IS NULL)
        """,
        (category_code,),
    )
    cursor.execute(
        """
        UPDATE product_variants v
        JOIN products p ON p.id = v.product_id
        JOIN product_types pt ON pt.id = p.product_type_id
        SET v.requires_serial = 1, v.updated_at = NOW()
        WHERE pt.code = %s AND v.is_active = 1
          AND (v.requires_serial = 0 OR v.requires_serial IS NULL)
        """,
        (category_code,),
    )
    print(f"Updated requires_imei / requires_serial for category {category_code!r}")


def ensure_all_category_flags(cursor, dry_run: bool) -> None:
    """Bật requires_imei + requires_serial cho mọi sản phẩm/biến thể active còn hàng."""
    cursor.execute(
        """
        SELECT COUNT(*) FROM products p
        WHERE p.is_active = 1 AND (p.requires_imei = 0 OR p.requires_imei IS NULL)
        """
    )
    need_imei = cursor.fetchone()[0]
    cursor.execute(
        """
        SELECT COUNT(*) FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.is_active = 1 AND p.is_active = 1
          AND (v.requires_serial = 0 OR v.requires_serial IS NULL)
        """
    )
    need_serial = cursor.fetchone()[0]
    print(f"[All categories] products need requires_imei=1: {need_imei}")
    print(f"[All categories] variants need requires_serial=1: {need_serial}")
    if dry_run or (need_imei == 0 and need_serial == 0):
        return
    cursor.execute(
        """
        UPDATE products SET requires_imei = 1, updated_at = NOW()
        WHERE is_active = 1 AND (requires_imei = 0 OR requires_imei IS NULL)
        """
    )
    cursor.execute(
        """
        UPDATE product_variants v
        JOIN products p ON p.id = v.product_id
        SET v.requires_serial = 1, v.updated_at = NOW()
        WHERE v.is_active = 1 AND p.is_active = 1
          AND (v.requires_serial = 0 OR v.requires_serial IS NULL)
        """
    )
    print("Updated requires_imei / requires_serial for all active products")


def build_rows(variant_id: int, start_seq: int, count: int) -> list[tuple]:
    loc = shelf_location(variant_id)
    rows = []
    for i in range(count):
        seq = start_seq + i
        code = serial_code(variant_id, seq)
        rows.append(
            (
                variant_id,
                code,
                code,
                "BATCH_SEED_2026",
                loc,
                "Auto-seed serial for warehouse FIFO",
            )
        )
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed serial AVAILABLE cho toàn bộ variant còn hàng")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ in thống kê, không INSERT")
    parser.add_argument(
        "--max-per-variant",
        type=int,
        default=None,
        help="Giới hạn số serial chèn mỗi variant (demo nhanh). Mặc định: đủ bằng stock_quantity",
    )
    parser.add_argument("--sku", type=str, default=None, help="Chỉ seed một SKU")
    parser.add_argument(
        "--category-code",
        type=str,
        default=None,
        help="Chỉ seed variant thuộc danh mục (vd: PHONE_TABLET)",
    )
    args = parser.parse_args()

    env = load_env(ENV_FILE)
    required = ("MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD")
    missing = [k for k in required if k not in env]
    if missing:
        print("Missing .env keys:", ", ".join(missing))
        return 1

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
            if args.category_code:
                ensure_category_flags(cur, args.category_code, args.dry_run)
                if not args.dry_run:
                    conn.commit()
            elif not args.sku:
                ensure_all_category_flags(cur, args.dry_run)
                if not args.dry_run:
                    conn.commit()

            gaps = fetch_gaps(cur, args.max_per_variant, args.category_code)
            if args.sku:
                gaps = [g for g in gaps if g[1] == args.sku]
                if not gaps:
                    print(f"No serial gap for SKU {args.sku!r} (or stock=0).")
                    return 0

            total = sum(g[3] for g in gaps)
            print("=== Seed product serials ===")
            if args.category_code:
                print(f"Category filter: {args.category_code}")
            print(f"Variants missing serials: {len(gaps)}")
            print(f"Total serials to insert: {total}")
            if args.dry_run:
                for vid, sku, stock, need in gaps[:10]:
                    print(f"  variant {vid} {sku}: stock={stock}, insert={need}")
                if len(gaps) > 10:
                    print(f"  ... and {len(gaps) - 10} more variants")
                return 0

            inserted = 0
            batch: list[tuple] = []
            for vid, _sku, _stock, need in gaps:
                start = max_existing_seq(cur, vid) + 1
                batch.extend(build_rows(vid, start, need))
                while len(batch) >= BATCH_SIZE:
                    chunk = batch[:BATCH_SIZE]
                    batch = batch[BATCH_SIZE:]
                    cur.executemany(insert_sql, chunk)
                    inserted += len(chunk)
                    conn.commit()
                    print(f"  inserted {inserted}/{total}...")

            if batch:
                cur.executemany(insert_sql, batch)
                inserted += len(batch)
                conn.commit()

            print(f"\n=== Done: {inserted} serial AVAILABLE ===")

            if args.sku:
                cur.execute(
                    """
                    SELECT v.sku_code, v.stock_quantity,
                           (SELECT COUNT(*) FROM product_items pi
                            WHERE pi.variant_id = v.id AND pi.status = 'AVAILABLE') AS avail
                    FROM product_variants v WHERE v.sku_code = %s
                    """,
                    (args.sku,),
                )
                print("Verify SKU:", cur.fetchone())
            else:
                still_sql = """
                    SELECT COUNT(*) FROM product_variants v
                    WHERE v.is_active = 1 AND v.stock_quantity > 0
                      AND (
                        SELECT COUNT(*) FROM product_items pi
                        WHERE pi.variant_id = v.id AND pi.status = 'AVAILABLE'
                      ) < v.stock_quantity
                """
                still_params: list = []
                if args.category_code:
                    still_sql += """
                      AND EXISTS (
                        SELECT 1 FROM products p
                        JOIN product_types pt ON pt.id = p.product_type_id
                        WHERE p.id = v.product_id AND pt.code = %s
                      )
                    """
                    still_params.append(args.category_code)
                cur.execute(still_sql, still_params)
                print(f"Variants still missing serials: {cur.fetchone()[0]}")

            print("Refresh picking screen - FIFO serial should appear.")
            return 0
    except Exception as exc:
        conn.rollback()
        print("Seed failed:", exc)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
