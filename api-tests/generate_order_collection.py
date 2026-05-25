#!/usr/bin/env python3
"""Generate order-service Postman collection. Run: python api-tests/generate_order_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "order-service.postman_collection.json"

O = "{{orderUrl}}"
A = "{{authUrl}}"
U = "{{userUrl}}"
C = "{{cartUrl}}"
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


def one_of(*codes):
    joined = ", ".join(str(c) for c in codes)
    return [f'pm.test("Status one of [{joined}]", () => pm.expect(pm.response.code).to.be.oneOf([{joined}]));']


login_ok = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.environment.set("accessToken", j.data.accessToken);',
    'pm.collectionVariables.set("accessToken", j.data.accessToken);',
    'if (j.data.user && j.data.user.id) {',
    '  pm.environment.set("userId", String(j.data.user.id));',
    '  pm.collectionVariables.set("userId", String(j.data.user.id));',
    "}",
    "const token = j.data.accessToken;",
    'pm.test("JWT has permissions claim", () => {',
    "  const payload = JSON.parse(atob(token.split('.')[1]));",
    "  pm.expect(payload.permissions).to.be.an('array').that.is.not.empty;",
    "});",
    'pm.test("JWT includes USER_ORDER_HISTORY", () => {',
    "  const payload = JSON.parse(atob(token.split('.')[1]));",
    '  pm.expect(payload.permissions).to.include("USER_ORDER_HISTORY");',
    "});",
    'pm.test("JWT includes CHECKOUT_PAYMENT", () => {',
    "  const payload = JSON.parse(atob(token.split('.')[1]));",
    '  pm.expect(payload.permissions).to.include("CHECKOUT_PAYMENT");',
    "});",
]

save_address = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'const list = Array.isArray(j.data) ? j.data : (j.data && j.data.content);',
    'if (list && list.length > 0) {',
    '  pm.environment.set("addressId", String(list[0].id));',
    '  pm.collectionVariables.set("addressId", String(list[0].id));',
    "}",
]

save_order = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'if (j.data && j.data.orderCode) {',
    '  pm.environment.set("orderCode", j.data.orderCode);',
    '  pm.collectionVariables.set("orderCode", j.data.orderCode);',
    "}",
    'if (j.data && j.data.id) {',
    '  pm.environment.set("orderId", String(j.data.id));',
    '  pm.collectionVariables.set("orderId", String(j.data.id));',
    "}",
]

save_coupon = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'if (j.data && j.data.length > 0 && j.data[0].code) {',
    '  pm.environment.set("couponCode", j.data[0].code);',
    '  pm.collectionVariables.set("couponCode", j.data[0].code);',
    "}",
]

t200 = ['pm.test("Status 200", () => pm.response.to.have.status(200));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("Status 401 or 403", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t403 = ['pm.test("Status 403 Forbidden", () => pm.response.to.have.status(403));']
t404 = ['pm.test("Status 404", () => pm.response.to.have.status(404));']
t200or400 = one_of(200, 400)
t200or404 = one_of(200, 404)
t200or400or404 = one_of(200, 400, 404)
t400or404 = one_of(400, 404)

items = []

items.append(folder("00 - OpenAPI & health", [
    req("GET /v3/api-docs", "GET", f"{O}/v3/api-docs", headers=no_auth(), tests=t200),
    req("GET /actuator/health", "GET", f"{O}/actuator/health", headers=no_auth(), tests=t200),
    req("GET Swagger UI", "GET", f"{O}/swagger-ui/index.html", headers=[], tests=one_of(200, 302)),
], "Order service metadata"))

items.append(folder("01 - Auth & prerequisites", [
    req("POST auth login", "POST", f"{A}/api/auth/login",
        {"username": "{{username}}", "password": "{{password}}"},
        headers=no_auth(), tests=login_ok,
        desc="JWT chua roles + permissions (RBAC). Login lai neu token cu."),
    req("GET user addresses -> addressId", "GET", f"{U}/api/addresses", headers=bearer(), tests=save_address),
    req("POST cart add variant (115)", "POST", f"{C}/api/cart",
        {"variantId": "{{variantId}}", "quantity": 1}, headers=bearer(), tests=t200,
        desc="Can cart co item truoc checkout"),
], "JWT + addressId + gio hang"))

items.append(folder("02 - Public APIs", [
    req("GET /api/coupons", "GET", f"{O}/api/coupons", headers=no_auth(), tests=save_coupon),
    req("GET /api/public/warranty/check/TEST-CODE", "GET",
        f"{O}/api/public/warranty/check/TEST-CODE", headers=no_auth(), tests=t200or400),
    req("GET /api/shipping/provinces", "GET", f"{O}/api/shipping/provinces", headers=no_auth(),
        tests=one_of(200, 502), desc="GHN proxy - co the fallback"),
    req("GET /api/shipping/districts?provinceId=202", "GET",
        f"{O}/api/shipping/districts?provinceId=202", headers=no_auth(),
        tests=one_of(200, 502)),
    req("POST /api/shipping/fee", "POST", f"{O}/api/shipping/fee",
        {"toDistrictId": 3695, "toWardCode": "90737", "weight": 500},
        headers=no_auth(), tests=one_of(200, 400, 502)),
    req("POST /api/shipping/checkout", "POST", f"{O}/api/shipping/checkout",
        {"toDistrictId": 3695, "toWardCode": "90737", "toProvinceId": 202, "orderSubtotal": 500000},
        headers=no_auth(), tests=one_of(200, 400, 502)),
], "Coupons, warranty, GHN shipping - khong JWT"))

items.append(folder("03 - Orders JWT auth", [
    req("GET /api/orders - no JWT", "GET", f"{O}/api/orders?page=0&size=5", headers=no_auth(), tests=t401),
    req("GET /api/orders - with JWT", "GET", f"{O}/api/orders?page=0&size=5", headers=bearer(), tests=t200,
        desc="Can USER_ORDER_HISTORY trong JWT permissions"),
    req("GET /api/orders/INVALID-CODE", "GET", f"{O}/api/orders/INVALID-CODE", headers=bearer(), tests=t404),
], "Orders can JWT + RBAC permission"))

items.append(folder("04 - Checkout (POST /api/orders)", [
    req("POST checkout COD - addressId", "POST", f"{O}/api/orders",
        {"addressId": "{{addressId}}", "paymentMethod": "COD", "note": "Postman E2E test"},
        headers=bearer(), tests=save_order, desc="E2E: cart -> order COD (can CHECKOUT_PAYMENT)"),
    req("POST checkout - missing paymentMethod", "POST", f"{O}/api/orders",
        {"addressId": "{{addressId}}"}, headers=bearer(), tests=t400),
    req("POST checkout - invalid address 999999", "POST", f"{O}/api/orders",
        {"addressId": 999999, "paymentMethod": "COD"}, headers=bearer(), tests=t400or404),
    req("POST checkout inline shipping", "POST", f"{O}/api/orders",
        {
            "shippingName": "Khang Test",
            "shippingPhone": "0901234567",
            "shippingAddress": "123 Test St",
            "shippingProvince": "Ho Chi Minh",
            "shippingDistrict": "Quan 1",
            "shippingWard": "Phuong Ben Nghe",
            "paymentMethod": "COD",
            "note": "Inline address test",
        },
        headers=bearer(), tests=t200),
], "Dat hang tu gio"))

items.append(folder("05 - Order detail & history", [
    req("GET /api/orders/{{orderCode}}", "GET", f"{O}/api/orders/{{{{orderCode}}}}", headers=bearer(),
        tests=t200or404, desc="Chay folder 04 truoc de co orderCode"),
    req("GET /api/orders?status=PENDING", "GET", f"{O}/api/orders?page=0&size=5&status=PENDING",
        headers=bearer(), tests=t200),
], "Chi tiet don"))

items.append(folder("06 - Preview coupon", [
    req("GET /api/orders/preview-coupon?code={{couponCode}}", "GET",
        f"{O}/api/orders/preview-coupon?code={{{{couponCode}}}}", headers=bearer(), tests=t200or400),
    req("GET preview-coupon INVALID", "GET", f"{O}/api/orders/preview-coupon?code=INVALID-XYZ",
        headers=bearer(), tests=t400or404),
], "Xem truoc giam gia"))

items.append(folder("07 - Cancel order", [
    req("PUT /api/orders/{{orderId}}/cancel", "PUT", f"{O}/api/orders/{{{{orderId}}}}/cancel",
        {"reason": "Postman test cancel"}, headers=bearer(), tests=t200or400or404),
    req("PUT cancel order 999999", "PUT", f"{O}/api/orders/999999/cancel",
        {"reason": "test"}, headers=bearer(), tests=t404),
], "Huy don customer"))

items.append(folder("08 - Payment APIs", [
    req("GET /api/payment/status/{{orderCode}}", "GET",
        f"{O}/api/payment/status/{{{{orderCode}}}}", headers=bearer(), tests=t200or404),
    req("GET /api/payment/history/{{orderCode}}", "GET",
        f"{O}/api/payment/history/{{{{orderCode}}}}", headers=bearer(), tests=t200or404),
    req("POST /api/payment/create", "POST", f"{O}/api/payment/create",
        {"orderCode": "{{orderCode}}", "bankCode": "", "language": "vn"},
        headers=bearer(), tests=t200or400or404),
    req("GET /api/payment/vnpay/ipn (smoke)", "GET", f"{O}/api/payment/vnpay/ipn", headers=no_auth(),
        tests=t200or400, desc="Callback public - smoke only"),
    req("POST /api/payment/momo/ipn (smoke)", "POST", f"{O}/api/payment/momo/ipn", headers=no_auth(),
        tests=t200or400),
], "Payment + gateway callbacks smoke"))

items.append(folder("09 - Admin (CUSTOMER -> 403)", [
    req("GET /api/admin/orders", "GET", f"{O}/api/admin/orders?page=0&size=5", headers=bearer(), tests=t403),
    req("GET /api/admin/orders/stats", "GET", f"{O}/api/admin/orders/stats", headers=bearer(), tests=t403),
    req("GET /api/admin/orders/hidden", "GET", f"{O}/api/admin/orders/hidden", headers=bearer(), tests=t403),
    req("GET /api/admin/orders/1", "GET", f"{O}/api/admin/orders/1", headers=bearer(),
        tests=one_of(403, 404)),
    req("PUT /api/admin/orders/1/status", "PUT", f"{O}/api/admin/orders/1/status",
        {"status": "CONFIRMED"}, headers=bearer(), tests=t403),
    req("GET /api/admin/warranty/tickets", "GET", f"{O}/api/admin/warranty/tickets", headers=bearer(), tests=t403),
], "Admin can ORDER_VIEW_ALL / WARRANTY_MANAGE / ROLE_ADMIN"))

items.append(folder("10 - Internal APIs", [
    req("GET verified-purchase user/product", "GET",
        f"{O}/api/orders/internal/users/{{{{userId}}}}/products/{{{{productId}}}}/verified-purchase",
        headers=no_auth(), tests=t200, desc="Feign review-service - direct :8086"),
    req("GET internal statistics overview", "GET", f"{O}/api/orders/internal/statistics/overview",
        headers=no_auth(), tests=t200),
    req("GET internal statistics top-products", "GET",
        f"{O}/api/orders/internal/statistics/top-products?limit=5", headers=no_auth(), tests=t200),
    req("GET internal statistics revenue/chart", "GET",
        f"{O}/api/orders/internal/statistics/revenue/chart?period=month", headers=no_auth(), tests=t200),
], "Internal Feign - direct :8086 (public, khong qua gateway)"))

items.append(folder("11 - API Gateway", [
    req("Gateway GET /api/coupons", "GET", f"{GW}/api/coupons", headers=no_auth(), tests=t200),
    req("Gateway GET /api/orders + JWT", "GET", f"{GW}/api/orders?page=0&size=3", headers=bearer(), tests=t200),
    req("Gateway POST checkout COD", "POST", f"{GW}/api/orders",
        {"addressId": "{{addressId}}", "paymentMethod": "COD", "note": "Gateway test"},
        headers=bearer(), tests=t200),
    req("Gateway GET /api/shipping/provinces", "GET", f"{GW}/api/shipping/provinces", headers=no_auth(),
        tests=one_of(200, 502)),
], "Order qua :8080"))

items.append(folder("12 - Edge cases", [
    req("POST /api/orders - no JWT", "POST", f"{O}/api/orders",
        {"paymentMethod": "COD", "addressId": 1}, headers=no_auth(), tests=t401),
    req("PATCH /api/orders - not allowed", "PATCH", f"{O}/api/orders", headers=bearer(),
        tests=['pm.test("405", () => pm.response.to.have.status(405));']),
    req("GET unknown path", "GET", f"{O}/api/orders-unknown", headers=bearer(), tests=t404),
], "Method / path khong hop le"))

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - order-service (Full Coverage)",
        "description": (
            "Kiem thu order-service (:8086).\n\n"
            "## Coverage\n"
            "- Coupons, warranty, GHN shipping (public)\n"
            "- Checkout COD, orders, cancel, preview coupon (JWT + RBAC permissions)\n"
            "- Payment status/history, admin 403 (CUSTOMER)\n"
            "- Internal statistics + verified purchase (direct :8086)\n"
            "- Gateway\n\n"
            "JWT can permissions: USER_ORDER_HISTORY, CHECKOUT_PAYMENT, ...\n"
            "Phu thuoc: auth, user (address), cart (variant 115)\n"
            "Import: order-service.postman_environment.json\n"
            "Huong dan: api-tests/ORDER_POSTMAN_GUIDE.md\n\n"
            "python api-tests/generate_order_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "orderUrl", "value": "http://localhost:8086"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "userUrl", "value": "http://localhost:8083"},
        {"key": "cartUrl", "value": "http://localhost:8084"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "accessToken", "value": ""},
        {"key": "userId", "value": "1"},
        {"key": "productId", "value": "1"},
        {"key": "variantId", "value": "115"},
        {"key": "addressId", "value": "1"},
        {"key": "orderCode", "value": ""},
        {"key": "orderId", "value": ""},
        {"key": "couponCode", "value": ""},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {OUT} - {len(items)} folders, {sum(len(f['item']) for f in items)} requests")
