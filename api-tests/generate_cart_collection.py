#!/usr/bin/env python3
"""Generate cart-service Postman collection. Run: python api-tests/generate_cart_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "cart-service.postman_collection.json"

C = "{{cartUrl}}"
A = "{{authUrl}}"
GW = "{{gatewayUrl}}"


def req(name, method, url, body=None, headers=None, tests=None, desc="", prerequest=None):
    h = headers if headers is not None else [{"key": "Content-Type", "value": "application/json"}]
    r = {"name": name, "request": {"method": method, "header": h, "url": url, "description": desc}}
    if body is not None:
        raw = body if isinstance(body, str) else json.dumps(body, indent=2, ensure_ascii=False)
        r["request"]["body"] = {"mode": "raw", "raw": raw}
    events = []
    if prerequest:
        events.append({"listen": "prerequest", "script": {"type": "text/javascript", "exec": prerequest}})
    if tests:
        events.append({"listen": "test", "script": {"type": "text/javascript", "exec": tests}})
    if events:
        r["event"] = events
    return r


def folder(name, items, desc=""):
    return {"name": name, "description": desc, "item": items}


def bearer():
    return [
        {"key": "Content-Type", "value": "application/json"},
        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
    ]


def no_auth():
    return [{"key": "Content-Type", "value": "application/json"}]


login_ok = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.environment.set("accessToken", j.data.accessToken);',
    'pm.collectionVariables.set("accessToken", j.data.accessToken);',
    'if (j.data.user && j.data.user.id) {',
    '  pm.environment.set("userId", String(j.data.user.id));',
    '  pm.collectionVariables.set("userId", String(j.data.user.id));',
    "}",
]

t200 = ['pm.test("Status 200", () => pm.response.to.have.status(200));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("Status 401 or 403", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t404 = ['pm.test("Status 404", () => pm.response.to.have.status(404));']

cart_ok = t200 + [
    "const j = pm.response.json();",
    'pm.test("ApiResponse 200", () => pm.expect(j.status).to.eql(200));',
    'pm.test("Has cart data", () => pm.expect(j.data).to.be.an("object"));',
    'if (j.data && j.data.items && j.data.items.length > 0) {',
    '  pm.environment.set("cartItemId", String(j.data.items[0].id));',
    '  pm.collectionVariables.set("cartItemId", String(j.data.items[0].id));',
    "}",
]

save_cart_item = cart_ok

items = []

items.append(folder("00 - OpenAPI & health", [
    req("GET /v3/api-docs", "GET", f"{C}/v3/api-docs", headers=no_auth(), tests=t200),
    req("GET /actuator/health", "GET", f"{C}/actuator/health", headers=no_auth(), tests=t200),
    req("GET Swagger UI", "GET", f"{C}/swagger-ui/index.html", headers=[], tests=[
        'pm.test("200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));']),
], "Cart service metadata"))

items.append(folder("01 - Auth login (JWT)", [
    req("POST /api/auth/login", "POST", f"{A}/api/auth/login",
        {"username": "{{username}}", "password": "{{password}}"},
        headers=no_auth(), tests=login_ok),
], "Lấy JWT trước khi test cart"))

items.append(folder("02 - GET /api/cart", [
    req("GET /api/cart - success", "GET", f"{C}/api/cart", headers=bearer(), tests=cart_ok),
    req("GET /api/cart - no JWT", "GET", f"{C}/api/cart", headers=no_auth(), tests=t401),
    req("GET /api/cart - invalid JWT", "GET", f"{C}/api/cart", headers=[
        {"key": "Authorization", "value": "Bearer invalid.token.here"},
    ], tests=t401),
], "Giỏ hàng cần JWT trên :8084"))

items.append(folder("03 - POST add item", [
    req("POST /api/cart - add variant", "POST", f"{C}/api/cart",
        {"variantId": "{{variantId}}", "quantity": 1}, headers=bearer(), tests=save_cart_item,
        desc="variantId từ catalog (mặc định 1)"),
    req("POST /api/cart - add same variant (increment)", "POST", f"{C}/api/cart",
        {"variantId": "{{variantId}}", "quantity": 2}, headers=bearer(), tests=t200),
    req("POST /api/cart - missing variantId", "POST", f"{C}/api/cart",
        {"quantity": 1}, headers=bearer(), tests=t400),
    req("POST /api/cart - quantity 0", "POST", f"{C}/api/cart",
        {"variantId": 1, "quantity": 0}, headers=bearer(), tests=t400),
    req("POST /api/cart - invalid variant 999999", "POST", f"{C}/api/cart",
        {"variantId": 999999, "quantity": 1}, headers=bearer(), tests=t404),
    req("POST /api/cart - no JWT", "POST", f"{C}/api/cart",
        {"variantId": 1, "quantity": 1}, headers=no_auth(), tests=t401),
], "Thêm sản phẩm vào giỏ"))

items.append(folder("04 - PUT update quantity", [
    req("PUT /api/cart/{{cartItemId}} - update qty", "PUT", f"{C}/api/cart/{{{{cartItemId}}}}",
        {"quantity": 3}, headers=bearer(), tests=t200,
        desc="Chạy folder 03 trước để có cartItemId"),
    req("PUT /api/cart/{{cartItemId}} - qty 0 invalid", "PUT", f"{C}/api/cart/{{{{cartItemId}}}}",
        {"quantity": 0}, headers=bearer(), tests=t400),
    req("PUT /api/cart/999999 - not found", "PUT", f"{C}/api/cart/999999",
        {"quantity": 1}, headers=bearer(), tests=t404),
], "Cập nhật số lượng"))

items.append(folder("05 - DELETE item", [
    req("DELETE /api/cart/{{cartItemId}}", "DELETE", f"{C}/api/cart/{{{{cartItemId}}}}",
        headers=bearer(), tests=t200),
    req("DELETE /api/cart/999999 - not found", "DELETE", f"{C}/api/cart/999999",
        headers=bearer(), tests=t404),
], "Xóa từng item"))

items.append(folder("06 - DELETE clear cart", [
    req("POST /api/cart - seed item for clear", "POST", f"{C}/api/cart",
        {"variantId": "{{variantId}}", "quantity": 1}, headers=bearer(), tests=t200),
    req("DELETE /api/cart - clear all", "DELETE", f"{C}/api/cart", headers=bearer(), tests=t200),
    req("GET /api/cart - empty after clear", "GET", f"{C}/api/cart", headers=bearer(), tests=t200),
], "Xóa toàn bộ giỏ"))

items.append(folder("07 - Internal (Feign order-service)", [
    req("GET /api/carts/internal/{{userId}}", "GET", f"{C}/api/carts/internal/{{{{userId}}}}",
        headers=bearer(), tests=t200,
        desc="Direct :8084 — cart-service vẫn yêu cầu JWT"),
    req("DELETE /api/carts/internal/{{userId}}/clear", "DELETE",
        f"{C}/api/carts/internal/{{{{userId}}}}/clear", headers=bearer(), tests=[
            'pm.test("200 or 204", () => pm.expect(pm.response.code).to.be.oneOf([200, 204]));']),
    req("GET internal via gateway - needs JWT", "GET", f"{GW}/api/carts/internal/{{{{userId}}}}",
        headers=bearer(), tests=t200,
        desc="/api/carts/internal khác /api/internal/** — gateway không chặn"),
    req("GET internal via gateway - no JWT -> 401", "GET", f"{GW}/api/carts/internal/1",
        headers=no_auth(), tests=t401),
], "Internal cart cho order Feign"))

items.append(folder("08 - API Gateway", [
    req("Gateway GET /api/cart - with JWT", "GET", f"{GW}/api/cart", headers=bearer(), tests=t200),
    req("Gateway GET /api/cart - no JWT -> 401", "GET", f"{GW}/api/cart", headers=no_auth(), tests=t401),
    req("Gateway POST /api/cart - add item", "POST", f"{GW}/api/cart",
        {"variantId": "{{variantId}}", "quantity": 1}, headers=bearer(), tests=t200),
    req("Gateway DELETE /api/cart - clear", "DELETE", f"{GW}/api/cart", headers=bearer(), tests=t200),
], "Cart qua :8080 — gateway bắt buộc JWT"))

items.append(folder("09 - Edge cases", [
    req("GET unknown path", "GET", f"{C}/api/cart/unknown", headers=bearer(),
        tests=['pm.test("405 Method Not Allowed", () => pm.response.to.have.status(405));'],
        desc="Khong co GET /api/cart/{id} — Spring tra 405"),
    req("PATCH /api/cart - method not allowed", "PATCH", f"{C}/api/cart", headers=bearer(),
        tests=['pm.test("405 Method Not Allowed", () => pm.response.to.have.status(405));']),
], "Đường dẫn / method không hợp lệ"))

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - cart-service (Full Coverage)",
        "description": (
            "Kiem thu cart-service (:8084).\n\n"
            "## Coverage\n"
            "- GET/POST/PUT/DELETE /api/cart\n"
            "- Internal /api/carts/internal/{userId}\n"
            "- Gateway JWT required\n\n"
            "## Can chay\n"
            "- cart :8084, auth :8081, catalog :8082 (variantId), gateway :8080\n\n"
            "Import: cart-service.postman_environment.json\n"
            "Huong dan: api-tests/CART_POSTMAN_GUIDE.md\n\n"
            "python api-tests/generate_cart_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "cartUrl", "value": "http://localhost:8084"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "accessToken", "value": ""},
        {"key": "userId", "value": "1"},
        {"key": "variantId", "value": "115"},
        {"key": "cartItemId", "value": "1"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {OUT} - {len(items)} folders, {sum(len(f['item']) for f in items)} requests")
