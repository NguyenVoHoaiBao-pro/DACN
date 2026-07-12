#!/usr/bin/env python3
"""
Gán IMEI/Serial còn thiếu cho đơn SHIPPING / DELIVERED / COMPLETED.

- Lấy serial AVAILABLE từ electro_catalog_db (đúng variant_id).
- Ghi order_item_serials + đánh dấu product_items SOLD + kích hoạt BH.
- Idempotent: bỏ qua dòng đã đủ serial.

Chạy:
  python database/migrations/run_assign_missing_order_imeis.py --dry-run
  python database/migrations/run_assign_missing_order_imeis.py
  python database/migrations/run_assign_missing_order_imeis.py --order-code ORD-20250613112836800
"""

from __future__ import annotations

import argparse
import ssl
import sys
from datetime import date, datetime
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
ORDER_DB = "electro_order_db"
CATALOG_DB = "electro_catalog_db"
TARGET_STATUSES = ("SHIPPING", "DELIVERED", "COMPLETED")


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def connect(env: dict[str, str], database: str):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pymysql.connect(
        host=env["MYSQL_HOST"],
        port=int(env["MYSQL_PORT"]),
        user=env["MYSQL_USER"],
        password=env["MYSQL_PASSWORD"],
        database=database,
        charset="utf8mb4",
        ssl=ctx,
        autocommit=False,
    )


def table_columns(cursor, table: str) -> set[str]:
    cursor.execute(
        """
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
        """,
        (table,),
    )
    return {row[0] for row in cursor.fetchall()}


def fetch_gaps(order_cur, order_code: str | None) -> list[dict]:
    sql = """
        SELECT
            o.id AS order_id,
            o.order_code,
            o.status,
            o.delivered_at,
            o.order_date,
            od.id AS order_detail_id,
            od.variant_id,
            od.product_name,
            od.quantity,
            COUNT(oi.id) AS assigned
        FROM orders o
        JOIN order_details od ON od.order_id = o.id
        LEFT JOIN order_item_serials oi ON oi.order_detail_id = od.id
        WHERE o.status IN (%s, %s, %s)
          AND (o.is_hidden = 0 OR o.is_hidden IS NULL)
          AND od.variant_id IS NOT NULL
    """
    params: list = list(TARGET_STATUSES)
    if order_code:
        sql += " AND o.order_code = %s"
        params.append(order_code)
    sql += """
        GROUP BY o.id, o.order_code, o.status, o.delivered_at, o.order_date,
                 od.id, od.variant_id, od.product_name, od.quantity
        HAVING assigned < od.quantity
        ORDER BY o.order_date DESC, od.id
    """
    order_cur.execute(sql, params)
    cols = [d[0] for d in order_cur.description]
    rows = []
    for raw in order_cur.fetchall():
        row = dict(zip(cols, raw))
        row["need"] = int(row["quantity"]) - int(row["assigned"])
        rows.append(row)
    return rows


def pick_serials(catalog_cur, variant_id: int, count: int) -> list[tuple]:
    catalog_cur.execute(
        """
        SELECT id, imei, serial_number
        FROM product_items
        WHERE variant_id = %s AND status = 'AVAILABLE'
        ORDER BY id
        LIMIT %s
        """,
        (variant_id, count),
    )
    return list(catalog_cur.fetchall())


def warranty_start(row: dict) -> date:
    if row.get("delivered_at"):
        dt = row["delivered_at"]
        return dt.date() if isinstance(dt, datetime) else dt
    if row.get("order_date"):
        dt = row["order_date"]
        return dt.date() if isinstance(dt, datetime) else dt
    return date.today()


def main() -> int:
    parser = argparse.ArgumentParser(description="Gán IMEI thiếu cho đơn đã giao/hoàn thành")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--order-code", type=str, default=None, help="Chỉ xử lý một đơn")
    args = parser.parse_args()

    if not ENV_FILE.is_file():
        print(f"Missing {ENV_FILE}")
        return 1

    env = load_env(ENV_FILE)
    order_conn = connect(env, ORDER_DB)
    catalog_conn = connect(env, CATALOG_DB)

    try:
        with order_conn.cursor() as ocur, catalog_conn.cursor() as ccur:
            gaps = fetch_gaps(ocur, args.order_code)
            ois_cols = table_columns(ocur, "order_item_serials")
            has_imei_cols = "imei" in ois_cols and "serial_number" in ois_cols

            total_need = sum(g["need"] for g in gaps)
            print("=== Assign missing order IMEIs ===")
            print(f"Order lines missing serials: {len(gaps)}")
            print(f"Total units to assign: {total_need}")
            print(f"order_item_serials has imei columns: {has_imei_cols}")

            if args.dry_run:
                for g in gaps[:15]:
                    avail = len(pick_serials(ccur, g["variant_id"], g["need"]))
                    print(
                        f"  {g['order_code']} [{g['status']}] detail#{g['order_detail_id']} "
                        f"{g['product_name'][:40]} need={g['need']} avail={avail}"
                    )
                if len(gaps) > 15:
                    print(f"  ... and {len(gaps) - 15} more lines")
                return 0

            assigned_total = 0
            skipped = 0

            for g in gaps:
                need = g["need"]
                serials = pick_serials(ccur, g["variant_id"], need)
                if not serials:
                    print(
                        f"SKIP {g['order_code']} detail#{g['order_detail_id']}: "
                        f"no AVAILABLE serial for variant {g['variant_id']}"
                    )
                    skipped += 1
                    continue

                wstart = warranty_start(g)
                sold_at = g.get("delivered_at") or g.get("order_date") or datetime.now()

                for pi_id, imei, serial in serials:
                    code = (imei or serial or "").strip()
                    serial_code = (serial or imei or "").strip()

                    if has_imei_cols:
                        ocur.execute(
                            """
                            INSERT INTO order_item_serials
                                (order_detail_id, product_item_id, imei, serial_number, created_at)
                            VALUES (%s, %s, %s, %s, NOW())
                            """,
                            (g["order_detail_id"], pi_id, code, serial_code),
                        )
                    else:
                        ocur.execute(
                            """
                            INSERT INTO order_item_serials
                                (order_detail_id, product_item_id, created_at)
                            VALUES (%s, %s, NOW())
                            """,
                            (g["order_detail_id"], pi_id),
                        )

                    ccur.execute(
                        """
                        UPDATE product_items
                        SET status = 'SOLD',
                            sold_at = %s,
                            warranty_start_date = %s,
                            reserved_at = COALESCE(reserved_at, %s),
                            updated_at = NOW()
                        WHERE id = %s AND status = 'AVAILABLE'
                        """,
                        (sold_at, wstart, sold_at, pi_id),
                    )

                    ccur.execute(
                        """
                        UPDATE product_variants
                        SET stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - 1, 0),
                            updated_at = NOW()
                        WHERE id = %s
                        """,
                        (g["variant_id"],),
                    )

                    assigned_total += 1

                if len(serials) < need:
                    print(
                        f"PARTIAL {g['order_code']} detail#{g['order_detail_id']}: "
                        f"assigned {len(serials)}/{need}"
                    )

                order_conn.commit()
                catalog_conn.commit()

            print(f"\n=== Done: assigned {assigned_total} serial(s), skipped {skipped} line(s) ===")

            if args.order_code:
                ocur.execute(
                    """
                    SELECT o.order_code, od.product_name, od.quantity,
                           COUNT(oi.id) AS assigned
                    FROM orders o
                    JOIN order_details od ON od.order_id = o.id
                    LEFT JOIN order_item_serials oi ON oi.order_detail_id = od.id
                    WHERE o.order_code = %s
                    GROUP BY o.order_code, od.id, od.product_name, od.quantity
                    """,
                    (args.order_code,),
                )
                print("Verify:", ocur.fetchall())

            return 0
    except Exception as exc:
        order_conn.rollback()
        catalog_conn.rollback()
        print("Failed:", exc)
        return 1
    finally:
        order_conn.close()
        catalog_conn.close()


if __name__ == "__main__":
    sys.exit(main())
