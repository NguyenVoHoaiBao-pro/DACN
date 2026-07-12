#!/usr/bin/env python3
"""Apply warranty final_resolution REFUND + refund_audit actor_role widen on electro_order_db."""

from __future__ import annotations

import ssl
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_order_db"

STATEMENTS = [
    """
    ALTER TABLE warranty_claims
        MODIFY COLUMN final_resolution
            ENUM('REPLACE', 'REPAIR_RETURN', 'REJECT', 'REFUND') NULL
            COMMENT 'Phan quyet cuoi: doi may / sua tra / tu choi / hoan tien'
    """,
    "ALTER TABLE refund_audit_logs MODIFY COLUMN actor_role VARCHAR(255) NULL",
]


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
            for stmt in STATEMENTS:
                cur.execute(stmt)
                print("OK:", stmt.strip().split("\n")[0][:80])
            cur.execute("SHOW COLUMNS FROM warranty_claims LIKE 'final_resolution'")
            print("final_resolution column:", cur.fetchone())
            cur.execute("SHOW COLUMNS FROM refund_audit_logs LIKE 'actor_role'")
            print("actor_role column:", cur.fetchone())
        conn.commit()
        print("All migrations applied on", DB_NAME)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
