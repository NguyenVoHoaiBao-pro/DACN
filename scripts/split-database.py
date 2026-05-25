#!/usr/bin/env python3
"""
Split electro_store_db.sql monolith dump into per-microservice database files.

Output: database/schemas/<db_name>.sql
Cross-service FOREIGN KEY constraints are removed (Integer FK at app layer).
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "electro_store_db.sql"
OUT_DIR = ROOT / "database" / "schemas"

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

DB_ORDER = [
    "electro_catalog_db",
    "electro_cart_db",
    "electro_order_db",
    "electro_user_db",
    "electro_review_db",
    "electro_statistics_db",
]

HEADER = """-- Auto-generated from electro_store_db.sql by scripts/split-database.py
-- Database: {db}
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SESSION sql_require_primary_key = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `{db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `{db}`;

"""

FOOTER = """
SET FOREIGN_KEY_CHECKS = 1;
"""

STMT_START = {
    "create": re.compile(r"CREATE TABLE `(?P<name>[^`]+)`", re.I),
    "insert": re.compile(r"INSERT INTO `(?P<name>[^`]+)`", re.I),
    "alter": re.compile(r"ALTER TABLE `(?P<name>[^`]+)`", re.I),
}


def statement_end(text: str, start: int) -> int:
    """Index after the statement terminator ; respecting SQL string literals."""
    i = start
    in_string = False
    string_char = ""
    while i < len(text):
        ch = text[i]
        if in_string:
            if ch == "\\" and i + 1 < len(text):
                i += 2
                continue
            if ch == string_char:
                if i + 1 < len(text) and text[i + 1] == string_char:
                    i += 2
                    continue
                in_string = False
                string_char = ""
        else:
            if ch in ("'", '"'):
                in_string = True
                string_char = ch
            elif ch == ";":
                return i + 1
        i += 1
    return len(text)


def extract_statements(text: str, kind: str) -> list[tuple[str, str]]:
    pattern = STMT_START[kind]
    out: list[tuple[str, str]] = []
    for m in pattern.finditer(text):
        end = statement_end(text, m.start())
        stmt = text[m.start() : end].strip()
        out.append((m.group("name"), stmt))
    return out


def strip_foreign_keys(alter_sql: str) -> str:
    lines = []
    for line in alter_sql.splitlines():
        if re.search(r"FOREIGN KEY", line, re.I):
            continue
        if re.search(r"ADD CONSTRAINT", line, re.I):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r",\s*\n(\s*\);)", r"\n\1", text)
    if not re.search(r"\b(ADD PRIMARY KEY|ADD KEY|ADD UNIQUE|MODIFY)\b", text, re.I):
        return ""
    if re.match(r"ALTER TABLE `[^`]+`\s*;?\s*$", text, re.I | re.S):
        return ""
    return text.strip()


def parse_dump(text: str) -> dict[str, dict[str, list[str]]]:
    tables: dict[str, dict[str, list[str]]] = {}

    for name, stmt in extract_statements(text, "create"):
        tables.setdefault(name, {"create": [], "insert": [], "alter": []})["create"].append(stmt)

    for name, stmt in extract_statements(text, "insert"):
        tables.setdefault(name, {"create": [], "insert": [], "alter": []})["insert"].append(stmt)

    for name, stmt in extract_statements(text, "alter"):
        cleaned = strip_foreign_keys(stmt)
        if cleaned:
            tables.setdefault(name, {"create": [], "insert": [], "alter": []})["alter"].append(cleaned)

    return tables


def extract_primary_key_columns(alter_sql: str) -> str | None:
    m = re.search(r"ADD PRIMARY KEY\s*\(([^)]+)\)", alter_sql, re.I)
    return m.group(1).strip() if m else None


def strip_primary_key_from_alter(alter_sql: str) -> str:
    lines = []
    for line in alter_sql.splitlines():
        if re.search(r"ADD PRIMARY KEY", line, re.I):
            continue
        lines.append(line)
    text = "\n".join(lines)
    text = re.sub(r",\s*\n(\s*\);)", r"\n\1", text)
    if not re.search(r"\b(ADD KEY|ADD UNIQUE|MODIFY)\b", text, re.I):
        return ""
    if re.match(r"ALTER TABLE `[^`]+`\s*;?\s*$", text, re.I | re.S):
        return ""
    return text.strip()


def inline_primary_key_in_create(create_sql: str, pk_columns: str) -> str:
    if re.search(r"\bPRIMARY KEY\b", create_sql, re.I):
        return create_sql
    marker = ") ENGINE="
    idx = create_sql.rfind(marker)
    if idx == -1:
        return create_sql
    # Insert PRIMARY KEY before closing "); ENGINE=" — keep the ")" intact.
    return (
        create_sql[:idx]
        + f",\n  PRIMARY KEY ({pk_columns})"
        + create_sql[idx:]
    )


def normalize_table_parts(parts: dict[str, list[str]]) -> dict[str, list[str]]:
    """Move PRIMARY KEY from ALTER into CREATE for sql_require_primary_key compatibility."""
    if not parts.get("create"):
        return parts

    pk_columns: str | None = None
    new_alters: list[str] = []
    for alter in parts.get("alter", []):
        if pk_columns is None:
            pk_columns = extract_primary_key_columns(alter)
        stripped = strip_primary_key_from_alter(alter)
        if stripped:
            new_alters.append(stripped)

    new_creates = list(parts["create"])
    if pk_columns and new_creates:
        new_creates[0] = inline_primary_key_in_create(new_creates[0], pk_columns)

    return {
        "create": new_creates,
        "insert": parts.get("insert", []),
        "alter": new_alters,
    }


def build_table_sql(parts: dict[str, list[str]]) -> str:
    parts = normalize_table_parts(parts)
    chunks = []
    if parts.get("create"):
        chunks.extend(parts["create"])
    if parts.get("insert"):
        chunks.extend(parts["insert"])
    if parts.get("alter"):
        chunks.extend(parts["alter"])
    return "\n\n".join(chunks)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Source not found: {SOURCE}")

    text = SOURCE.read_text(encoding="utf-8", errors="replace")
    tables = parse_dump(text)

    by_db: dict[str, list[str]] = {db: [] for db in DB_ORDER}
    unmapped = []

    for tname in sorted(tables.keys()):
        db = TABLE_TO_DB.get(tname)
        if not db:
            unmapped.append(tname)
            continue
        chunk = build_table_sql(tables[tname])
        if chunk:
            by_db[db].append(f"-- Table: {tname}\n{chunk}")

    if unmapped:
        print("WARNING unmapped tables:", unmapped)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    summary = []
    for db in DB_ORDER:
        chunks = by_db[db]
        out_path = OUT_DIR / f"{db}.sql"
        body = "\n\n-- --------------------------------------------------------\n\n".join(chunks)
        out_path.write_text(HEADER.format(db=db) + body + FOOTER, encoding="utf-8")
        count = len(chunks)
        summary.append(f"| `{db}` | {count} tables |")
        print(f"Wrote {out_path.name}: {count} tables")

    map_path = ROOT / "database" / "SCHEMA_MAP.txt"
    lines = [
        "Electro Store — Database per microservice\n",
        "Generated by scripts/split-database.py\n\n",
        "| Database | Service | Tables |\n",
        "|----------|---------|--------|\n",
        "| `electro_catalog_db` | catalog-service :8082 | 16 |\n",
        "| `electro_cart_db` | cart-service :8084 | 2 |\n",
        "| `electro_order_db` | order-service :8086 | 8 |\n",
        "| `electro_user_db` | user-service :8083 | 9 |\n",
        "| `electro_review_db` | review-service :8087 | 2 |\n",
        "| `electro_statistics_db` | statistics-service :8088 | 2 |\n",
        "\nImport: python scripts/split-database.py then scripts/Import-Databases.ps1\n",
        "Note: Cross-DB FOREIGN KEY removed; services use Integer FK + Feign.\n",
    ]
    map_path.write_text("".join(lines), encoding="utf-8")

    init_path = ROOT / "docker" / "mysql" / "init-databases.sql"
    init_lines = ["-- Microservice databases (empty shells on first Docker boot)\n"]
    for db in DB_ORDER:
        init_lines.append(
            f"CREATE DATABASE IF NOT EXISTS `{db}` "
            f"CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n"
        )
    init_path.write_text("".join(init_lines), encoding="utf-8")
    print(f"Wrote {init_path}")


if __name__ == "__main__":
    main()
