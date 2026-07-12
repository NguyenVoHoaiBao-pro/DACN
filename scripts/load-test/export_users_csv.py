#!/usr/bin/env python3
"""Xuất lại seed-500-users.csv từ DB (không insert). Chạy sau khi đã seed 500 tài khoản."""

import os
import sys

try:
    import mysql.connector
except ImportError:
    print("pip install mysql-connector-python", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "seed-500-users.csv")
PASSWORD = "123456"
SEED_MILESTONE = 500


def main() -> None:
    conn = mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database="electro_user_db",
        charset="utf8mb4",
    )
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT u.username, u.id
            FROM users u
            INNER JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.username LIKE 'loadtest_%' AND ur.role_id = 4 AND u.status = 1
            ORDER BY u.id
            """
        )
        rows = cur.fetchall()
        lines = [f"{username},{PASSWORD},{uid}" for username, uid in rows]
        with open(CSV_PATH, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(lines))
            if lines:
                f.write("\n")
        print(f"Exported {len(lines)} rows (milestone {SEED_MILESTONE}) -> {CSV_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
