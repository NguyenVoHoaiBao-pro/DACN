#!/usr/bin/env python3
"""Generate review-service Postman collection. Run: python api-tests/generate_review_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "review-service.postman_collection.json"

R = "{{reviewUrl}}"
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


def one_of(*codes):
    joined = ", ".join(str(c) for c in codes)
    return [f'pm.test("Status one of [{joined}]", () => pm.expect(pm.response.code).to.be.oneOf([{joined}]));']


login_ok = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.environment.set("accessToken", j.data.accessToken);',
    'pm.collectionVariables.set("accessToken", j.data.accessToken);',
]

save_review = [
    'pm.test("Status 201 Created", () => pm.response.to.have.status(201));',
    "const j = pm.response.json();",
    'pm.test("isApproved = false (cho duyet)", () => pm.expect(j.data.isApproved).to.eql(false));',
    'if (j.data && j.data.id) {',
    '  pm.environment.set("reviewId", String(j.data.id));',
    '  pm.collectionVariables.set("reviewId", String(j.data.id));',
    "}",
]

t200 = ['pm.test("Status 200", () => pm.response.to.have.status(200));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("Status 401 or 403", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t403 = ['pm.test("Status 403 Forbidden", () => pm.response.to.have.status(403));']
t404 = ['pm.test("Status 404", () => pm.response.to.have.status(404));']

items = []

items.append(folder("00 - OpenAPI & health", [
    req("GET /v3/api-docs", "GET", f"{R}/v3/api-docs", headers=no_auth(), tests=t200),
    req("GET /actuator/health", "GET", f"{R}/actuator/health", headers=no_auth(), tests=t200),
    req("GET Swagger UI", "GET", f"{R}/swagger-ui/index.html", headers=[], tests=one_of(200, 302)),
], "Review service metadata"))

items.append(folder("01 - Auth login", [
    req("POST auth login", "POST", f"{A}/api/auth/login",
        {"username": "{{username}}", "password": "{{password}}"},
        headers=no_auth(), tests=login_ok),
], "JWT cho POST/PUT/DELETE"))

items.append(folder("02 - Public GET reviews (chi is_approved=1)", [
    req("GET /api/reviews?product_id=1", "GET",
        f"{R}/api/reviews?product_id={{{{productId}}}}&page=0&size=10", headers=no_auth(), tests=t200,
        desc="Chi hien thi review da duyet (DB is_approved=1)"),
    req("GET /api/reviews?product_id=1&rating=5", "GET",
        f"{R}/api/reviews?product_id={{{{productId}}}}&rating=5&page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/reviews/summary?product_id=1", "GET",
        f"{R}/api/reviews/summary?product_id={{{{productId}}}}", headers=no_auth(), tests=t200),
    req("GET /api/reviews - missing product_id", "GET", f"{R}/api/reviews?page=0", headers=no_auth(), tests=t400),
    req("GET /api/reviews?product_id=999999", "GET",
        f"{R}/api/reviews?product_id=999999&page=0", headers=no_auth(), tests=t404,
        desc="Product khong ton tai tren catalog -> 404"),
], "Doc danh gia da duyet - khong JWT"))

items.append(folder("03 - Public helpful", [
    req("POST /api/reviews/{{reviewId}}/helpful", "POST",
        f"{R}/api/reviews/{{{{reviewId}}}}/helpful", headers=no_auth(),
        tests=one_of(200, 404),
        desc="reviewId tu folder 05 hoac seed da duyet"),
    req("POST helpful review 999999", "POST", f"{R}/api/reviews/999999/helpful", headers=no_auth(), tests=t404),
], "Danh dau huu ich - public"))

items.append(folder("04 - My reviews (JWT)", [
    req("GET /api/reviews/my - no JWT", "GET", f"{R}/api/reviews/my?page=0&size=5", headers=no_auth(), tests=t401),
    req("GET /api/reviews/my - with JWT", "GET", f"{R}/api/reviews/my?page=0&size=5", headers=bearer(), tests=t200,
        desc="Bao gom ca review cho duyet (is_approved=0)"),
], "Danh gia cua toi - moi trang thai duyet"))

items.append(folder("05 - Create / update / delete review", [
    req("POST /api/reviews - create", "POST", f"{R}/api/reviews",
        {
            "productId": "{{productId}}",
            "variantId": "{{variantId}}",
            "rating": 5,
            "title": "Postman test review",
            "content": "San pham tot, test tu Postman collection.",
            "pros": "Chat luong",
            "cons": "Khong co",
        },
        headers=bearer(), tests=save_review,
        desc="DB: is_approved=0 sau khi tao; is_verified_purchase tu order neu co"),
    req("POST /api/reviews - missing rating", "POST", f"{R}/api/reviews",
        {"productId": 1, "content": "no rating"}, headers=bearer(), tests=t400),
    req("POST /api/reviews - rating 6 invalid", "POST", f"{R}/api/reviews",
        {"productId": 1, "rating": 6}, headers=bearer(), tests=t400),
    req("POST /api/reviews - no JWT", "POST", f"{R}/api/reviews",
        {"productId": 1, "rating": 5}, headers=no_auth(), tests=t401),
    req("PUT /api/reviews/{{reviewId}}", "PUT", f"{R}/api/reviews/{{{{reviewId}}}}",
        {"rating": 4, "title": "Updated", "content": "Updated content from Postman"},
        headers=bearer(), tests=[
            'pm.test("Status 200", () => pm.response.to.have.status(200));',
            'pm.test("Sua noi dung -> isApproved false", () => pm.expect(pm.response.json().data.isApproved).to.eql(false));',
        ]),
    req("DELETE /api/reviews/{{reviewId}}", "DELETE", f"{R}/api/reviews/{{{{reviewId}}}}",
        headers=bearer(), tests=one_of(200, 404)),
    req("DELETE review 999999", "DELETE", f"{R}/api/reviews/999999", headers=bearer(), tests=t404),
], "CRUD danh gia - can JWT"))

items.append(folder("06 - Admin reviews (CUSTOMER -> 403)", [
    req("GET /api/admin/reviews", "GET", f"{R}/api/admin/reviews?page=0&size=5", headers=bearer(), tests=t403),
    req("PUT /api/admin/reviews/1/status", "PUT", f"{R}/api/admin/reviews/1/status",
        {"isApproved": True}, headers=bearer(), tests=t403,
        desc="Admin duyet review (is_approved=1) - can ROLE_ADMIN"),
    req("POST /api/admin/reviews/1/reply", "POST", f"{R}/api/admin/reviews/1/reply",
        {"replyContent": "Cam on ban"}, headers=bearer(), tests=t403),
    req("DELETE /api/admin/reviews/999999", "DELETE", f"{R}/api/admin/reviews/999999", headers=bearer(), tests=t403),
], "Admin duyet / tra loi / xoa - ROLE_ADMIN"))

items.append(folder("07 - API Gateway", [
    req("Gateway GET /api/reviews?product_id=1", "GET",
        f"{GW}/api/reviews?product_id={{{{productId}}}}&page=0&size=5", headers=no_auth(), tests=t200),
    req("Gateway GET /api/reviews/summary", "GET",
        f"{GW}/api/reviews/summary?product_id={{{{productId}}}}", headers=no_auth(), tests=t200),
    req("Gateway GET /api/reviews/my + JWT", "GET", f"{GW}/api/reviews/my", headers=bearer(),
        tests=one_of(200, 401)),
    req("Gateway GET /api/admin/reviews + JWT CUSTOMER", "GET", f"{GW}/api/admin/reviews",
        headers=bearer(), tests=t403),
], "Review qua :8080"))

items.append(folder("08 - Edge cases", [
    req("PATCH /api/reviews - not allowed", "PATCH", f"{R}/api/reviews", headers=bearer(),
        tests=['pm.test("405", () => pm.response.to.have.status(405));']),
    req("GET unknown path - no JWT", "GET", f"{R}/api/reviews-unknown", headers=no_auth(),
        tests=one_of(403, 404)),
    req("GET unknown path - with JWT", "GET", f"{R}/api/reviews-unknown", headers=bearer(), tests=t404),
], "Edge cases"))

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - review-service (Full Coverage)",
        "description": (
            "Kiem thu review-service (:8087).\n\n"
            "## Nghiep vu (DB electro_review_db)\n"
            "- Tao review: is_approved=0 (cho duyet)\n"
            "- Public GET: chi is_approved=1\n"
            "- is_verified_purchase + order_id: tuy chon, tu order-service\n"
            "- Admin: duyet, tra loi (reply_content)\n\n"
            "Import: review-service.postman_environment.json\n"
            "Huong dan: api-tests/REVIEW_POSTMAN_GUIDE.md\n\n"
            "python api-tests/generate_review_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "reviewUrl", "value": "http://localhost:8087"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "accessToken", "value": ""},
        {"key": "productId", "value": "1"},
        {"key": "variantId", "value": "115"},
        {"key": "reviewId", "value": "1"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {OUT} - {len(items)} folders, {sum(len(f['item']) for f in items)} requests")
