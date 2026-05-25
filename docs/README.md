# Tài liệu Electro Store Microservices

## Bắt đầu nhanh

| Việc | Tài liệu |
|------|----------|
| Chạy hệ thống | `START.ps1`, `STOP.ps1`, `check-all-services.ps1` (thư mục gốc) |
| Cấu hình `.env`, Redis, MySQL | [ENV_AND_REDIS.md](ENV_AND_REDIS.md) |
| Test auth (Postman) | [../api-tests/AUTH_POSTMAN_GUIDE.md](../api-tests/AUTH_POSTMAN_GUIDE.md) |
| Test user (Postman, sau auth) | [../api-tests/USER_POSTMAN_GUIDE.md](../api-tests/USER_POSTMAN_GUIDE.md) |
| Tổng quan auth-service | [AUTH_SERVICE.md](AUTH_SERVICE.md) |
| Tổng quan user-service | [USER_SERVICE.md](USER_SERVICE.md) |
| Test từng service | [TEST_EACH_SERVICE.md](TEST_EACH_SERVICE.md) |
| URL Swagger | [SWAGGER_URLS.txt](SWAGGER_URLS.txt) |

## Scripts

| Script | Mô tả |
|--------|--------|
| `scripts/Test-RedisConnection.ps1` | Kiểm tra Redis Cloud |
| `scripts/Test-Each-Service.ps1` | Smoke test API |
| `scripts/Open-Swagger.ps1` | Mở Swagger browser |

## api-tests/

[api-tests/README.md](../api-tests/README.md) — REST Client, Postman, file `.http`.
