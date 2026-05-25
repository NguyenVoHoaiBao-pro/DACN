# Postman — user-service (Full Coverage)

## Import vào Postman

1. **Collection:** `api-tests/user-service.postman_collection.json`  
   (11 folder, **96 requests** — full coverage)
2. **Environment:** `api-tests/user-service.postman_environment.json`
3. Chọn environment **Electro Store - user-service (local)** ở góc phải Postman.

## Chuẩn bị stack

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1   # can 10/10
```

| Service | Port | Bắt buộc |
|---------|------|----------|
| user-service | 8083 | Có |
| auth-service | 8081 | Folder 01 (JWT) |
| catalog-service | 8082 | Folder 06 (wishlist POST) |
| api-gateway | 8080 | Folder 09 |

## Biến environment

| Biến | Mặc định | Ghi chú |
|------|----------|---------|
| `username` / `password` | `khang_test` / `123456` | Tài khoản seed DB |
| `userEmail` | `khang_test@gmail.com` | Test login internal bằng email |
| `productId` | `1` | Sản phẩm trong catalog |
| `invalidProductId` | `999999` | Test 404 wishlist |
| `skipPasswordChange` | `true` | Đặt `false` nếu muốn chạy test đổi mật khẩu (folder 04) |
| `accessToken`, `userId`, `addressId`, `wishlistItemId` | (auto) | Set bởi test scripts |

## Thứ tự chạy (Collection Runner)

| Folder | Nội dung | Requests |
|--------|----------|----------|
| **00** | OpenAPI (16 paths), Swagger, Actuator | 4 |
| **01** | Login auth → lưu JWT + userId | 2 |
| **02** | GET `/api/users/me` — success, no token, invalid JWT, 405 | 7 |
| **03** | PUT `/api/users/me` — update, partial, empty body | 5 |
| **04** | PUT `/change-password` — wrong, mismatch, short, optional success | 6 |
| **05** | GET `/search` — CUSTOMER 403, missing keyword 400 | 4 |
| **06** | Wishlist — CRUD, duplicate 400, invalid product 404, clear | 15 |
| **07** | Addresses — CRUD, validation 400, default, 404 | 13 |
| **08** | Internal — login, register, google, get user/address | 16 |
| **09** | Gateway — users, wishlist, addresses, change-password, block internal | 12 |
| **10** | Security — malformed JWT, unknown path 404, wrong method | 6 |

**Tổng: 96 requests** — cover toàn bộ endpoint trong codebase user-service.

## Coverage map (endpoint → folder)

| Endpoint | Folder |
|----------|--------|
| `GET/PUT /api/users/me` | 02, 03, 09 |
| `PUT /api/users/change-password` | 04 |
| `GET /api/users/search` | 05, 09 |
| `GET/POST/DELETE /api/wishlist` | 06, 09 |
| `DELETE /api/wishlist/product/{id}` | 06 |
| `DELETE /api/wishlist/{id}` | 06 |
| `GET /api/wishlist/check/{id}` | 06 |
| `GET/POST/PUT/DELETE /api/addresses` | 07, 09 |
| `PUT /api/addresses/{id}/default` | 07 |
| `POST /api/internal/users/login` | 08 |
| `POST /api/internal/users/register` | 08 |
| `POST /api/internal/users/google-login` | 08 |
| `GET /api/internal/users/{userId}` | 08 |
| `GET /api/internal/users/username/{username}` | 08 |
| `GET /api/internal/users/addresses/{addressId}` | 08 |

## Sinh lại collection

```bash
python api-tests/generate_user_collection.py
```

## Smoke test nhanh (PowerShell)

```powershell
.\scripts\Test-User-Service-Full.ps1
```

## Tài liệu

- [docs/USER_SERVICE.md](../docs/USER_SERVICE.md)
- [AUTH_POSTMAN_GUIDE.md](AUTH_POSTMAN_GUIDE.md) — auth trước user
