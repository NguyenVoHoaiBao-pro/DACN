#!/usr/bin/env python3
"""Chạy migration PO + Warehouse lên Aiven MySQL (đọc .env ở thư mục gốc repo)."""

from __future__ import annotations

import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_catalog_db"


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


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s
        """,
        (DB_NAME, table, column),
    )
    return cursor.fetchone()[0] > 0


def table_exists(cursor, table: str) -> bool:
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s
        """,
        (DB_NAME, table),
    )
    return cursor.fetchone()[0] > 0


def add_column(cursor, table: str, ddl: str, column: str) -> None:
    if column_exists(cursor, table, column):
        print(f"  skip: {table}.{column}")
        return
    cursor.execute(ddl)
    print(f"  added: {table}.{column}")


def main() -> int:
    env = load_env(ENV_FILE)
    required = ("MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD")
    missing = [k for k in required if k not in env]
    if missing:
        print("Thiếu biến trong .env:", ", ".join(missing))
        return 1

    ssl_ctx = ssl.create_default_context()
    # Aiven dùng CA riêng; Java JDBC bật sslMode=REQUIRED không verify hostname đầy đủ.
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

    try:
        with conn.cursor() as cur:
            print("=== PO + Warehouse migration ===")

            add_column(
                cur,
                "purchase_order_items",
                "ALTER TABLE `purchase_order_items` "
                "ADD COLUMN `quantity_damaged` int(11) NOT NULL DEFAULT 0 AFTER `quantity_received`",
                "quantity_damaged",
            )
            add_column(
                cur,
                "purchase_order_items",
                "ALTER TABLE `purchase_order_items` "
                "ADD COLUMN `quantity_imei_scanned` int(11) NOT NULL DEFAULT 0 AFTER `quantity_damaged`",
                "quantity_imei_scanned",
            )
            add_column(
                cur,
                "purchase_orders",
                "ALTER TABLE `purchase_orders` "
                "ADD COLUMN `discrepancy_reason` text COLLATE utf8mb4_vietnamese_ci NULL AFTER `notes`",
                "discrepancy_reason",
            )
            add_column(
                cur,
                "purchase_orders",
                "ALTER TABLE `purchase_orders` "
                "ADD COLUMN `discrepancy_evidence` mediumtext COLLATE utf8mb4_vietnamese_ci NULL "
                "AFTER `discrepancy_reason`",
                "discrepancy_evidence",
            )
            add_column(
                cur,
                "purchase_orders",
                "ALTER TABLE `purchase_orders` "
                "ADD COLUMN `received_by_user_id` int(11) NULL AFTER `user_id`",
                "received_by_user_id",
            )
            add_column(
                cur,
                "purchase_orders",
                "ALTER TABLE `purchase_orders` "
                "ADD COLUMN `approved_by_user_id` int(11) NULL COMMENT 'Admin duyệt PO' "
                "AFTER `received_by_user_id`",
                "approved_by_user_id",
            )
            add_column(
                cur,
                "purchase_orders",
                "ALTER TABLE `purchase_orders` "
                "ADD COLUMN `approved_at` datetime NULL AFTER `approved_by_user_id`",
                "approved_at",
            )

            print("  update: purchase_orders.status ENUM (+IN_TRANSIT, +RECEIVED)")
            cur.execute(
                """
                ALTER TABLE `purchase_orders`
                  MODIFY `status` enum(
                    'DRAFT','PENDING','APPROVED','IN_TRANSIT','RECEIVING','RECEIVED','COMPLETED','CANCELLED'
                  ) COLLATE utf8mb4_vietnamese_ci DEFAULT 'DRAFT'
                """
            )

            add_column(
                cur,
                "product_variants",
                "ALTER TABLE `product_variants` "
                "ADD COLUMN `requires_serial` tinyint(1) NOT NULL DEFAULT 1 "
                "COMMENT '1=phải quét serial' AFTER `low_stock_threshold`",
                "requires_serial",
            )
            add_column(
                cur,
                "product_items",
                "ALTER TABLE `product_items` "
                "ADD COLUMN `stock_lot_id` int(11) NULL AFTER `purchase_order_id`",
                "stock_lot_id",
            )

            for table in ("stock_lots", "inventory_audits", "inventory_audit_lines"):
                if table_exists(cur, table):
                    print(f"  skip table: {table}")
                else:
                    print(f"  create table: {table}")

            sql_path = Path(__file__).with_name("2026-06-11_po_warehouse_consolidated_safe.sql")
            create_block = sql_path.read_text(encoding="utf-8")
            for marker in (
                "CREATE TABLE IF NOT EXISTS `stock_lots`",
                "CREATE TABLE IF NOT EXISTS `inventory_audits`",
                "CREATE TABLE IF NOT EXISTS `inventory_audit_lines`",
            ):
                start = create_block.index(marker)
                end = create_block.find(";", start) + 1
                cur.execute(create_block[start:end])

            conn.commit()

            cur.execute(
                """
                SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'status'
                """,
                (DB_NAME,),
            )
            enum_type = cur.fetchone()[0]
            print("\n=== Result ===")
            print(f"purchase_orders.status = {enum_type}")

            if "IN_TRANSIT" not in enum_type:
                print("ERROR: ENUM still missing IN_TRANSIT")
                return 2

            print("OK. Restart catalog-service, then retry PO approval.")
            return 0
    except Exception as exc:
        conn.rollback()
        print("Migration failed:", exc)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
