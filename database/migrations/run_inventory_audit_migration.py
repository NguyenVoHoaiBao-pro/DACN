#!/usr/bin/env python3
"""Migration inventory audit workflow — electro_catalog_db."""

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
    try:
        with conn.cursor() as cur:
            print("=== Inventory audit migration ===")
            if not table_exists(cur, "inventory_audit_variants"):
                sql = Path(__file__).with_name("2026-06-12_inventory_audit_full.sql").read_text(encoding="utf-8")
                start = sql.index("CREATE TABLE IF NOT EXISTS `inventory_audit_variants`")
                end = sql.find(";", start) + 1
                cur.execute(sql[start:end])
                print("  created: inventory_audit_variants")
            else:
                print("  skip: inventory_audit_variants")

            cols = [
                ("product_type_id", "INT NULL AFTER `created_by_user_id`"),
                ("product_type_name", "VARCHAR(150) NULL AFTER `product_type_id`"),
                ("stock_locked", "TINYINT(1) NOT NULL DEFAULT 0 AFTER `product_type_name`"),
                ("submitted_at", "DATETIME NULL AFTER `completed_at`"),
                ("approved_by_user_id", "INT NULL AFTER `submitted_at`"),
                ("approved_at", "DATETIME NULL AFTER `approved_by_user_id`"),
                ("admin_note", "TEXT NULL AFTER `notes`"),
            ]
            for name, ddl in cols:
                if column_exists(cur, "inventory_audits", name):
                    print(f"  skip: inventory_audits.{name}")
                else:
                    cur.execute(f"ALTER TABLE `inventory_audits` ADD COLUMN `{name}` {ddl}")
                    print(f"  added: inventory_audits.{name}")

            print("  modify: inventory_audits.status ENUM")
            cur.execute(
                """
                ALTER TABLE `inventory_audits`
                  MODIFY `status` enum(
                    'DRAFT','IN_PROGRESS','COMPLETED','PENDING_APPROVAL','APPROVED','REJECTED'
                  ) COLLATE utf8mb4_vietnamese_ci NOT NULL DEFAULT 'DRAFT'
                """
            )
            conn.commit()
            print("OK")
            return 0
    except Exception as exc:
        conn.rollback()
        print("Migration failed:", exc)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
