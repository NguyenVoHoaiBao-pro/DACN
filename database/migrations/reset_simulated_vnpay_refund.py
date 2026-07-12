#!/usr/bin/env python3
"""Reset a simulated VNPay refund so Admin can re-approve with real gateway call."""

from __future__ import annotations

import ssl
from pathlib import Path

import pymysql

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"
DB_NAME = "electro_order_db"
REFUND_CODE = "RF-20260619-0002"
ORDER_CODE = "ORD-20260619151323510"


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
            cur.execute(
                """
                UPDATE refund_requests
                SET status = 'FAILED',
                    gateway_refund_id = NULL,
                    completed_at = NULL,
                    failure_reason = 'Reset: truoc day gia lap SIM_ (VNPay chua goi thanh cong)'
                WHERE refund_code = %s
                """,
                (REFUND_CODE,),
            )
            cur.execute(
                """
                UPDATE payment_transactions
                SET status = 'SUCCESS',
                    refunded_at = NULL,
                    refund_amount = NULL,
                    refund_reason = NULL
                WHERE order_code = %s
                """,
                (ORDER_CODE,),
            )
            cur.execute(
                """
                UPDATE orders
                SET payment_status = 'PAID',
                    status = 'COMPLETED'
                WHERE order_code = %s
                """,
                (ORDER_CODE,),
            )
        conn.commit()
        print(f"Reset {REFUND_CODE} -> FAILED; payment/order restored for re-test.")
        print("Note: VNPay sandbox may reject duplicate full refund (code 94) on same txn.")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
