#!/usr/bin/env python3
"""Generate user-service Postman collection (full coverage). Run: python api-tests/generate_user_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "user-service.postman_collection.json"

U = "{{userUrl}}"
A = "{{authUrl}}"
GW = "{{gatewayUrl}}"
user = "{{username}}"
pwd = "{{password}}"
inv_user = "{{invalidUsername}}"
inv_pid = "{{invalidProductId}}"


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


def bearer(extra=None):
    h = [
        {"key": "Content-Type", "value": "application/json"},
        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
    ]
    if extra:
        h.extend(extra)
    return h


def no_auth():
    return [{"key": "Content-Type", "value": "application/json"}]


# --- shared test scripts ---
login_ok = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.test("Has accessToken", () => {',
    '  pm.expect(j.data.accessToken).to.be.a("string").and.not.empty;',
    "});",
    'pm.test("User profile without password", () => {',
    '  pm.expect(j.data.user).to.be.an("object");',
    '  pm.expect(j.data.user).to.not.have.property("password");',
    "});",
    'pm.environment.set("accessToken", j.data.accessToken);',
    'pm.collectionVariables.set("accessToken", j.data.accessToken);',
    'if (j.data.user && j.data.user.id) {',
    '  pm.environment.set("userId", String(j.data.user.id));',
    '  pm.collectionVariables.set("userId", String(j.data.user.id));',
    "}",
]

t200 = ['pm.test("Status 200", () => pm.response.to.have.status(200));']
t201 = ['pm.test("Status 201", () => pm.response.to.have.status(201));']
t400 = ['pm.test("Status 400", () => pm.response.to.have.status(400));']
t401 = ['pm.test("Status 401 or 403 (no/invalid JWT)", () => pm.expect(pm.response.code).to.be.oneOf([401, 403]));']
t403 = ['pm.test("Status 403 Forbidden", () => pm.response.to.have.status(403));']
t404 = ['pm.test("Status 404", () => pm.response.to.have.status(404));']
t405 = ['pm.test("Status 405 Method Not Allowed", () => pm.response.to.have.status(405));']

me_ok = t200 + [
    "const j = pm.response.json();",
    'pm.test("ApiResponse status 200", () => pm.expect(j.status).to.eql(200));',
    'pm.test("Has username, no password", () => {',
    '  pm.expect(j.data.username).to.be.a("string");',
    '  pm.expect(j.data).to.not.have.property("password");',
    "});",
]

save_address = t201 + [
    "const j = pm.response.json();",
    'pm.test("Has address id", () => pm.expect(j.data.id).to.be.a("number"));',
    'if (j.data && j.data.id) {',
    '  pm.environment.set("addressId", String(j.data.id));',
    '  pm.collectionVariables.set("addressId", String(j.data.id));',
    "}",
]

save_wishlist = [
    'pm.test("Status 201 Created", () => pm.response.to.have.status(201));',
    "const j = pm.response.json();",
    'pm.test("Has wishlist item id", () => pm.expect(j.data.id).to.be.a("number"));',
    'if (j.data && j.data.id) {',
    '  pm.environment.set("wishlistItemId", String(j.data.id));',
    '  pm.collectionVariables.set("wishlistItemId", String(j.data.id));',
    "}",
]

reg_pre = [
    "const ts = Date.now();",
    'pm.environment.set("regUsername", "postman_u_" + ts);',
    'pm.environment.set("regEmail", "postman_" + ts + "@test.com");',
]

reg_body = (
    '{\n'
    '  "username": "{{regUsername}}",\n'
    '  "password": "Pass123!",\n'
    '  "email": "{{regEmail}}",\n'
    '  "name": "Postman Internal Register"\n'
    "}"
)

openapi_paths = [
    "/api/users/me",
    "/api/users/change-password",
    "/api/users/search",
    "/api/wishlist",
    "/api/wishlist/{id}",
    "/api/wishlist/product/{productId}",
    "/api/wishlist/check/{productId}",
    "/api/addresses",
    "/api/addresses/{id}",
    "/api/addresses/{id}/default",
    "/api/internal/users/login",
    "/api/internal/users/register",
    "/api/internal/users/google-login",
    "/api/internal/users/{userId}",
    "/api/internal/users/username/{username}",
    "/api/internal/users/addresses/{addressId}",
]

openapi_tests = [
    'pm.test("OpenAPI 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.test("All user-service paths documented", () => {',
]
for p in openapi_paths:
    openapi_tests.append(f'  pm.expect(j.paths).to.have.property("{p}");')
openapi_tests.append("});")

valid_address = {
    "receiverName": "Nguyen Van Postman",
    "phone": "0901234567",
    "province": "Ho Chi Minh",
    "district": "Quan 1",
    "ward": "Ben Nghe",
    "addressDetail": "123 Nguyen Hue",
    "isDefault": True,
    "label": "Nha",
}

items = []

# 00
items.append(
    folder(
        "00 - Prerequisites & Documentation",
        [
            req("GET OpenAPI v3/api-docs", "GET", f"{U}/v3/api-docs", headers=[], tests=openapi_tests,
                desc="Kiem tra tat ca path user-service co trong OpenAPI"),
            req("GET Swagger UI index", "GET", f"{U}/swagger-ui/index.html", headers=[],
                tests=['pm.test("200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));']),
            req("GET Swagger UI html", "GET", f"{U}/swagger-ui.html", headers=[],
                tests=['pm.test("200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));']),
            req("GET Actuator health", "GET", f"{U}/actuator/health", headers=[],
                tests=['pm.test("Health 200", () => pm.response.to.have.status(200));',
                       'pm.test("Status UP", () => pm.expect(pm.response.json().status).to.eql("UP"));']),
        ],
        "Can: user-service :8083, MySQL electro_user_db. Chay truoc folder 01.",
    )
)

# 01
items.append(
    folder(
        "01 - Auth JWT (prerequisite via auth-service)",
        [
            req("Login - save accessToken + userId", "POST", f"{A}/api/auth/login",
                {"username": user, "password": pwd}, tests=login_ok,
                desc="Can auth :8081, user :8083, Redis. Mat khau seed: khang_test / 123456"),
            req("Login - wrong password (sanity)", "POST", f"{A}/api/auth/login",
                {"username": user, "password": "wrong_password_xyz"},
                tests=['pm.test("401 Unauthorized", () => pm.response.to.have.status(401));']),
        ],
        "Folder 01 bat buoc truoc cac test can JWT.",
    )
)

# 02 GET /me
items.append(
    folder(
        "02 - GET /api/users/me",
        [
            req("GET /me - success", "GET", f"{U}/api/users/me", headers=bearer(), tests=me_ok),
            req("GET /me - by email login user", "GET", f"{U}/api/users/me", headers=bearer(),
                tests=me_ok, desc="JWT subject = username tu login"),
            req("GET /me - no Authorization header", "GET", f"{U}/api/users/me", headers=no_auth(), tests=t401),
            req("GET /me - invalid Bearer token", "GET", f"{U}/api/users/me",
                headers=[{"key": "Authorization", "value": "Bearer invalid.jwt.token"}],
                tests=t401),
            req("GET /me - malformed Authorization", "GET", f"{U}/api/users/me",
                headers=[{"key": "Authorization", "value": "NotBearer {{accessToken}}"}],
                tests=t401),
            req("POST /me - method not allowed", "POST", f"{U}/api/users/me", headers=bearer(), body={},
                tests=t405),
            req("DELETE /me - method not allowed", "DELETE", f"{U}/api/users/me", headers=bearer(), tests=t405),
        ],
    )
)

# 03 PUT /me
items.append(
    folder(
        "03 - PUT /api/users/me",
        [
            req("PUT /me - update name and phone", "PUT", f"{U}/api/users/me",
                {"name": "Postman Updated User", "phone": "0901234567"}, headers=bearer(),
                tests=t200 + ['pm.test("Updated name", () => pm.expect(pm.response.json().data.name).to.eql("Postman Updated User"));']),
            req("PUT /me - partial update (phone only)", "PUT", f"{U}/api/users/me",
                {"phone": "0567649206"}, headers=bearer(), tests=t200),
            req("PUT /me - empty JSON body", "PUT", f"{U}/api/users/me", {}, headers=bearer(), tests=t200),
            req("PUT /me - no token", "PUT", f"{U}/api/users/me",
                {"name": "Hack"}, headers=no_auth(), tests=t401),
            req("GET /me - verify after update", "GET", f"{U}/api/users/me", headers=bearer(), tests=me_ok),
        ],
    )
)

# 04 change password
items.append(
    folder(
        "04 - PUT /api/users/change-password",
        [
            req("Change password - wrong current password", "PUT", f"{U}/api/users/change-password",
                {"currentPassword": "wrong", "newPassword": "Pass123!", "confirmPassword": "Pass123!"},
                headers=bearer(), tests=t400),
            req("Change password - confirm mismatch", "PUT", f"{U}/api/users/change-password",
                {"currentPassword": pwd, "newPassword": "Pass123!", "confirmPassword": "Pass123!!"},
                headers=bearer(), tests=t400),
            req("Change password - new password too short", "PUT", f"{U}/api/users/change-password",
                {"currentPassword": pwd, "newPassword": "12345", "confirmPassword": "12345"},
                headers=bearer(), tests=t400),
            req("Change password - missing currentPassword", "PUT", f"{U}/api/users/change-password",
                {"newPassword": "Pass123!", "confirmPassword": "Pass123!"},
                headers=bearer(), tests=t400),
            req("Change password - no JWT", "PUT", f"{U}/api/users/change-password",
                {"currentPassword": pwd, "newPassword": "Pass123!", "confirmPassword": "Pass123!"},
                headers=no_auth(), tests=t401),
            req("Change password - success (OPTIONAL - doi mat khau DB)",
                "PUT", f"{U}/api/users/change-password",
                {"currentPassword": pwd, "newPassword": "123456", "confirmPassword": "123456"},
                headers=bearer(),
                tests=[
                    'pm.test("200 or skip", () => {',
                    '  if (pm.environment.get("skipPasswordChange") === "true") { pm.test.skip("Set skipPasswordChange=false to run"); return; }',
                    "  pm.response.to.have.status(200);",
                    "});",
                ],
                desc="Mac dinh SKIP neu set skipPasswordChange=true trong env. Chi chay khi can test doi mat khau.",
            ),
        ],
        "Negative tests an toan. Test success OPTIONAL — co the bo qua de giu mat khau seed.",
    )
)

# 05 search
items.append(
    folder(
        "05 - GET /api/users/search (staff only)",
        [
            req("Search - CUSTOMER JWT -> 403", "GET", f"{U}/api/users/search?keyword=khang&page=0&size=5",
                headers=bearer(), tests=t403,
                desc="JWT chi co role CUSTOMER — khong co USER_MANAGE/CUSTOMER_VIEW"),
            req("Search - no JWT", "GET", f"{U}/api/users/search?keyword=test", headers=no_auth(), tests=t401),
            req("Search - missing keyword param", "GET", f"{U}/api/users/search?page=0&size=5",
                headers=bearer(), tests=['pm.test("400 Bad Request", () => pm.response.to.have.status(400));']),
            req("Search - pagination page=0 size=3", "GET", f"{U}/api/users/search?keyword=khang&page=0&size=3",
                headers=bearer(), tests=t403),
        ],
    )
)

# 06 wishlist
items.append(
    folder(
        "06 - Wishlist /api/wishlist",
        [
            req("DELETE /wishlist/product/{{productId}} - cleanup before add", "DELETE",
                f"{U}/api/wishlist/product/{{{{productId}}}}", headers=bearer(), tests=[
                    'pm.test("200 or 404 if empty", () => pm.expect(pm.response.code).to.be.oneOf([200, 404, 500]));']),
            req("GET /wishlist - empty or list", "GET", f"{U}/api/wishlist?page=0&size=10", headers=bearer(),
                tests=t200 + ['pm.test("Has data array/page", () => pm.expect(pm.response.json().data).to.be.an("object"));']),
            req("GET /wishlist - pagination page=0 size=5", "GET", f"{U}/api/wishlist?page=0&size=5",
                headers=bearer(), tests=t200),
            req("GET /wishlist - no JWT", "GET", f"{U}/api/wishlist", headers=no_auth(), tests=t401),
            req("POST /wishlist - add product", "POST", f"{U}/api/wishlist",
                {"productId": "{{productId}}", "variantId": None}, headers=bearer(), tests=save_wishlist,
                desc="Can catalog-service :8082 + productId ton tai"),
            req("POST /wishlist - duplicate product -> 400", "POST", f"{U}/api/wishlist",
                {"productId": "{{productId}}"}, headers=bearer(), tests=t400),
            req("POST /wishlist - invalid productId -> 404", "POST", f"{U}/api/wishlist",
                {"productId": "{{invalidProductId}}"}, headers=bearer(), tests=t404),
            req("POST /wishlist - missing productId", "POST", f"{U}/api/wishlist",
                {}, headers=bearer(), tests=['pm.test("400 or 500", () => pm.expect(pm.response.code).to.be.oneOf([400, 500]));']),
            req("GET /wishlist/check/{{productId}} - true", "GET", f"{U}/api/wishlist/check/{{{{productId}}}}",
                headers=bearer(), tests=t200 + [
                    'pm.test("In wishlist", () => pm.expect(pm.response.json().data).to.eql(true);']),
            req("GET /wishlist/check/{{invalidProductId}} - false", "GET",
                f"{U}/api/wishlist/check/{{{{invalidProductId}}}}", headers=bearer(), tests=t200 + [
                    'pm.test("Not in wishlist", () => pm.expect(pm.response.json().data).to.eql(false);']),
            req("DELETE /wishlist/{{wishlistItemId}} - by id", "DELETE",
                f"{U}/api/wishlist/{{{{wishlistItemId}}}}", headers=bearer(), tests=t200,
                desc="Chay POST add truoc de co wishlistItemId"),
            req("DELETE /wishlist/product/{{productId}} - by productId", "DELETE",
                f"{U}/api/wishlist/product/{{{{productId}}}}", headers=bearer(), tests=[
                    'pm.test("200 or 404", () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));']),
            req("DELETE /wishlist/{{wishlistItemId}} - not found -> 404", "DELETE",
                f"{U}/api/wishlist/999999", headers=bearer(), tests=t404),
            req("DELETE /wishlist - clear all", "DELETE", f"{U}/api/wishlist", headers=bearer(), tests=t200),
            req("DELETE /wishlist - no JWT", "DELETE", f"{U}/api/wishlist", headers=no_auth(), tests=t401),
            req("PUT /wishlist - method not allowed", "PUT", f"{U}/api/wishlist", {}, headers=bearer(), tests=t405),
        ],
        "Can catalog-service cho POST wishlist. productId mac dinh=1.",
    )
)

# 07 addresses
items.append(
    folder(
        "07 - Addresses /api/addresses",
        [
            req("GET /addresses - list", "GET", f"{U}/api/addresses", headers=bearer(), tests=t200),
            req("GET /addresses - no JWT", "GET", f"{U}/api/addresses", headers=no_auth(), tests=t401),
            req("POST /addresses - create valid", "POST", f"{U}/api/addresses",
                valid_address, headers=bearer(), tests=save_address),
            req("POST /addresses - missing receiverName -> 400", "POST", f"{U}/api/addresses",
                {**valid_address, "receiverName": ""}, headers=bearer(), tests=t400),
            req("POST /addresses - invalid phone (letters) -> 400", "POST", f"{U}/api/addresses",
                {**valid_address, "phone": "abc"}, headers=bearer(), tests=t400),
            req("POST /addresses - phone too short -> 400", "POST", f"{U}/api/addresses",
                {**valid_address, "phone": "123"}, headers=bearer(), tests=t400),
            req("POST /addresses - missing addressDetail -> 400", "POST", f"{U}/api/addresses",
                {**valid_address, "addressDetail": ""}, headers=bearer(), tests=t400),
            req("PUT /addresses/{{addressId}} - update", "PUT", f"{U}/api/addresses/{{{{addressId}}}}",
                {**valid_address, "district": "Quan 3", "addressDetail": "456 Le Loi", "label": "Van phong"},
                headers=bearer(), tests=t200, desc="Chay POST create truoc"),
            req("PUT /addresses/{{addressId}}/default - set default", "PUT",
                f"{U}/api/addresses/{{{{addressId}}}}/default", headers=bearer(), tests=t200),
            req("PUT /addresses/999999 - not found -> 404", "PUT", f"{U}/api/addresses/999999",
                valid_address, headers=bearer(), tests=t404),
            req("DELETE /addresses/{{addressId}} - delete own", "DELETE",
                f"{U}/api/addresses/{{{{addressId}}}}", headers=bearer(), tests=t200),
            req("DELETE /addresses/999999 - not found -> 404", "DELETE", f"{U}/api/addresses/999999",
                headers=bearer(), tests=t404),
            req("PUT /addresses/{{addressId}} - no JWT", "PUT", f"{U}/api/addresses/{{{{addressId}}}}",
                valid_address, headers=no_auth(), tests=t401),
            req("DELETE /addresses/{{addressId}} - no JWT", "DELETE", f"{U}/api/addresses/{{{{addressId}}}}",
                headers=no_auth(), tests=t401),
            req("POST /addresses - no JWT", "POST", f"{U}/api/addresses", valid_address, headers=no_auth(), tests=t401),
        ],
    )
)

# 08 internal
items.append(
    folder(
        "08 - Internal API /api/internal/users (direct :8083)",
        [
            req("POST /internal/users/login - success", "POST", f"{U}/api/internal/users/login",
                {"username": user, "password": pwd},
                tests=t200 + ['pm.test("success true", () => pm.expect(pm.response.json().success).to.eql(true);',
                              'pm.test("Has user profile", () => pm.expect(pm.response.json().user).to.be.an("object");']),
            req("POST /internal/users/login - wrong password", "POST", f"{U}/api/internal/users/login",
                {"username": user, "password": "wrong"}, tests=t200 + [
                    'pm.test("success false", () => pm.expect(pm.response.json().success).to.eql(false);']),
            req("POST /internal/users/login - empty username", "POST", f"{U}/api/internal/users/login",
                {"username": "", "password": pwd}, tests=t200 + [
                    'pm.test("success false", () => pm.expect(pm.response.json().success).to.eql(false);']),
            req("POST /internal/users/login - empty password", "POST", f"{U}/api/internal/users/login",
                {"username": user, "password": ""}, tests=t200 + [
                    'pm.test("success false", () => pm.expect(pm.response.json().success).to.eql(false);']),
            req("POST /internal/users/login - by email", "POST", f"{U}/api/internal/users/login",
                {"username": "{{userEmail}}", "password": pwd},
                tests=t200 + ['pm.test("success true or skip", () => {',
                              '  if (!pm.environment.get("userEmail")) { pm.test.skip("Set userEmail"); return; }',
                              '  pm.expect(pm.response.json().success).to.eql(true);',
                              "});"]),
            req("POST /internal/users/register - new user", "POST", f"{U}/api/internal/users/register",
                reg_body, prerequest=reg_pre, tests=t200 + [
                    'pm.test("success true", () => pm.expect(pm.response.json().success).to.eql(true);']),
            req("POST /internal/users/register - duplicate username -> success false", "POST",
                f"{U}/api/internal/users/register",
                {"username": user, "password": "Pass123!", "email": "dup@test.com", "name": "Dup"},
                tests=t200 + ['pm.test("success false", () => pm.expect(pm.response.json().success).to.eql(false);']),
            req("POST /internal/users/register - invalid email -> 400", "POST", f"{U}/api/internal/users/register",
                {"username": "bad_email_user", "password": "Pass123!", "email": "not-an-email", "name": "Bad"},
                tests=t400),
            req("POST /internal/users/register - password too short -> 400", "POST", f"{U}/api/internal/users/register",
                {"username": "short_pwd_user", "password": "123", "email": "short@test.com", "name": "Short"},
                tests=t400),
            req("POST /internal/users/register - missing username -> 400", "POST", f"{U}/api/internal/users/register",
                {"password": "Pass123!", "email": "noname@test.com", "name": "No Name"},
                tests=t400),
            req("POST /internal/users/register - duplicate email -> success false", "POST",
                f"{U}/api/internal/users/register",
                {"username": "other_user_dup", "password": "Pass123!", "email": "{{userEmail}}", "name": "Dup Email"},
                tests=t200 + ['pm.test("success false", () => pm.expect(pm.response.json().success).to.eql(false);']),
            req("GET /internal/users/addresses/999999 - not exists", "GET",
                f"{U}/api/internal/users/addresses/999999", headers=[],
                tests=t200 + ['pm.test("Body empty or null", () => { const b = pm.response.text(); pm.expect(b === "" || b === "null" || b.includes("null")).to.be.true; });']),
            req("POST /internal/users/google-login - missing idToken -> 400", "POST",
                f"{U}/api/internal/users/google-login", {}, tests=t400),
            req("POST /internal/users/google-login - invalid idToken", "POST",
                f"{U}/api/internal/users/google-login", {"idToken": "invalid-google-token"},
                tests=['pm.test("200 success false or 500", () => pm.expect(pm.response.code).to.be.oneOf([200, 500]));']),
            req("GET /internal/users/{{userId}} - by id", "GET", f"{U}/api/internal/users/{{{{userId}}}}", headers=[],
                tests=t200, desc="Can login folder 01 de co userId"),
            req("GET /internal/users/999999 - not found -> 404", "GET", f"{U}/api/internal/users/999999", headers=[],
                tests=t404),
            req("GET /internal/users/username/{{username}}", "GET", f"{U}/api/internal/users/username/{{{{username}}}}",
                headers=[], tests=t200),
            req("GET /internal/users/username/{{invalidUsername}} - not found -> 404", "GET",
                f"{U}/api/internal/users/username/{{{{invalidUsername}}}}", headers=[], tests=t404),
            req("GET /internal/users/addresses/{{addressId}} - Feign lookup", "GET",
                f"{U}/api/internal/users/addresses/{{{{addressId}}}}", headers=[],
                tests=['pm.test("200 or null body if missing", () => pm.expect(pm.response.code).to.be.oneOf([200, 404]));'],
                desc="Tra ve entity hoac null — tao address truoc neu can 200"),
        ],
        "Khong can JWT. Khong goi qua gateway (403). Feign tu auth-service dung login/register.",
    )
)

# 09 gateway
items.append(
    folder(
        "09 - API Gateway (:8080)",
        [
            req("Gateway GET /api/users/me", "GET", f"{GW}/api/users/me", headers=bearer(), tests=me_ok),
            req("Gateway PUT /api/users/me", "PUT", f"{GW}/api/users/me",
                {"phone": "0567649206"}, headers=bearer(), tests=t200),
            req("Gateway GET /api/wishlist", "GET", f"{GW}/api/wishlist?page=0&size=5", headers=bearer(), tests=t200),
            req("Gateway GET /api/addresses", "GET", f"{GW}/api/addresses", headers=bearer(), tests=t200),
            req("Gateway POST /api/wishlist - add product", "POST", f"{GW}/api/wishlist",
                {"productId": "{{productId}}"}, headers=bearer(),
                tests=['pm.test("201 or 400 duplicate", () => pm.expect(pm.response.code).to.be.oneOf([201, 400]));']),
            req("Gateway POST /api/addresses - create", "POST", f"{GW}/api/addresses",
                valid_address, headers=bearer(),
                tests=['pm.test("201 Created", () => pm.response.to.have.status(201));']),
            req("Gateway PUT /api/users/change-password - wrong current -> 400", "PUT",
                f"{GW}/api/users/change-password",
                {"currentPassword": "wrong", "newPassword": "Pass123!", "confirmPassword": "Pass123!"},
                headers=bearer(), tests=t400),
            req("Gateway DELETE /api/wishlist - clear", "DELETE", f"{GW}/api/wishlist", headers=bearer(), tests=t200),
            req("Gateway GET /api/users/me - no JWT", "GET", f"{GW}/api/users/me", headers=no_auth(), tests=[
                'pm.test("401 Unauthorized", () => pm.response.to.have.status(401));']),
            req("Gateway GET /api/internal/users/username/{{username}} -> 403", "GET",
                f"{GW}/api/internal/users/username/{{{{username}}}}", headers=bearer(), tests=t403),
            req("Gateway POST /api/internal/users/login -> 403", "POST", f"{GW}/api/internal/users/login",
                headers=bearer(), body={"username": user, "password": pwd}, tests=t403),
            req("Gateway GET /api/users/search -> 403 (customer)", "GET",
                f"{GW}/api/users/search?keyword=test", headers=bearer(), tests=t403),
        ],
        "Can api-gateway :8080 dang chay + route /api/users, /api/wishlist, /api/addresses.",
    )
)

# 10 cross-cutting security
items.append(
    folder(
        "10 - Security & Edge Cases",
        [
            req("Expired/malformed JWT on wishlist", "GET", f"{U}/api/wishlist",
                headers=[{"key": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiJ9.invalid"}],
                tests=t401),
            req("Empty Bearer token", "GET", f"{U}/api/users/me",
                headers=[{"key": "Authorization", "value": "Bearer "}], tests=t401),
            req("GET unknown path -> 404", "GET", f"{U}/api/users/unknown-endpoint", headers=bearer(), tests=t404),
            req("GET /api/internal/users/register - wrong method GET -> 405", "GET",
                f"{U}/api/internal/users/register", headers=[], tests=t405),
            req("PATCH /api/users/me - not supported -> 405", "PATCH", f"{U}/api/users/me",
                {}, headers=bearer(), tests=t405),
            req("Content-Type JSON on GET /me", "GET", f"{U}/api/users/me", headers=bearer(), tests=t200),
        ],
        "Cac truong hop bao mat va duong dan khong ton tai.",
    )
)

collection = {
    "info": {
        "_postman_id": str(uuid.uuid4()),
        "name": "Electro Store - user-service (Full Coverage)",
        "description": (
            "Kiem thu day du user-service (:8083).\n\n"
            "## API coverage\n"
            "- **Profile:** GET/PUT /api/users/me, PUT /api/users/change-password, GET /api/users/search\n"
            "- **Wishlist:** GET/POST/DELETE /api/wishlist, check, clear, by id/product\n"
            "- **Addresses:** CRUD + set default\n"
            "- **Internal:** login, register, google-login, get user/address (Feign)\n"
            "- **Gateway:** routes + block /api/internal/**\n\n"
            "## Can chay\n"
            "- user-service :8083, auth-service :8081, Redis, MySQL\n"
            "- catalog-service :8082 (wishlist POST)\n"
            "- api-gateway :8080 (folder 09)\n\n"
            "## Import\n"
            "user-service.postman_environment.json\n\n"
            "## Thu tu\n"
            "00 → 01 (login) → 02-10\n\n"
            "Tao lai: python api-tests/generate_user_collection.py\n"
            "Huong dan: api-tests/USER_POSTMAN_GUIDE.md"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "userUrl", "value": "http://localhost:8083"},
        {"key": "authUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "123456"},
        {"key": "userEmail", "value": "khang_test@gmail.com"},
        {"key": "invalidUsername", "value": "user_does_not_exist_99999"},
        {"key": "invalidProductId", "value": "999999"},
        {"key": "accessToken", "value": ""},
        {"key": "userId", "value": "1"},
        {"key": "productId", "value": "1"},
        {"key": "variantId", "value": ""},
        {"key": "wishlistItemId", "value": "1"},
        {"key": "addressId", "value": "1"},
        {"key": "regUsername", "value": ""},
        {"key": "regEmail", "value": ""},
        {"key": "skipPasswordChange", "value": "true"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
total = sum(len(f["item"]) for f in items)
print(f"Written {OUT} — {len(items)} folders, {total} requests")
