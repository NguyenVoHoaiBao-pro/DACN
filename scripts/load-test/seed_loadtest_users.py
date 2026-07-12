#!/usr/bin/env python3
"""
Tạo 500 tài khoản loadtest trong electro_user_db và xuất seed-500-users.csv cho JMeter.

Mốc tài khoản: 500 (seed-500-users.csv — đúng 500 dòng, không header).

Yêu cầu file CSV (Hard Constraints):
  - username,password,user_id — khớp DB
  - Không có dòng header
  - UTF-8 without BOM
  - Phân tách bằng dấu phẩy, không khoảng trắng thừa

Chạy:
  python scripts/load-test/seed_loadtest_users.py
  python scripts/load-test/seed_loadtest_users.py --count 500 --password 123456
"""

from __future__ import annotations

import argparse
import os
import sys

try:
    import mysql.connector
except ImportError:
    print("Cài mysql-connector-python: pip install mysql-connector-python", file=sys.stderr)
    sys.exit(1)

# BCrypt hash của mật khẩu "123456" (Spring BCrypt $2a$10$, strength 10)
BCRYPT_123456 = "$2a$10$JO25zEJX0W/enEU6nHIea.BsUIPNH9cIoodqhb4fGqBZOTA5pMOf."

DEFAULT_COUNT = 500
SEED_MILESTONE = 500
PREFIX = "loadtest_"
ROLE_CUSTOMER = 4
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "seed-500-users.csv")


def connect():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database="electro_user_db",
        charset="utf8mb4",
    )


def seed_users(cursor, count: int, password_hash: str) -> list[tuple[str, str, int]]:
    created: list[tuple[str, str, int]] = []
    for i in range(1, count + 1):
        username = f"{PREFIX}{i:03d}"
        email = f"{username}@loadtest.electro.local"
        name = f"Load Test User {i:03d}"
        phone = f"09{90000000 + i:08d}"[-10:]

        cursor.execute(
            """
            INSERT INTO users (username, password, name, email, phone, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, 1, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                password = VALUES(password),
                status = 1,
                updated_at = NOW()
            """,
            (username, password_hash, name, email, phone),
        )
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        row = cursor.fetchone()
        if not row:
            raise RuntimeError(f"Không lấy được user_id cho {username}")
        user_id = int(row[0])

        cursor.execute(
            """
            INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (%s, %s)
            """,
            (user_id, ROLE_CUSTOMER),
        )
        created.append((username, "123456", user_id))
    return created


def export_csv(rows: list[tuple[str, str, int]], path: str) -> None:
    lines = [f"{u},{p},{uid}" for u, p, uid in rows]
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines))
        if lines:
            f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed loadtest users + seed-500-users.csv")
    parser.add_argument("--count", type=int, default=DEFAULT_COUNT)
    parser.add_argument("--password", default="123456", help="Mật khẩu plaintext (ghi vào CSV)")
    parser.add_argument("--csv", default=CSV_PATH)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.password != "123456":
        print("Lưu ý: script dùng hash BCrypt cố định cho mật khẩu '123456'.", file=sys.stderr)
        print("Đổi --password chỉ khi bạn cập nhật BCRYPT hash trong script.", file=sys.stderr)

    conn = connect()
    try:
        cursor = conn.cursor()
        if args.dry_run:
            print(f"[dry-run] Sẽ tạo/cập nhật {args.count} tài khoản {PREFIX}***")
            return

        rows = seed_users(cursor, args.count, BCRYPT_123456)
        conn.commit()
        export_csv(rows, args.csv)
        print(f"OK: {len(rows)} accounts -> CSV: {args.csv}")
        print(f"Sample: {rows[0][0]},{rows[0][1]},{rows[0][2]}")
        print(f"        {rows[1][0]},{rows[1][1]},{rows[1][2]}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
