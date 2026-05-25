#!/usr/bin/env python3
"""
Liệt kê và xóa bản ghi ảnh sản phẩm không hợp lệ trong electro_catalog_db.

Ảnh được coi là KHÔNG HỢP LỆ nếu thỏa một trong các điều kiện:
  - URL rỗng / chỉ khoảng trắng
  - URL dạng data:image... (base64 nhúng trong DB)
  - URL localhost /img/... (proxy Gateway không có file thật)
  - URL tương đối /img/...
  - Mồ côi: product_id và variant_id đều NULL
  - product_id không tồn tại trong bảng products
  - variant_id không tồn tại trong bảng product_variants

Mặc định: chỉ liệt kê (dry-run). Thêm --execute để xóa thật.

Ví dụ:
  python scripts/cleanup-invalid-product-images.py
  python scripts/cleanup-invalid-product-images.py --execute
  python scripts/cleanup-invalid-product-images.py --execute --report scripts/invalid-images-report.csv
"""
from __future__ import annotations

import argparse
import csv
import os
import ssl
import sys
from pathlib import Path

try:
    import pymysql
except ImportError:
    print("Cần cài pymysql: pip install pymysql")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DB_NAME = "electro_catalog_db"

INVALID_WHERE = """
(
    TRIM(COALESCE(i.image_url, '')) = ''
    OR LOWER(TRIM(i.image_url)) IN ('null', 'undefined', 'none', 'n/a')
    OR i.image_url LIKE 'data:image%%'
    OR i.image_url LIKE 'http://localhost:%%/img/%%'
    OR i.image_url LIKE 'https://localhost:%%/img/%%'
    OR i.image_url LIKE '/img/%%'
    OR (i.product_id IS NULL AND i.variant_id IS NULL)
    OR (i.product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM products p WHERE p.id = i.product_id
    ))
    OR (i.variant_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM product_variants v WHERE v.id = i.variant_id
    ))
)
"""

REASON_CASE = """
CASE
    WHEN TRIM(COALESCE(i.image_url, '')) = '' THEN 'empty_url'
    WHEN LOWER(TRIM(i.image_url)) IN ('null', 'undefined', 'none', 'n/a') THEN 'placeholder_text'
    WHEN i.image_url LIKE 'data:image%%' THEN 'base64_embedded'
    WHEN i.image_url LIKE 'http://localhost:%%/img/%%'
      OR i.image_url LIKE 'https://localhost:%%/img/%%'
      OR i.image_url LIKE '/img/%%' THEN 'broken_local_img_path'
    WHEN i.product_id IS NULL AND i.variant_id IS NULL THEN 'orphan_no_product_no_variant'
    WHEN i.product_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM products p WHERE p.id = i.product_id
    ) THEN 'missing_product'
    WHEN i.variant_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM product_variants v WHERE v.id = i.variant_id
    ) THEN 'missing_variant'
    ELSE 'other'
END
"""


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def connect_db():
    host = os.environ.get("MYSQL_HOST", "127.0.0.1")
    port = int(os.environ.get("MYSQL_PORT", "3306"))
    user = os.environ.get("MYSQL_USER", "root")
    password = os.environ.get("MYSQL_PASSWORD", "")
    use_ssl = os.environ.get("MYSQL_USE_SSL", "false").lower() in ("1", "true", "yes")

    kwargs = dict(
        host=host,
        port=port,
        user=user,
        password=password,
        database=DB_NAME,
        charset="utf8mb4",
        connect_timeout=30,
        cursorclass=pymysql.cursors.DictCursor,
    )

    if use_ssl:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        kwargs["ssl"] = ctx

    return pymysql.connect(**kwargs)


def fetch_invalid_images(cur) -> list[dict]:
    sql = f"""
        SELECT
            i.id,
            i.product_id,
            i.variant_id,
            {REASON_CASE} AS reason,
            LEFT(i.image_url, 120) AS image_url_preview,
            LENGTH(i.image_url) AS url_length,
            p.name AS product_name
        FROM images i
        LEFT JOIN products p ON p.id = i.product_id
        WHERE {INVALID_WHERE}
        ORDER BY i.id
    """
    cur.execute(sql)
    return list(cur.fetchall())


def fetch_products_without_valid_images(cur) -> list[dict]:
    sql = """
        SELECT
            p.id,
            p.name,
            p.is_active,
            COUNT(i.id) AS total_images,
            SUM(
                CASE
                    WHEN TRIM(COALESCE(i.image_url, '')) <> ''
                         AND i.image_url NOT LIKE 'data:image%%'
                         AND i.image_url NOT LIKE 'http://localhost:%%/img/%%'
                         AND i.image_url NOT LIKE 'https://localhost:%%/img/%%'
                         AND i.image_url NOT LIKE '/img/%%'
                    THEN 1 ELSE 0
                END
            ) AS valid_image_count
        FROM products p
        LEFT JOIN images i ON i.product_id = p.id
        GROUP BY p.id, p.name, p.is_active
        HAVING valid_image_count = 0
        ORDER BY p.is_active DESC, p.id
        LIMIT 200
    """
    cur.execute(sql)
    return list(cur.fetchall())


def summarize_by_reason(rows: list[dict]) -> dict[str, int]:
    summary: dict[str, int] = {}
    for row in rows:
        reason = row["reason"]
        summary[reason] = summary.get(reason, 0) + 1
    return summary


def write_report(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = [
        "id",
        "product_id",
        "variant_id",
        "reason",
        "product_name",
        "url_length",
        "image_url_preview",
    ]
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fields})


def delete_invalid_images(cur, rows: list[dict]) -> int:
    if not rows:
        return 0
    ids = [row["id"] for row in rows]
    placeholders = ",".join(["%s"] * len(ids))
    cur.execute(f"DELETE FROM images WHERE id IN ({placeholders})", ids)
    return cur.rowcount


def main() -> int:
    load_dotenv()

    parser = argparse.ArgumentParser(description="Liệt kê / xóa ảnh sản phẩm không hợp lệ")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Xóa thật khỏi DB (mặc định chỉ liệt kê)",
    )
    parser.add_argument(
        "--report",
        default=str(ROOT / "scripts" / "invalid-images-report.csv"),
        help="Đường dẫn file CSV báo cáo",
    )
    parser.add_argument(
        "--show-limit",
        type=int,
        default=50,
        help="Số dòng in ra console",
    )
    args = parser.parse_args()

    host = os.environ.get("MYSQL_HOST", "127.0.0.1")
    port = os.environ.get("MYSQL_PORT", "3306")
    user = os.environ.get("MYSQL_USER", "root")

    print("=" * 72)
    print("Electro Store - Don anh san pham khong hop le")
    print(f"MySQL: {host}:{port} / {DB_NAME} (user={user})")
    print("=" * 72)

    try:
        conn = connect_db()
    except Exception as exc:
        print(f"ERROR: Khong ket noi duoc DB: {exc}")
        print("Kiem tra file .env (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD)")
        return 1

    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS cnt FROM images")
            total_before = cur.fetchone()["cnt"]

            invalid_rows = fetch_invalid_images(cur)
            summary = summarize_by_reason(invalid_rows)
            no_image_products = fetch_products_without_valid_images(cur)

            print(f"\nTong anh trong DB      : {total_before}")
            print(f"Anh khong hop le       : {len(invalid_rows)}")
            print("\nPhan loai:")
            for reason, count in sorted(summary.items(), key=lambda x: (-x[1], x[0])):
                print(f"  - {reason:<30} {count}")

            print(f"\nDanh sach anh se xoa ({len(invalid_rows)}):")
            # fix typo rowcontact -> row
            for row in invalid_rows[: args.show_limit]:
                name = row.get("product_name") or "-"
                preview = row.get("image_url_preview") or ""
                print(
                    f"  #{row['id']:>4} | product={str(row.get('product_id') or '-'):>4} "
                    f"| variant={str(row.get('variant_id') or '-'):>4} | {row['reason']:<28} "
                    f"| {name[:40]}"
                )
                if preview:
                    print(f"         url: {preview}")
            if len(invalid_rows) > args.show_limit:
                print(f"  ... va {len(invalid_rows) - args.show_limit} ban ghi khac")

            report_path = Path(args.report)
            write_report(report_path, invalid_rows)
            print(f"\nDa ghi bao cao CSV: {report_path}")

            print(f"\nSan pham khong co anh hop le (top {len(no_image_products)}):")
            if not no_image_products:
                print("  (khong co - moi san pham deu co it nhat 1 anh URL hop le)")
            else:
                for p in no_image_products[:20]:
                    active = "active" if p["is_active"] else "inactive"
                    print(
                        f"  product #{p['id']:>4} [{active}] "
                        f"| images={p['total_images']} | {p['name'][:50]}"
                    )
                if len(no_image_products) > 20:
                    print(f"  ... va {len(no_image_products) - 20} san pham khac")

            if not args.execute:
                print("\n[DRY-RUN] Chua xoa gi. Chay lai voi --execute de xoa that.")
                return 0

            if not invalid_rows:
                print("\nKhong co anh nao can xoa.")
                return 0

            deleted = delete_invalid_images(cur, invalid_rows)
            conn.commit()

            cur.execute("SELECT COUNT(*) AS cnt FROM images")
            total_after = cur.fetchone()["cnt"]

            print(f"\n[EXECUTE] Da xoa {deleted} ban ghi anh.")
            print(f"Tong anh sau khi don: {total_after} (truoc: {total_before})")
            return 0

    except Exception as exc:
        conn.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
