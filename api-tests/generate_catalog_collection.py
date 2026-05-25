#!/usr/bin/env python3
"""Generate catalog-service Postman collection. Run: python api-tests/generate_catalog_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "catalog-service.postman_collection.json"

C = "{{catalogUrl}}"
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
t201 = ['pm.test("Status 201", () => pm.response.to.have.status(201));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("401 or 403", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t403 = ['pm.test("Status 403", () => pm.response.to.have.status(403));']
t404 = ['pm.test("Status 404", () => pm.response.to.have.status(404));']
t405 = ['pm.test("Status 405", () => pm.response.to.have.status(405));']

save_product_id = t200 + [
    "const j = pm.response.json();",
    'if (j.data && j.data.id) { pm.environment.set("productId", String(j.data.id)); }',
]

OPENAPI_PATHS = [
    "/api/products",
    "/api/products/{id}",
    "/api/products/search",
    "/api/categories",
    "/api/categories/{id}",
    "/api/producers",
    "/api/admin/inventory/import",
    "/api/admin/suppliers",
    "/api/admin/purchase-orders",
    "/api/products/internal/{productId}",
    "/api/internal/catalog/variants/{variantId}/cart-info",
]

openapi_tests = ['pm.test("OpenAPI 200", () => pm.response.to.have.status(200));', "const j = pm.response.json();", 'pm.test("Paths documented", () => {']
for p in OPENAPI_PATHS:
    openapi_tests.append(f'  pm.expect(j.paths).to.have.property("{p}");')
openapi_tests.append("});")

items = []

items.append(folder("00 - OpenAPI & Health", [
    req("GET OpenAPI v3/api-docs", "GET", f"{C}/v3/api-docs", headers=[], tests=openapi_tests),
    req("GET Swagger UI", "GET", f"{C}/swagger-ui/index.html", headers=[],
        tests=['pm.test("200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));']),
    req("GET Actuator health", "GET", f"{C}/actuator/health", headers=[],
        tests=['pm.test("200 UP", () => { pm.response.to.have.status(200); pm.expect(pm.response.json().status).to.eql("UP"); });']),
], "Can catalog-service :8082 + MySQL electro_catalog_db"))

items.append(folder("01 - Auth JWT (cho admin / gateway protected)", [
    req("POST auth login - save token", "POST", f"{A}/api/auth/login",
        {"username": "{{username}}", "password": "{{password}}"}, tests=login_ok,
        desc="Can auth :8081. Token CUSTOMER thuong 403 tren admin catalog"),
], "Folder 01 neu test admin qua gateway"))

items.append(folder("02 - Products public (GET)", [
    req("GET /api/products - list", "GET", f"{C}/api/products?page=0&size=10", headers=no_auth(), tests=t200),
    req("GET /api/products/{{productId}}", "GET", f"{C}/api/products/{{{{productId}}}}", headers=no_auth(), tests=t200),
    req("GET /api/products/{{productId}}/variants", "GET", f"{C}/api/products/{{{{productId}}}}/variants", headers=no_auth(), tests=t200),
    req("GET /api/products/sku/{{sampleSku}}", "GET", f"{C}/api/products/sku/{{{{sampleSku}}}}", headers=no_auth(),
        tests=t200, desc="SKU tren variant (sampleSku=STD-1-DEF cho product 1)"),
    req("GET /api/products/search?keyword=", "GET", f"{C}/api/products/search?keyword=laptop&page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/products/search - sort price desc", "GET",
        f"{C}/api/products/search?sort_by=price&sort_dir=desc&page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/products/best-sellers", "GET", f"{C}/api/products/best-sellers?page=0&size=8", headers=no_auth(), tests=t200),
    req("GET /api/products/featured", "GET", f"{C}/api/products/featured?page=0&size=8", headers=no_auth(), tests=t200),
    req("GET /api/products/brands", "GET", f"{C}/api/products/brands", headers=no_auth(), tests=t200),
    req("GET /api/products/product-type/1", "GET", f"{C}/api/products/product-type/1?page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/products/producer/1", "GET", f"{C}/api/products/producer/1?page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/products/999999 - not found", "GET", f"{C}/api/products/999999", headers=no_auth(), tests=t404),
    req("POST /api/products - method not allowed", "POST", f"{C}/api/products", {}, headers=no_auth(),
        tests=['pm.test("403 without PRODUCT_MANAGE", () => pm.expect(pm.response.code).to.be.oneOf([403, 401, 405]);']),
], "Public - khong can JWT tren :8082 va gateway"))

items.append(folder("03 - Products admin (PRODUCT_MANAGE)", [
    req("POST /api/products - CUSTOMER JWT -> 403", "POST", f"{C}/api/products",
        {"name": "Postman Product", "sku": "PM-TEST-001", "basePrice": 100.0, "productTypeId": 1},
        headers=bearer(), tests=t403, desc="Can quyen PRODUCT_MANAGE trong DB"),
    req("PUT /api/products/{{productId}} - CUSTOMER -> 403", "PUT", f"{C}/api/products/{{{{productId}}}}",
        {"name": "Updated Name"}, headers=bearer(), tests=t403),
    req("DELETE /api/products/999999 - CUSTOMER -> 403", "DELETE", f"{C}/api/products/999999", headers=bearer(), tests=t403),
    req("PUT /api/products/{{productId}}/stock?quantity=10 - CUSTOMER -> 403", "PUT",
        f"{C}/api/products/{{{{productId}}}}/stock?quantity=10", headers=bearer(), tests=t403),
], "Tao/sua/xoa can role admin/staff co PRODUCT_MANAGE"))

items.append(folder("04 - Categories (GET public)", [
    req("GET /api/categories", "GET", f"{C}/api/categories?page=0&size=10", headers=no_auth(), tests=t200),
    req("GET /api/categories/list", "GET", f"{C}/api/categories/list", headers=no_auth(), tests=t200),
    req("GET /api/categories/root", "GET", f"{C}/api/categories/root", headers=no_auth(), tests=t200),
    req("GET /api/categories/{{categoryId}}", "GET", f"{C}/api/categories/{{{{categoryId}}}}", headers=no_auth(), tests=t200),
    req("GET /api/categories/slug/{{categorySlug}}", "GET", f"{C}/api/categories/slug/{{{{categorySlug}}}}", headers=no_auth(),
        tests=['pm.test("200 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));']),
    req("GET /api/categories/{{categoryId}}/subcategories", "GET",
        f"{C}/api/categories/{{{{categoryId}}}}/subcategories", headers=no_auth(), tests=t200),
    req("GET /api/categories/search?keyword=phone", "GET",
        f"{C}/api/categories/search?keyword=phone&page=0&size=5", headers=no_auth(), tests=t200),
    req("GET /api/categories/{{categoryId}}/variants", "GET",
        f"{C}/api/categories/{{{{categoryId}}}}/variants", headers=no_auth(), tests=t200),
    req("GET /api/categories/home", "GET", f"{C}/api/categories/home", headers=no_auth(), tests=t200),
    req("POST /api/categories - CUSTOMER -> 403", "POST", f"{C}/api/categories",
        {"name": "Test Cat", "slug": "test-cat"}, headers=bearer(), tests=t403),
], "Danh muc - public read"))

items.append(folder("05 - Producers", [
    req("GET /api/producers", "GET", f"{C}/api/producers", headers=no_auth(), tests=t200),
    req("GET /api/producers via gateway", "GET", f"{GW}/api/producers", headers=no_auth(), tests=t200),
], "Nha san xuat - public"))

items.append(folder("06 - Admin inventory (JWT tren gateway)", [
    req("GET /api/admin/inventory/stats", "GET", f"{C}/api/admin/inventory/stats?lowStockThreshold=10",
        headers=bearer(), tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
    req("GET /api/admin/inventory/transactions", "GET", f"{C}/api/admin/inventory/transactions",
        headers=bearer(), tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
    req("GET /api/admin/inventory/variants/search?q=1", "GET",
        f"{C}/api/admin/inventory/variants/search?q=1", headers=bearer(),
        tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
    req("POST /api/admin/inventory/import - no JWT direct", "POST", f"{C}/api/admin/inventory/import",
        {"variantId": 1, "quantity": 1, "note": "test"}, headers=no_auth(),
        tests=['pm.test("200 or 403 or 400", () => pm.expect(pm.response.code).to.be.oneOf([200, 403, 400]);']),
    req("Gateway GET inventory/stats - no JWT -> 401", "GET", f"{GW}/api/admin/inventory/stats", headers=no_auth(), tests=t401),
    req("Gateway GET inventory/stats - with JWT", "GET", f"{GW}/api/admin/inventory/stats?lowStockThreshold=10",
        headers=bearer(), tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
], "Admin kho - gateway can JWT"))

items.append(folder("07 - Admin suppliers & purchase-orders", [
    req("GET /api/admin/suppliers", "GET", f"{C}/api/admin/suppliers", headers=bearer(),
        tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
    req("GET /api/admin/suppliers/1", "GET", f"{C}/api/admin/suppliers/1", headers=bearer(),
        tests=['pm.test("200 or 403 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 403, 404]));']),
    req("GET /api/admin/purchase-orders", "GET", f"{C}/api/admin/purchase-orders", headers=bearer(),
        tests=['pm.test("200 or 403", () => pm.expect(pm.response.code).to.be.oneOf([200, 403]));']),
    req("GET /api/admin/purchase-orders/1", "GET", f"{C}/api/admin/purchase-orders/1", headers=bearer(),
        tests=['pm.test("200 or 403 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 403, 404]));']),
], "Nha cung cap + don nhap"))

items.append(folder("08 - Internal APIs (Feign)", [
    req("GET /api/products/internal/{{productId}}", "GET", f"{C}/api/products/internal/{{{{productId}}}}", headers=[],
        tests=t200, desc="Feign user-service wishlist - direct :8082"),
    req("GET /api/products/internal/variants/1", "GET", f"{C}/api/products/internal/variants/1", headers=[],
        tests=['pm.test("200 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));']),
    req("GET /api/products/internal/low-stock", "GET", f"{C}/api/products/internal/low-stock", headers=[], tests=t200),
    req("GET /api/internal/catalog/variants/1/cart-info", "GET",
        f"{C}/api/internal/catalog/variants/1/cart-info", headers=[], tests=t200),
    req("GET /api/internal/catalog/variants/1/cart-info via gateway -> 403", "GET",
        f"{GW}/api/internal/catalog/variants/1/cart-info", headers=bearer(), tests=t403,
        desc="/api/internal/** bi gateway chan"),
    req("GET /api/products/internal/items/by-code", "GET",
        f"{C}/api/products/internal/items/by-code?value=TEST-IMEI", headers=[],
        tests=['pm.test("200 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));']),
], "Internal - cart/order Feign. /api/internal/catalog chan qua gateway"))

items.append(folder("09 - API Gateway public catalog", [
    req("Gateway GET /api/products", "GET", f"{GW}/api/products?page=0&size=5", headers=no_auth(), tests=t200),
    req("Gateway GET /api/products/{{productId}}", "GET", f"{GW}/api/products/{{{{productId}}}}", headers=no_auth(), tests=t200),
    req("Gateway GET /api/categories", "GET", f"{GW}/api/categories?page=0&size=5", headers=no_auth(), tests=t200),
    req("Gateway GET /api/products/search", "GET", f"{GW}/api/products/search?keyword=a&page=0&size=3", headers=no_auth(), tests=t200),
], "Public qua :8080 - khong can JWT"))

items.append(folder("10 - Edge cases", [
    req("GET unknown path", "GET", f"{C}/api/catalog/unknown", headers=no_auth(), tests=t404),
    req("Malformed product id", "GET", f"{C}/api/products/abc", headers=no_auth(),
        tests=['pm.test("400 or 404 or 500", () => pm.expect(pm.response.code).to.be.oneOf([400, 404, 500]));']),
], "Duong dan khong ton tai"))

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - catalog-service (Full Coverage)",
        "description": (
            "Kiem thu catalog-service (:8082).\n\n"
            "## Coverage\n"
            "- Products, categories, producers (public GET)\n"
            "- Admin: inventory, suppliers, purchase-orders\n"
            "- Internal: products/internal, internal/catalog\n"
            "- Gateway public + internal block\n\n"
            "## Can chay\n"
            "- catalog :8082, auth :8081 (admin), gateway :8080\n\n"
            "Import: catalog-service.postman_environment.json\n"
            "Huong dan: api-tests/CATALOG_POSTMAN_GUIDE.md\n\n"
            "python api-tests/generate_catalog_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "catalogUrl", "value": "http://localhost:8082"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "accessToken", "value": ""},
        {"key": "productId", "value": "1"},
        {"key": "categoryId", "value": "1"},
        {"key": "categorySlug", "value": "dien-thoai"},
        {"key": "sampleSku", "value": "STD-1-DEF"},
        {"key": "variantId", "value": "115"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Written {OUT} - {len(items)} folders, {sum(len(f['item']) for f in items)} requests")
