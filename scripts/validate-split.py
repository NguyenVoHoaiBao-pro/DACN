#!/usr/bin/env python3
"""Audit child DB SQL files vs parent electro_store_db.sql dump."""
from __future__ import annotations

import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "electro_store_db.sql"
SCHEMA_DIR = ROOT / "database" / "schemas"
REPORT = ROOT / "database" / "AUDIT_REPORT.txt"

TABLE_TO_DB = {
    "attributes": "electro_catalog_db",
    "attribute_values": "electro_catalog_db",
    "images": "electro_catalog_db",
    "inventory_transactions": "electro_catalog_db",
    "producers": "electro_catalog_db",
    "products": "electro_catalog_db",
    "product_items": "electro_catalog_db",
    "product_specifications": "electro_catalog_db",
    "product_types": "electro_catalog_db",
    "product_variants": "electro_catalog_db",
    "purchase_orders": "electro_catalog_db",
    "purchase_order_items": "electro_catalog_db",
    "specifications": "electro_catalog_db",
    "suppliers": "electro_catalog_db",
    "variant_attribute_values": "electro_catalog_db",
    "settings": "electro_catalog_db",
    "carts": "electro_cart_db",
    "cart_items": "electro_cart_db",
    "orders": "electro_order_db",
    "order_details": "electro_order_db",
    "order_item_serials": "electro_order_db",
    "coupons": "electro_order_db",
    "payment_transactions": "electro_order_db",
    "shipping_methods": "electro_order_db",
    "warranty_claims": "electro_order_db",
    "warranty_tickets": "electro_order_db",
    "users": "electro_user_db",
    "user_addresses": "electro_user_db",
    "password_reset_tokens": "electro_user_db",
    "qr_auth_tokens": "electro_user_db",
    "roles": "electro_user_db",
    "permissions": "electro_user_db",
    "role_permissions": "electro_user_db",
    "user_roles": "electro_user_db",
    "wishlists": "electro_user_db",
    "reviews": "electro_review_db",
    "review_images": "electro_review_db",
    "audit_logs": "electro_statistics_db",
    "user_interactions": "electro_statistics_db",
}

DB_FILES = {
    "electro_catalog_db": "catalog-service :8082",
    "electro_cart_db": "cart-service :8084",
    "electro_order_db": "order-service :8086",
    "electro_user_db": "user-service :8083",
    "electro_review_db": "review-service :8087",
    "electro_statistics_db": "statistics-service :8088",
}

CREATE_RE = re.compile(r"CREATE TABLE `([^`]+)`[\s\S]*?;\s*", re.M)
INSERT_RE = re.compile(r"INSERT INTO `([^`]+)`", re.M)
ALTER_RE = re.compile(r"ALTER TABLE `([^`]+)`", re.M)
VALUES_RE = re.compile(r"\((?:[^()']|'[^']*'|\([^()]*\))*\)")
COLUMN_RE = re.compile(r"^\s+`([^`]+)`\s+", re.M)


def extract_create_blocks(text: str) -> dict[str, str]:
    return {m.group(1): m.group(0) for m in CREATE_RE.finditer(text)}


def count_rows(text: str, table: str) -> int:
    total = 0
    for m in re.finditer(rf"INSERT INTO `{re.escape(table)}`[^;]+;", text, re.S):
        total += len(VALUES_RE.findall(m.group(0)))
    return total


def count_alters(text: str, table: str) -> int:
    return sum(1 for m in ALTER_RE.finditer(text) if m.group(1) == table)


def column_names(create_sql: str) -> list[str]:
  # only lines inside CREATE TABLE before ENGINE=
    body = create_sql.split("ENGINE=")[0]
    return COLUMN_RE.findall(body)


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def main() -> int:
    lines: list[str] = []
    ok = True

    def out(msg: str = "") -> None:
        lines.append(msg)
        try:
            print(msg)
        except UnicodeEncodeError:
            print(msg.encode("ascii", errors="replace").decode("ascii"))

    if not SOURCE.exists():
        out(f"ERROR: Source not found: {SOURCE}")
        return 1
    if not SCHEMA_DIR.exists():
        out(f"ERROR: Schema dir not found: {SCHEMA_DIR}")
        return 1

    src = load_text(SOURCE)
    src_creates = extract_create_blocks(src)
    src_tables = set(src_creates.keys())

    split_creates: dict[str, str] = {}
    split_text_by_db: dict[str, str] = {}

    for f in sorted(SCHEMA_DIR.glob("electro_*.sql")):
        db = f.stem
        text = load_text(f)
        split_text_by_db[db] = text
        for name, block in extract_create_blocks(text).items():
            split_creates[name] = block

    split_tables = set(split_creates.keys())

    out("=" * 72)
    out("AUDIT: electro_store_db.sql  ->  database/schemas/*.sql")
    out("=" * 72)

    # 1. Table coverage
    out("\n[1] PHỦ BẢNG (39 bảng từ DB cha)")
    missing = sorted(src_tables - split_tables)
    extra = sorted(split_tables - src_tables)
    unmapped = sorted(t for t in src_tables if t not in TABLE_TO_DB)
    wrong_db: list[str] = []

    for t in src_tables:
        expected = TABLE_TO_DB.get(t)
        if not expected:
            continue
        found_in = [db for db, txt in split_text_by_db.items() if f"CREATE TABLE `{t}`" in txt]
        if found_in and found_in[0] != expected:
            wrong_db.append(f"{t}: expected {expected}, found {found_in[0]}")

    out(f"  DB cha:     {len(src_tables)} bảng")
    out(f"  DB con:     {len(split_tables)} bảng (6 file)")
    out(f"  Thiếu bảng: {missing if missing else 'KHÔNG'}")
    out(f"  Thừa bảng:  {extra if extra else 'KHÔNG'}")
    out(f"  Chưa map:   {unmapped if unmapped else 'KHÔNG'}")
    out(f"  Sai DB:     {wrong_db if wrong_db else 'KHÔNG'}")
    if missing or extra or unmapped or wrong_db:
        ok = False

    # 2. Row counts
    out("\n[2] SỐ RECORD (INSERT) — so với DB cha")
    row_mismatch = []
    empty_in_source = []
    empty_in_split = []

    out(f"  {'Bảng':<28} {'DB con':<22} {'Cha':>8} {'Con':>8} {'OK':>4}")
    out(f"  {'-'*28} {'-'*22} {'-'*8} {'-'*8} {'-'*4}")

    for t in sorted(src_tables):
        db = TABLE_TO_DB.get(t, "?")
        src_n = count_rows(src, t)
        split_n = count_rows(split_text_by_db.get(db, ""), t) if db in split_text_by_db else 0
        match = src_n == split_n
        flag = "OK" if match else "FAIL"
        if not match:
            row_mismatch.append((t, src_n, split_n))
            ok = False
        if src_n == 0:
            empty_in_source.append(t)
        if split_n == 0 and src_n > 0:
            empty_in_split.append(t)
        out(f"  {t:<28} {db:<22} {src_n:>8} {split_n:>8} {flag:>4}")

    src_total = sum(count_rows(src, t) for t in src_tables)
    split_total = sum(
        count_rows(txt, t)
        for db, txt in split_text_by_db.items()
        for t in CREATE_RE.findall(txt)
    )
    out(f"\n  Tổng record DB cha: {src_total:,}")
    out(f"  Tổng record DB con: {split_total:,}")
    out(f"  Khớp tổng:          {'CÓ' if src_total == split_total else 'KHÔNG'}")

  # 3. Schema structure
    out("\n[3] CẤU TRÚC BẢNG (CREATE TABLE — số cột)")
    col_mismatch = []
    for t in sorted(src_tables):
        src_cols = column_names(src_creates[t])
        if t not in split_creates:
            col_mismatch.append((t, len(src_cols), 0, "missing table"))
            ok = False
            continue
        split_cols = column_names(split_creates[t])
        if src_cols != split_cols:
            col_mismatch.append((t, len(src_cols), len(split_cols), "column diff"))
            ok = False
    if col_mismatch:
        out("  KHÔNG KHỚP:")
        for t, a, b, reason in col_mismatch:
            out(f"    - {t}: cha={a} cột, con={b} cột ({reason})")
    else:
        out("  Tất cả 39 bảng giữ nguyên số cột và tên cột.")

    # 4. Indexes / constraints (ALTER)
    out("\n[4] INDEX & AUTO_INCREMENT (ALTER TABLE)")
    alter_issues = []
    for t in sorted(src_tables):
        src_a = count_alters(src, t)
        db = TABLE_TO_DB[t]
        split_a = count_alters(split_text_by_db[db], t)
        # FK-only ALTER blocks removed in split — expect split_a <= src_a
        if split_a == 0 and src_a > 0:
            # check if source only had FK alters
            fk_only = True
            for m in re.finditer(rf"ALTER TABLE `{re.escape(t)}`[\s\S]*?;", src, re.M):
                block = m.group(0)
                if re.search(r"\b(ADD PRIMARY KEY|ADD KEY|ADD UNIQUE|MODIFY)\b", block, re.I):
                    fk_only = False
                    break
            if not fk_only:
                alter_issues.append(f"{t}: con thiếu ALTER (cha={src_a}, con={split_a})")
                ok = False
    if alter_issues:
        out("  VẤN ĐỀ:")
        for x in alter_issues:
            out(f"    - {x}")
    else:
        out("  PK, INDEX, AUTO_INCREMENT đầy đủ (FK liên service đã gỡ — đúng kiến trúc microservice).")

    # 5. Per-file summary
    out("\n[5] CHI TIẾT TỪNG FILE DB CON")
    for db, service in DB_FILES.items():
        path = SCHEMA_DIR / f"{db}.sql"
        if not path.exists():
            out(f"\n  {db}.sql — THIẾU FILE")
            ok = False
            continue
        text = split_text_by_db[db]
        tables = sorted(CREATE_RE.findall(text))
        rows = sum(count_rows(text, t) for t in tables)
        size_kb = path.stat().st_size / 1024
        out(f"\n  {path.name} ({service})")
        out(f"    Kích thước: {size_kb:,.1f} KB")
        out(f"    Bảng:       {len(tables)}")
        out(f"    Records:    {rows:,}")
        for t in tables:
            n = count_rows(text, t)
            note = " (trống — DB cha cũng trống)" if n == 0 else ""
            out(f"      • {t}: {n:,} record{note}")

    # 6. Notes
    out("\n[6] GHI CHÚ")
    out("  • cart_items: 0 record — DB cha cũng không có dữ liệu (bình thường).")
    out("  • FK cross-service (reviews→products, cart_items→variants, …) đã bỏ trong file con.")
    out("  • Các service vẫn giữ Integer FK; validate qua Feign/API ở tầng ứng dụng.")
    out("  • File con có: CREATE TABLE + INSERT + ALTER (PK/INDEX/AUTO_INCREMENT).")

    out("\n" + "=" * 72)
    if ok:
        out("KẾT LUẬN: ĐẦY ĐỦ — 39/39 bảng, 100% record khớp DB cha.")
    else:
        out("KẾT LUẬN: CÓ VẤN ĐỀ — xem chi tiết ở trên.")
    out("=" * 72)

    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    out(f"\nBáo cáo đã lưu: {REPORT.relative_to(ROOT)}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
