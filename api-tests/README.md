# API Tests — Electro Store Microservices

Thư mục test API thủ công / bán tự động. Chạy sau khi cấu hình `.env` và `.\START.ps1 -SkipDocker`.

## Chuẩn bị

1. Copy `.env.example` → `.env`, điền MySQL + **Redis** + `JWT_SECRET`.
2. Kiểm tra Redis:

```powershell
pip install redis
.\scripts\Test-RedisConnection.ps1
```

3. Khởi động:

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

Tài liệu đầy đủ: [docs/ENV_AND_REDIS.md](../docs/ENV_AND_REDIS.md)

---

## Cách 1 — REST Client (Cursor / VS Code)

1. Extension **REST Client**.
2. Mở `01-auth.http` → chạy **Login**.
3. Token lưu vào `http-client.env.json` (`@token`).
4. Các file `02-catalog.http`, `03-user.http`, … dùng `@token`.

Environment: `local-direct` (từng port) hoặc `local-gateway` (`:8080`).

---

## Cách 2 — PowerShell smoke test

```powershell
.\api-tests\Run-ApiTests.ps1
.\api-tests\Run-ApiTests.ps1 -ViaGateway
.\scripts\Test-Each-Service.ps1
```

---

## Postman — auth-service (khuyên dùng cho auth)

| File | Mô tả |
|------|--------|
| `auth-service.postman_collection.json` | 12 folder, ~45 requests |
| `auth-service.postman_environment.json` | Biến URL, user, token |
| **[AUTH_POSTMAN_GUIDE.md](AUTH_POSTMAN_GUIDE.md)** | Hướng dẫn chi tiết |

## Postman — user-service (sau auth)

| File | Mô tả |
|------|--------|
| `user-service.postman_collection.json` | **11 folder, 96 requests** — full coverage |
| `user-service.postman_environment.json` | `userUrl`, `accessToken`, `productId` |
| **[USER_POSTMAN_GUIDE.md](USER_POSTMAN_GUIDE.md)** | Thứ tự folder 00→10 |

```bash
python api-tests/generate_user_collection.py
```

## Postman — catalog-service

| File | Mô tả |
|------|--------|
| `catalog-service.postman_collection.json` | **11 folder, 55 requests** |
| `catalog-service.postman_environment.json` | `catalogUrl`, `productId`, `variantId` |
| **[CATALOG_POSTMAN_GUIDE.md](CATALOG_POSTMAN_GUIDE.md)** | Public GET + admin + internal |

```bash
python api-tests/generate_catalog_collection.py
```

## Postman — cart-service

| File | Mô tả |
|------|--------|
| `cart-service.postman_collection.json` | **10 folder, 31 requests** |
| `cart-service.postman_environment.json` | `cartUrl`, JWT, `variantId` |
| **[CART_POSTMAN_GUIDE.md](CART_POSTMAN_GUIDE.md)** | CRUD giỏ + gateway |

```bash
python api-tests/generate_cart_collection.py
```

## Postman — order-service

| File | Mô tả |
|------|--------|
| `order-service.postman_collection.json` | **13 folder, 47 requests** |
| `order-service.postman_environment.json` | checkout, coupons, shipping |
| **[ORDER_POSTMAN_GUIDE.md](ORDER_POSTMAN_GUIDE.md)** | E2E checkout COD |

```bash
python api-tests/generate_order_collection.py
```

## Postman — review-service

| File | Mô tả |
|------|--------|
| `review-service.postman_collection.json` | **9 folder, 30 requests** |
| `review-service.postman_environment.json` | reviews public + JWT CRUD |
| **[REVIEW_POSTMAN_GUIDE.md](REVIEW_POSTMAN_GUIDE.md)** | |

```bash
python api-tests/generate_review_collection.py
```

## Postman — statistics-service

| File | Mô tả |
|------|--------|
| `statistics-service.postman_collection.json` | **7 folder, 27 requests** |
| `statistics-service.postman_environment.json` | track + recommendations |
| **[STATISTICS_POSTMAN_GUIDE.md](STATISTICS_POSTMAN_GUIDE.md)** | Cần Redis |

```bash
python api-tests/generate_statistics_collection.py
```

---

## Scripts hỗ trợ

| Script | Mô tả |
|--------|--------|
| `scripts/Test-User-Service-Full.ps1` | E2E user-service (16 bước) |
| `scripts/Test-Catalog-Service-Full.ps1` | E2E catalog-service (7 bước) |
| `scripts/Test-Cart-Service-Full.ps1` | E2E cart-service (JWT + CRUD) |
| `scripts/Test-Order-Service-Full.ps1` | Smoke order-service |
| `scripts/Test-Review-Service-Full.ps1` | Smoke review-service |
| `scripts/Test-Statistics-Service-Full.ps1` | Smoke statistics-service |
| `scripts/Test-RedisConnection.ps1` | Test Redis Cloud (PING qua `REDIS_URL`) |
| `scripts/Test-Each-Service.ps1` | Smoke test từng service |
| `check-all-services.ps1` | Health tất cả port |

---

## Cấu trúc file

| File | Nội dung |
|------|----------|
| `http-client.env.json` | URL services + gateway |
| `00-health.http` | Port / OpenAPI |
| `01-auth.http` | Login, register, refresh, logout |
| `02-catalog.http` … `07-statistics.http` | Các service khác |
| `generate_auth_collection.py` | Sinh lại Postman auth JSON |
| `generate_user_collection.py` | Sinh lại Postman user JSON |
| `generate_catalog_collection.py` | Sinh lại Postman catalog JSON |
| `generate_cart_collection.py` | Sinh lại Postman cart JSON |
| `generate_order_collection.py` | Sinh lại Postman order JSON |
| `generate_review_collection.py` | Sinh lại Postman review JSON |
| `generate_statistics_collection.py` | Sinh lại Postman statistics JSON |

---

## Swagger

| Service | URL |
|---------|-----|
| Gateway | http://localhost:8080/swagger-ui.html |
| Auth | http://localhost:8081/swagger-ui.html |

Xem: [docs/SWAGGER_URLS.txt](../docs/SWAGGER_URLS.txt), [docs/TEST_EACH_SERVICE.md](../docs/TEST_EACH_SERVICE.md), [docs/AUTH_SERVICE.md](../docs/AUTH_SERVICE.md)

---

## Tài khoản test

| Cách | Chi tiết |
|------|----------|
| User có sẵn | `khang_test` + password khớp DB (BCrypt) |
| User mới | Postman folder **06** Register — `Pass123!` |

---

## Ghi chú

- **Redis bắt buộc** cho auth login/register (refresh token).
- `REDIS_URL=redis://...` ưu tiên; port cloud.redis.io thường **không TLS** (`redis://` không `rediss://`).
- Order service port **8086**.
- Postman environment **không** thay thế file `.env` của Spring Boot.
