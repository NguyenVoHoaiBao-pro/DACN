"""Apply a SQL migration file to electro_order_db (reads repo .env)."""
import sys
from pathlib import Path
import pymysql

root = Path(__file__).resolve().parents[1]
sql_path = root / sys.argv[1] if len(sys.argv) > 1 else None
if not sql_path or not sql_path.exists():
    print("Usage: python scripts/apply_order_migration.py database/migrations/<file>.sql")
    sys.exit(1)

env = {}
for line in (root / ".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip().strip('"').strip("'")

conn = pymysql.connect(
    host=env["MYSQL_HOST"],
    port=int(env.get("MYSQL_PORT", 3306)),
    user=env["MYSQL_USER"],
    password=env["MYSQL_PASSWORD"],
    database="electro_order_db",
    ssl={"ssl": {}},
)
cur = conn.cursor()
lines = [ln for ln in sql_path.read_text(encoding="utf-8").splitlines() if not ln.strip().startswith("--")]
statements, buf = [], []
for line in lines:
    buf.append(line)
    if line.rstrip().endswith(";"):
        statements.append("\n".join(buf))
        buf = []
if buf:
    statements.append("\n".join(buf))

for i, stmt in enumerate(statements):
    s = stmt.strip().rstrip(";").strip()
    if not s or s.upper().startswith("USE "):
        continue
    try:
        cur.execute(s)
        print(f"OK #{i + 1}")
    except Exception as e:
        if "Duplicate column" in str(e):
            print(f"SKIP #{i + 1} (column exists)")
        else:
            raise
conn.commit()
conn.close()
print("Done:", sql_path.name)
