#!/usr/bin/env python3
"""Migration order_source + sales_pipeline_status — electro_order_db (Aiven)."""

from __future__ import annotations

import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_order_db"

REQUIRED_ORDER_SOURCE = (
    "WEB_ORGANIC",
    "WEB_ASSIGNED",
    "SALES_CHAT",
    "SALES_LINK",
    "ADMIN_SALES",
)


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


def main() -> int:
    env = load_env(ENV_FILE)
    required = ("MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD")
    missing = [k for k in required if k not in env]
    if missing:
        print("Thiếu biến trong .env:", ", ".join(missing))
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

    try:
        with conn.cursor() as cur:
            print("=== Order sales source migration ===")

            if not column_exists(cur, "orders", "assigned_sales_user_id"):
                print("  add: orders.assigned_sales_user_id")
                cur.execute(
                    "ALTER TABLE `orders` ADD COLUMN `assigned_sales_user_id` INT NULL AFTER `user_id`"
                )
            else:
                print("  skip: orders.assigned_sales_user_id")

            if not column_exists(cur, "orders", "order_source"):
                print("  add: orders.order_source")
                cur.execute(
                    "ALTER TABLE `orders` ADD COLUMN `order_source` VARCHAR(30) NOT NULL "
                    "DEFAULT 'WEB_ORGANIC' AFTER `assigned_sales_user_id`"
                )
            else:
                print("  backfill: orders.order_source NULL -> WEB_ORGANIC")
                cur.execute(
                    "UPDATE `orders` SET `order_source` = 'WEB_ORGANIC' "
                    "WHERE `order_source` IS NULL OR `order_source` = ''"
                )
                print("  modify: orders.order_source -> VARCHAR(30)")
                cur.execute(
                    """
                    ALTER TABLE `orders`
                      MODIFY COLUMN `order_source` VARCHAR(30) NOT NULL DEFAULT 'WEB_ORGANIC'
                      COMMENT 'WEB_ORGANIC|WEB_ASSIGNED|SALES_CHAT|SALES_LINK|ADMIN_SALES'
                    """
                )

            if not column_exists(cur, "orders", "sales_pipeline_status"):
                print("  add: orders.sales_pipeline_status")
                cur.execute(
                    "ALTER TABLE `orders` ADD COLUMN `sales_pipeline_status` VARCHAR(40) NOT NULL "
                    "DEFAULT 'NEW_ASSIGNED' AFTER `order_source`"
                )
            else:
                print("  backfill: orders.sales_pipeline_status NULL -> NEW_ASSIGNED")
                cur.execute(
                    "UPDATE `orders` SET `sales_pipeline_status` = 'NEW_ASSIGNED' "
                    "WHERE `sales_pipeline_status` IS NULL OR `sales_pipeline_status` = ''"
                )
                print("  modify: orders.sales_pipeline_status -> VARCHAR(40)")
                cur.execute(
                    """
                    ALTER TABLE `orders`
                      MODIFY COLUMN `sales_pipeline_status` VARCHAR(40) NOT NULL DEFAULT 'NEW_ASSIGNED'
                      COMMENT 'NEW_ASSIGNED|CALLING|THINKING|APPROVED_WAREHOUSE'
                    """
                )

            cur.execute(
                """
                SELECT COUNT(*) FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'sales_kpi_config'
                """,
                (DB_NAME,),
            )
            if cur.fetchone()[0] == 0:
                print("  create: sales_kpi_config")
                cur.execute(
                    """
                    CREATE TABLE `sales_kpi_config` (
                      `id` INT PRIMARY KEY DEFAULT 1,
                      `monthly_revenue_target` DECIMAL(15,2) NOT NULL DEFAULT 200000000.00,
                      `commission_rate_organic` DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
                      `commission_rate_web` DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
                      `commission_rate_sales_assisted` DECIMAL(8,4) NOT NULL DEFAULT 0.0100,
                      `commission_rate_sales_link` DECIMAL(8,4) NOT NULL DEFAULT 0.0050,
                      `max_cancel_rate_percent` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
                      `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
                        ON UPDATE CURRENT_TIMESTAMP(6),
                      `updated_by_user_id` INT NULL
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                    """
                )
                cur.execute("INSERT IGNORE INTO sales_kpi_config (id) VALUES (1)")
            else:
                print("  skip: sales_kpi_config")

            conn.commit()

            cur.execute(
                """
                SELECT COLUMN_TYPE FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'order_source'
                """,
                (DB_NAME,),
            )
            order_source_type = cur.fetchone()[0]
            print("\n=== Result ===")
            print(f"orders.order_source = {order_source_type}")

            if "varchar" not in order_source_type.lower():
                print("WARN: order_source is not VARCHAR; WEB_ASSIGNED may still fail on ENUM")

            cur.execute(
                "SELECT DISTINCT order_source FROM orders ORDER BY 1 LIMIT 20"
            )
            print("distinct order_source:", [r[0] for r in cur.fetchall()])

            print("OK. Restart order-service, then retry checkout.")
            return 0
    except Exception as exc:
        conn.rollback()
        print("Migration failed:", exc)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
