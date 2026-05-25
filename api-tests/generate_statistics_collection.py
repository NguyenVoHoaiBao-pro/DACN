#!/usr/bin/env python3
"""Generate statistics-service Postman collection. Run: python api-tests/generate_statistics_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "statistics-service.postman_collection.json"

S = "{{statisticsUrl}}"
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
]

t200 = ['pm.test("Status 200", () => pm.response.to.have.status(200));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("Status 401 or 403", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t403 = ['pm.test("Status 403 Forbidden", () => pm.response.to.have.status(403));']

track_ok = t200 + [
    "const j = pm.response.json();",
    'pm.test("Has interaction data", () => pm.expect(j.data).to.be.an("object"));',
]

track_view = track_ok + [
    'pm.test("VIEW score 1.0", () => pm.expect(Number(j.data.interactionScore)).to.eql(1));',
]

track_click = track_ok + [
    'pm.test("CLICK normalized to CART (DB)", () => pm.expect(j.data.actionType).to.eql("CART"));',
    'pm.test("CART score 3.0", () => pm.expect(Number(j.data.interactionScore)).to.eql(3));',
]

track_rating = track_ok + [
    'pm.test("RATING normalized to RATED", () => pm.expect(j.data.actionType).to.eql("RATED"));',
    'pm.test("RATED score from rating", () => pm.expect(Number(j.data.interactionScore)).to.eql(4.5));',
]

items = []

items.append(folder("00 - OpenAPI & health", [
    req("GET /v3/api-docs", "GET", f"{S}/v3/api-docs", headers=no_auth(), tests=t200),
    req("GET /actuator/health", "GET", f"{S}/actuator/health", headers=no_auth(), tests=t200),
    req("GET Swagger UI", "GET", f"{S}/swagger-ui/index.html", headers=[], tests=[
        'pm.test("200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));']),
], "Statistics service - can Redis"))

items.append(folder("01 - Auth login", [
    req("POST auth login", "POST", f"{A}/api/auth/login",
        {"username": "{{username}}", "password": "{{password}}"},
        headers=no_auth(), tests=login_ok),
], "JWT cho gateway interactions + admin tests"))

items.append(folder("02 - Track interactions (public direct)", [
    req("POST /api/interactions/track - VIEW", "POST", f"{S}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "{{productId}}", "actionType": "VIEW"},
        headers=no_auth(), tests=track_view),
    req("POST /api/interactions/track - CLICK", "POST", f"{S}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "2", "actionType": "CLICK"},
        headers=no_auth(), tests=track_click,
        desc="Alias CLICK -> luu CART score 3.0 theo DB"),
    req("POST /api/interactions/track - RATING", "POST", f"{S}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "3", "actionType": "RATING", "rating": 4.5},
        headers=no_auth(), tests=track_rating,
        desc="Alias RATING -> luu RATED, score = rating"),
    req("POST /api/interactions/track - CART", "POST", f"{S}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "4", "actionType": "CART"},
        headers=no_auth(), tests=track_click),
    req("POST /api/interactions/track - PURCHASE", "POST", f"{S}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "5", "actionType": "PURCHASE"},
        headers=no_auth(), tests=track_ok + [
            'pm.test("PURCHASE score 5.0", () => pm.expect(Number(j.data.interactionScore)).to.eql(5));',
        ]),
    req("POST track - missing productId", "POST", f"{S}/api/interactions/track",
        {"userId": 1, "actionType": "VIEW"}, headers=no_auth(),
        tests=['pm.test("200 or 400", () => pm.expect(pm.response.code).to.be.oneOf([200, 400]));']),
    req("POST track - invalid actionType", "POST", f"{S}/api/interactions/track",
        {"userId": 1, "productId": 1, "actionType": "INVALID"},
        headers=no_auth(), tests=['pm.test("200 or 400", () => pm.expect(pm.response.code).to.be.oneOf([200, 400]));']),
], "Direct :8088 - khong can JWT"))

items.append(folder("03 - Recommendations (public)", [
    req("GET /api/recommendations/user/{{userId}}", "GET",
        f"{S}/api/recommendations/user/{{{{userId}}}}", headers=no_auth(), tests=t200),
    req("GET recommendations user 999999", "GET", f"{S}/api/recommendations/user/999999",
        headers=no_auth(), tests=t200, desc="User moi - co the tra list rong"),
], "Goi y san pham AI"))

items.append(folder("04 - Admin statistics (CUSTOMER -> 403)", [
    req("GET /api/admin/statistics/overview", "GET", f"{S}/api/admin/statistics/overview",
        headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/revenue/chart", "GET",
        f"{S}/api/admin/statistics/revenue/chart?period=month", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/orders/by-status", "GET",
        f"{S}/api/admin/statistics/orders/by-status", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/top-products", "GET",
        f"{S}/api/admin/statistics/top-products?limit=5", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/orders/recent", "GET",
        f"{S}/api/admin/statistics/orders/recent?limit=5", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/payment-methods", "GET",
        f"{S}/api/admin/statistics/payment-methods", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/conversion-rate", "GET",
        f"{S}/api/admin/statistics/conversion-rate", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/customer-segments", "GET",
        f"{S}/api/admin/statistics/customer-segments", headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/revenue", "GET", f"{S}/api/admin/statistics/revenue",
        headers=bearer(), tests=t403),
    req("GET /api/admin/statistics/top-products-legacy", "GET",
        f"{S}/api/admin/statistics/top-products-legacy", headers=bearer(), tests=t403),
], "Can REPORT_REVENUE / ROLE_ADMIN"))

items.append(folder("05 - API Gateway", [
    req("Gateway GET recommendations", "GET", f"{GW}/api/recommendations/user/{{{{userId}}}}",
        headers=no_auth(), tests=t200, desc="/api/recommendations/** public tren gateway"),
    req("Gateway POST track - no JWT -> 401", "POST", f"{GW}/api/interactions/track",
        {"userId": 1, "productId": 1, "actionType": "VIEW"}, headers=no_auth(), tests=t401,
        desc="/api/interactions/** KHONG public tren gateway"),
    req("Gateway POST track - with JWT", "POST", f"{GW}/api/interactions/track",
        {"userId": "{{userId}}", "productId": "{{productId}}", "actionType": "VIEW"},
        headers=bearer(), tests=t200),
    req("Gateway GET admin/overview + JWT CUSTOMER", "GET", f"{GW}/api/admin/statistics/overview",
        headers=bearer(), tests=t403),
], "Gateway public vs protected paths"))

items.append(folder("06 - Edge cases", [
    req("PATCH /api/interactions/track", "PATCH", f"{S}/api/interactions/track", headers=no_auth(),
        tests=['pm.test("405", () => pm.response.to.have.status(405));']),
    req("GET unknown path", "GET", f"{S}/api/statistics-unknown", headers=no_auth(),
        tests=['pm.test("404", () => pm.response.to.have.status(404));']),
], "Edge cases"))

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - statistics-service (Full Coverage)",
        "description": (
            "Kiem thu statistics-service (:8088).\n\n"
            "## Coverage\n"
            "- POST /api/interactions/track (VIEW/CART/CLICK/PURCHASE/RATING)\n"
            "- GET /api/recommendations/user/{userId}\n"
            "- Admin dashboard 403\n"
            "- Gateway (interactions can JWT, recommendations public)\n\n"
            "Can Redis trong .env\n"
            "Import: statistics-service.postman_environment.json\n"
            "Huong dan: api-tests/STATISTICS_POSTMAN_GUIDE.md\n\n"
            "python api-tests/generate_statistics_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "statisticsUrl", "value": "http://localhost:8088"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "accessToken", "value": ""},
        {"key": "userId", "value": "1"},
        {"key": "productId", "value": "1"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {OUT} - {len(items)} folders, {sum(len(f['item']) for f in items)} requests")
