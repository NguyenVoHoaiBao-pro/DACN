#!/usr/bin/env python3
"""Migration product_return_slips — electro_catalog_db."""

from __future__ import annotations

import ssl
import sys
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
SQL_FILE = Path(__file__).resolve().parent / "2026-06-12_product_return_slips.sql"
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
    sql = SQL_FILE.read_text(encoding="utf-8")
    try:
        with conn.cursor() as cur:
            for stmt in [s.strip() for s in sql.split(";") if s.strip() and not s.strip().startswith("--")]:
                if stmt.upper().startswith("USE "):
                    continue
                cur.execute(stmt)
        conn.commit()
        print(f"OK: {SQL_FILE.name}")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
