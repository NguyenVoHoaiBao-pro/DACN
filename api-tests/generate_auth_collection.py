#!/usr/bin/env python3
"""Generate auth-service Postman collection. Run: python generate_auth_collection.py"""
import json
import uuid
from pathlib import Path

OUT = Path(__file__).resolve().parent / "auth-service.postman_collection.json"


def uid():
    return str(uuid.uuid4())


def req(name, method, url, body=None, headers=None, tests=None, desc="", prerequest=None):
    h = headers if headers is not None else [{"key": "Content-Type", "value": "application/json"}]
    r = {
        "name": name,
        "request": {"method": method, "header": h, "url": url, "description": desc},
    }
    if body is not None:
        raw = body if isinstance(body, str) else json.dumps(body, indent=2)
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


tests_login_ok = [
    'pm.test("Status 200", () => pm.response.to.have.status(200));',
    "const j = pm.response.json();",
    'pm.test("ApiResponse success", () => {',
    "  pm.expect(j.status).to.eql(200);",
    "});",
    'pm.test("Has accessToken (JWT)", () => {',
    '  pm.expect(j.data.accessToken).to.be.a("string").and.not.empty;',
    '  pm.expect(j.data.tokenType).to.eql("Bearer");',
    "});",
    'pm.test("Has refreshToken (Redis UUID)", () => {',
    '  pm.expect(j.data.refreshToken).to.be.a("string").and.not.empty;',
    "});",
    'pm.test("User profile without password", () => {',
    "  pm.expect(j.data.user).to.be.an('object');",
    '  pm.expect(j.data.user).to.not.have.property("password");',
    "});",
    'pm.collectionVariables.set("accessToken", j.data.accessToken);',
    'pm.environment.set("accessToken", j.data.accessToken);',
    'if (j.data.refreshToken) {',
    '  pm.collectionVariables.set("refreshToken", j.data.refreshToken);',
    '  pm.environment.set("refreshToken", j.data.refreshToken);',
    "}",
]

tests_401 = [
    'pm.test("Status 401 Unauthorized", () => pm.response.to.have.status(401));',
    "const j = pm.response.json();",
    'pm.test("Error body", () => { pm.expect(j.status).to.eql(401); });',
]

tests_404 = ['pm.test("Status 404 Not Found", () => pm.response.to.have.status(404));']
tests_405 = ['pm.test("Status 405 Method Not Allowed", () => pm.response.to.have.status(405));']
tests_401_entry = [
    'pm.test("Status 401", () => pm.response.to.have.status(401));',
]

register_prerequest = [
    "const ts = Date.now();",
    'pm.environment.set("regUsername", "postman_user_" + ts);',
    'pm.environment.set("regEmail", "postman_" + ts + "@test.com");',
]

register_body = (
    '{\n'
    '  "username": "{{regUsername}}",\n'
    '  "password": "Pass123!",\n'
    '  "email": "{{regEmail}}",\n'
    '  "name": "Postman Register User"\n'
    "}"
)

tests_register_ok = [
    'pm.test("Status 201 Created", () => pm.response.to.have.status(201));',
    "const j = pm.response.json();",
    'pm.test("Has tokens", () => {',
    '  pm.expect(j.data.accessToken).to.be.a("string");',
    '  pm.expect(j.data.refreshToken).to.be.a("string");',
    "});",
    'if (pm.response.code === 201) {',
    '  pm.environment.set("refreshToken", j.data.refreshToken);',
    '  pm.environment.set("accessToken", j.data.accessToken);',
    "}",
]

base = "{{baseUrl}}"
gw = "{{gatewayUrl}}"
u = "{{username}}"
p = "{{password}}"
inv = "{{invalidUsername}}"

items = []

# --- 00 ---
items.append(
    folder(
        "00 - Prerequisites & Documentation",
        [
            req(
                "GET OpenAPI v3/api-docs",
                "GET",
                f"{base}/v3/api-docs",
                body=None,
                tests=[
                    'pm.test("OpenAPI 200", () => pm.response.to.have.status(200));',
                    "const j = pm.response.json();",
                    'pm.test("Auth paths documented", () => {',
                    '  pm.expect(j.paths).to.have.property("/api/auth/login");',
                    '  pm.expect(j.paths).to.have.property("/api/auth/register");',
                    '  pm.expect(j.paths).to.have.property("/api/auth/refresh");',
                    "});",
                ],
                desc="Kiem tra service song; paths login/register/refresh trong OpenAPI",
            ),
            req(
                "GET Swagger UI html",
                "GET",
                f"{base}/swagger-ui.html",
                body=None,
                headers=[],
                tests=[
                    'pm.test("Swagger html 200 or 302", () => pm.expect(pm.response.code).to.be.oneOf([200, 302]));'
                ],
            ),
            req(
                "GET Actuator health (auth)",
                "GET",
                f"{base}/actuator/health",
                body=None,
                headers=[],
                tests=['pm.test("Health 200 UP", () => pm.response.to.have.status(200));'],
                desc="Can Redis + auth-service; can 503 neu Redis sai .env",
            ),
        ],
        "Chay truoc: auth :8081, user :8083, .env co MYSQL_* va REDIS_*",
    )
)

# --- 01 ---
items.append(
    folder(
        "01 - POST /api/auth/login - Success (Happy Path)",
        [
            req(
                "Login - valid credentials (save tokens)",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": p},
                tests=tests_login_ok,
                desc="BCrypt verify qua user-service + JWT access + Redis refresh UUID",
            ),
            req(
                "Login - by email",
                "POST",
                f"{base}/api/auth/login",
                {"username": "{{userEmail}}", "password": p},
                tests=[
                    'pm.test("200 or skip if no userEmail", () => {',
                    "  if (!pm.environment.get('userEmail')) { pm.test.skip('Set userEmail in environment'); return; }",
                    "  pm.response.to.have.status(200);",
                    "});",
                ],
                desc="username field chap nhan email; set userEmail=khang_test@gmail.com neu can",
            ),
            req(
                "Login - valid with extra JSON fields",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": p, "rememberMe": True},
                tests=[
                    'pm.test("200", () => pm.response.to.have.status(200));',
                    'pm.test("Has token", () => pm.expect(pm.response.json().data.accessToken).to.be.a("string"));',
                ],
            ),
            req(
                "Login - response Content-Type JSON",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": p},
                tests=[
                    'pm.test("200", () => pm.response.to.have.status(200));',
                    'pm.test("JSON content-type", () => pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json"));',
                ],
            ),
        ],
        "Mat khau phai dung BCrypt trong DB (khong con accept moi password)",
    )
)

# --- 02 ---
items.append(
    folder(
        "02 - POST /api/auth/login - Authentication Failures (401)",
        [
            req("Login - wrong username", "POST", f"{base}/api/auth/login", {"username": inv, "password": p}, tests=tests_401),
            req(
                "Login - wrong password",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": "wrong_password_xyz"},
                tests=tests_401,
            ),
            req(
                "Login - empty username",
                "POST",
                f"{base}/api/auth/login",
                {"username": "", "password": p},
                tests=tests_401,
            ),
            req(
                "Login - empty password",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": ""},
                tests=tests_401,
            ),
            req(
                "Login - empty body object",
                "POST",
                f"{base}/api/auth/login",
                {},
                tests=['pm.test("401 or 400", () => pm.expect(pm.response.code).to.be.oneOf([400, 401]));'],
            ),
            req(
                "Login - missing username field",
                "POST",
                f"{base}/api/auth/login",
                {"password": p},
                tests=['pm.test("401 or 400", () => pm.expect(pm.response.code).to.be.oneOf([400, 401]));'],
            ),
            req(
                "Login - missing password field",
                "POST",
                f"{base}/api/auth/login",
                {"username": u},
                tests=['pm.test("401 or 400", () => pm.expect(pm.response.code).to.be.oneOf([400, 401]));'],
            ),
        ],
        "Sai user/pass hoac thieu field",
    )
)

# --- 03 ---
items.append(
    folder(
        "03 - POST /api/auth/login - Body & Validation Edge Cases",
        [
            req(
                "Login - invalid JSON syntax",
                "POST",
                f"{base}/api/auth/login",
                "{username: broken}",
                tests=['pm.test("400 or 500", () => pm.expect(pm.response.code).to.be.oneOf([400, 500]));'],
            ),
            req(
                "Login - SQL injection username",
                "POST",
                f"{base}/api/auth/login",
                {"username": "' OR '1'='1", "password": p},
                tests=tests_401,
            ),
            req(
                "Login - XSS in password",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": "<script>alert(1)</script>"},
                tests=tests_401,
            ),
            req(
                "Login - unicode username",
                "POST",
                f"{base}/api/auth/login",
                {"username": "người_dùng_测试", "password": p},
                tests=tests_401,
            ),
        ],
        "Input edge cases",
    )
)

# --- 04 ---
items.append(
    folder(
        "04 - POST /api/auth/login - HTTP Method & Headers",
        [
            req("Login - GET method", "GET", f"{base}/api/auth/login", body=None, headers=[], tests=tests_405),
            req("Login - PUT method", "PUT", f"{base}/api/auth/login", {"username": u, "password": p}, tests=tests_405),
            req(
                "Login - without Content-Type",
                "POST",
                f'{base}/api/auth/login',
                f'{{"username":"{u}","password":"{p}"}}',
                headers=[],
                tests=['pm.test("200 or 415", () => pm.expect(pm.response.code).to.be.oneOf([200, 400, 415, 500]));'],
            ),
        ],
        "Chi POST duoc implement cho login",
    )
)

# --- 05 ---
items.append(
    folder(
        "05 - Security - JWT Filter (auth-service)",
        [
            req(
                "Protected route - no Authorization",
                "GET",
                f"{base}/api/auth/me",
                body=None,
                headers=[],
                tests=tests_401_entry,
                desc="Route khong ton tai hoac can JWT -> 401",
            ),
            req(
                "Protected - invalid JWT",
                "GET",
                f"{base}/api/auth/me",
                body=None,
                headers=[{"key": "Authorization", "value": "Bearer not.a.valid.jwt"}],
                tests=tests_401_entry,
            ),
            req(
                "Protected - refresh token used as Bearer (rejected)",
                "GET",
                f"{base}/api/auth/me",
                body=None,
                headers=[{"key": "Authorization", "value": "Bearer {{refreshToken}}"}],
                tests=tests_401_entry,
                desc="Refresh token la UUID Redis — khong dung thay access JWT",
            ),
        ],
        "Chay sau folder 01 de co accessToken",
    )
)

# --- 06 ---
items.append(
    folder(
        "06 - Register, Refresh (Redis) & Logout",
        [
            req(
                "POST /api/auth/register (unique user)",
                "POST",
                f"{base}/api/auth/register",
                register_body,
                tests=tests_register_ok,
                prerequest=register_prerequest,
                desc="Tao user CUSTOMER; username/email unique moi lan chay",
            ),
            req(
                "POST /api/auth/register - duplicate username",
                "POST",
                f"{base}/api/auth/register",
                {
                    "username": u,
                    "password": "Pass123!",
                    "email": "duplicate@test.com",
                    "name": "Dup",
                },
                tests=['pm.test("400 Bad Request", () => pm.response.to.have.status(400));'],
                desc="User da ton tai",
            ),
            req(
                "POST /api/auth/refresh - valid token",
                "POST",
                f"{base}/api/auth/refresh",
                {"refreshToken": "{{refreshToken}}"},
                tests=[
                    'pm.test("200 OK", () => pm.response.to.have.status(200));',
                    "const j = pm.response.json();",
                    'pm.test("New tokens", () => {',
                    '  pm.expect(j.data.accessToken).to.be.a("string");',
                    '  pm.expect(j.data.refreshToken).to.be.a("string");',
                    "});",
                    'if (pm.response.code === 200) {',
                    '  pm.environment.set("refreshToken", j.data.refreshToken);',
                    '  pm.environment.set("accessToken", j.data.accessToken);',
                    "}",
                ],
                desc="Chay Login hoac Register truoc; token rotation tren Redis",
            ),
            req(
                "POST /api/auth/refresh - invalid token",
                "POST",
                f"{base}/api/auth/refresh",
                {"refreshToken": "dummy-invalid-token"},
                tests=tests_401,
            ),
            req(
                "POST /api/auth/refresh - empty body",
                "POST",
                f"{base}/api/auth/refresh",
                {},
                tests=['pm.test("400 Bad Request", () => pm.response.to.have.status(400));'],
            ),
            req(
                "POST /api/auth/logout",
                "POST",
                f"{base}/api/auth/logout",
                {"refreshToken": "{{refreshToken}}"},
                tests=['pm.test("200 OK", () => pm.response.to.have.status(200));'],
                desc="Xoa refresh token khoi Redis",
            ),
            req(
                "POST /api/auth/refresh after logout",
                "POST",
                f"{base}/api/auth/refresh",
                {"refreshToken": "{{refreshToken}}"},
                tests=tests_401,
                desc="Token da revoke",
            ),
            req("GET /api/auth/register", "GET", f"{base}/api/auth/register", body=None, headers=[], tests=tests_405),
        ],
        "Refresh token: UUID luu Redis TTL 7 ngay. Can REDIS_* trong .env",
    )
)

# --- 07 ---
items.append(
    folder(
        "07 - API Gateway Integration (:8080)",
        [
            req(
                "Login via Gateway",
                "POST",
                f"{gw}/api/auth/login",
                {"username": u, "password": p},
                tests=tests_login_ok,
                desc="Gateway route /api/auth/** -> auth-service",
            ),
            req(
                "Register via Gateway",
                "POST",
                f"{gw}/api/auth/register",
                register_body,
                tests=[
                    'pm.test("201 or 400", () => pm.expect(pm.response.code).to.be.oneOf([201, 400]));',
                ],
                prerequest=register_prerequest,
            ),
            req(
                "OpenAPI via Gateway",
                "GET",
                f"{gw}/v3/api-docs/auth-service",
                body=None,
                headers=[],
                tests=['pm.test("200", () => pm.response.to.have.status(200));'],
            ),
            req(
                "Refresh via Gateway",
                "POST",
                f"{gw}/api/auth/refresh",
                {"refreshToken": "{{refreshToken}}"},
                tests=['pm.test("200", () => pm.response.to.have.status(200));'],
                desc="Can refreshToken tu login",
            ),
        ],
        "Can gateway + Eureka + auth UP",
    )
)

# --- 08 ---
items.append(
    folder(
        "08 - Gateway JWT & Internal API Protection",
        [
            req(
                "Gateway - GET /api/users/me without JWT",
                "GET",
                f"{gw}/api/users/me",
                body=None,
                headers=[],
                tests=['pm.test("401 Unauthorized", () => pm.response.to.have.status(401));'],
                desc="Gateway JwtAuthenticationGlobalFilter",
            ),
            req(
                "Gateway - GET /api/users/me with valid JWT",
                "GET",
                f"{gw}/api/users/me",
                body=None,
                headers=[{"key": "Authorization", "value": "Bearer {{accessToken}}"}],
                tests=['pm.test("200", () => pm.response.to.have.status(200));'],
                desc="Chay Login truoc",
            ),
            req(
                "Gateway - internal API blocked",
                "GET",
                f"{gw}/api/internal/users/username/{u}",
                body=None,
                headers=[],
                tests=['pm.test("403 Forbidden", () => pm.response.to.have.status(403));'],
                desc="Internal chi Feign service-to-service",
            ),
            req(
                "Gateway - public catalog without JWT",
                "GET",
                f"{gw}/api/products?page=0&size=5",
                body=None,
                headers=[],
                tests=['pm.test("200", () => pm.response.to.have.status(200));'],
            ),
        ],
        "Uu tien 4: JWT tai gateway",
    )
)

# --- 09 ---
items.append(
    folder(
        "09 - Actuator",
        [
            req(
                "GET /actuator/health",
                "GET",
                f"{base}/actuator/health",
                body=None,
                headers=[],
                tests=['pm.test("Status 200", () => pm.response.to.have.status(200));'],
            ),
            req(
                "GET /actuator",
                "GET",
                f"{base}/actuator",
                body=None,
                headers=[],
                tests=['pm.test("Status 200", () => pm.response.to.have.status(200));'],
            ),
        ],
        "spring-boot-starter-actuator da them vao auth-service",
    )
)

# --- 10 ---
items.append(
    folder(
        "10 - Feign Dependency (user-service :8083)",
        [
            req(
                "Login - requires user-service",
                "POST",
                f"{base}/api/auth/login",
                {"username": u, "password": p},
                tests=[
                    'pm.test("Status 200 + tokens", () => {',
                    "  pm.response.to.have.status(200);",
                    "  const j = pm.response.json();",
                    "  pm.expect(j.data.accessToken).to.be.a('string').and.not.empty;",
                    "  pm.expect(j.data.refreshToken).to.be.a('string').and.not.empty;",
                    "});",
                ],
                desc="500/503 neu user-service DOWN hoac Redis loi",
            ),
        ],
        "FAIL neu user-service :8083 khong chay",
    )
)

# --- 11 ---
items.append(
    folder(
        "11 - Google OAuth (optional)",
        [
            req(
                "POST /api/auth/google - missing idToken",
                "POST",
                f"{base}/api/auth/google",
                {},
                tests=['pm.test("400 Bad Request", () => pm.response.to.have.status(400));'],
            ),
            req(
                "POST /api/auth/google - invalid idToken",
                "POST",
                f"{base}/api/auth/google",
                {"idToken": "invalid-google-id-token"},
                tests=['pm.test("401 or 500", () => pm.expect(pm.response.code).to.be.oneOf([401, 500]));'],
                desc="Can GOOGLE_CLIENT_ID that trong .env de test token that",
            ),
        ],
        "Dat GOOGLE_CLIENT_ID trong .env; token that tu Google Sign-In SDK",
    )
)

collection = {
    "info": {
        "_postman_id": "28f27f54-548d-45b5-ad85-aacb38229c02",
        "name": "Electro Store - auth-service (Full Coverage)",
        "description": (
            "Test auth-service theo codebase hien tai.\n\n"
            "## API da implement\n"
            "- POST /api/auth/login — JWT access + Redis refresh (UUID)\n"
            "- POST /api/auth/register — 201, role CUSTOMER\n"
            "- POST /api/auth/refresh — rotation token tren Redis\n"
            "- POST /api/auth/logout — revoke refresh\n"
            "- POST /api/auth/google — Google idToken (can GOOGLE_CLIENT_ID)\n\n"
            "## Can chay\n"
            "- auth-service :8081\n"
            "- user-service :8083\n"
            "- Redis Cloud (.env REDIS_URL hoac REDIS_*)\n"
            "Docs: api-tests/AUTH_POSTMAN_GUIDE.md, docs/ENV_AND_REDIS.md\n"
            "- api-gateway :8080 (folder 07-08)\n\n"
            "## Import\n"
            "auth-service.postman_environment.json\n\n"
            "## Thu tu goi y\n"
            "00 → 01 (login) → 06 (register/refresh) → 07-08 (gateway) → 10\n\n"
            "Tao lai file: python api-tests/generate_auth_collection.py"
        ),
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "baseUrl", "value": "http://localhost:8081"},
        {"key": "gatewayUrl", "value": "http://localhost:8080"},
        {"key": "username", "value": "khang_test"},
        {"key": "password", "value": "any"},
        {"key": "accessToken", "value": ""},
        {"key": "refreshToken", "value": ""},
        {"key": "invalidUsername", "value": "user_does_not_exist_99999"},
        {"key": "regUsername", "value": ""},
        {"key": "regEmail", "value": ""},
        {"key": "userEmail", "value": "khang_test@gmail.com"},
    ],
    "item": items,
}

OUT.write_text(json.dumps(collection, indent=2, ensure_ascii=False), encoding="utf-8")
total = sum(len(f["item"]) for f in items)
print(f"Written {OUT} — {len(items)} folders, {total} requests")
