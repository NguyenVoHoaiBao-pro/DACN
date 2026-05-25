#!/usr/bin/env python3
"""Test Redis Cloud connection using env vars (set by Test-RedisConnection.ps1)."""
import os
import sys


def mask(s: str, show: int = 4) -> str:
    if not s:
        return "(empty)"
    if len(s) <= show:
        return "*" * len(s)
    return s[:show] + "*" * (len(s) - show)


def try_ping(host: str, port: int, password: str, username: str, use_ssl: bool) -> tuple[bool, str]:
    try:
        import redis
    except ImportError:
        return False, "Chua cai package 'redis'. Chay: pip install redis"

    kwargs = {
        "host": host,
        "port": port,
        "password": password or None,
        "username": username or None,
        "socket_connect_timeout": 10,
        "decode_responses": True,
    }
    if use_ssl:
        kwargs["ssl"] = True
        kwargs["ssl_cert_reqs"] = None  # Redis Cloud public CA

    label = "SSL/TLS" if use_ssl else "Khong SSL (plain)"
    try:
        client = redis.Redis(**kwargs)
        pong = client.ping()
        client.set("electro:connection_test", "ok", ex=30)
        val = client.get("electro:connection_test")
        client.delete("electro:connection_test")
        return True, f"{label}: PING={pong}, SET/GET/DEL OK (value={val})"
    except Exception as e:
        return False, f"{label}: {type(e).__name__}: {e}"


def main() -> int:
    url = os.environ.get("REDIS_URL", "").strip()
    host = os.environ.get("REDIS_HOST", "localhost").strip()
    port = int(os.environ.get("REDIS_PORT", "6379"))
    user = os.environ.get("REDIS_USERNAME", "").strip()
    password = os.environ.get("REDIS_PASSWORD", "").strip()
    ssl_env = os.environ.get("REDIS_SSL", "false").strip().lower() in ("1", "true", "yes")

    print("=== Redis connection test (Python) ===")
    if url:
        print(f"REDIS_URL: {mask(url, 12)}")
        try:
            import redis
        except ImportError:
            print("Loi: pip install redis")
            return 1
        try:
            client = redis.from_url(url, socket_connect_timeout=10, decode_responses=True)
            print(f"PING via URL: {client.ping()}")
            return 0
        except Exception as e:
            print(f"REDIS_URL that bai: {e}")
            return 1

    print(f"Host:     {host}")
    print(f"Port:     {port}")
    print(f"Username: {user or '(none)'}")
    print(f"Password: {mask(password)}")
    print(f"REDIS_SSL (.env): {ssl_env}")
    print()

    ok_ssl, msg_ssl = try_ping(host, port, password, user, True)
    ok_plain, msg_plain = try_ping(host, port, password, user, False)

    print(msg_ssl)
    print(msg_plain)
    print()

    if ok_ssl:
        print("KET LUAN: Ket noi OK voi SSL/TLS -> dat REDIS_SSL=true trong .env")
        return 0
    if ok_plain:
        print("KET LUAN: Ket noi OK KHONG SSL -> dat REDIS_SSL=false trong .env")
        return 0

    print("KET LUAN: Khong ket noi duoc (ca SSL va plain). Kiem tra host/port/password tren Redis Cloud.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
