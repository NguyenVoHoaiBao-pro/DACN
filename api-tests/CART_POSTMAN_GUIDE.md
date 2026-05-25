# Postman — cart-service (Full Coverage)

## Import vào Postman

1. **Collection:** `api-tests/cart-service.postman_collection.json`  
   (10 folder, **31 requests**)
2. **Environment:** `api-tests/cart-service.postman_environment.json`
3. Chọn environment **Electro Store - cart-service (local)**.

## Chuẩn bị stack

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1   # can 10/10
```

| Service | Port | Bắt buộc |
|---------|------|----------|
| cart-service | 8084 | Có |
| auth-service | 8081 | Folder 01 (JWT) |
| catalog-service | 8082 | Lấy `variantId` hợp lệ |
| api-gateway | 8080 | Folder 08 |

## Biến environment

| Biến | Mặc định | Ghi chú |
|------|----------|---------|
| `username` / `password` | `khang_test` / `123456` | Tài khoản seed |
| `variantId` | `115` | Từ `GET /api/products/1/variants` (catalog) |
| `accessToken`, `userId`, `cartItemId` | (auto) | Set bởi test scripts |

## Thứ tự chạy (Collection Runner)

| Folder | Nội dung | Requests |
|--------|----------|----------|
| **00** | OpenAPI, Actuator, Swagger | 3 |
| **01** | Login auth → JWT + userId | 1 |
| **02** | GET `/api/cart` — success, no JWT, invalid JWT | 3 |
| **03** | POST add — success, increment, validation, 404 | 6 |
| **04** | PUT update quantity | 3 |
| **05** | DELETE item | 2 |
| **06** | DELETE clear cart | 3 |
| **07** | Internal `/api/carts/internal/**` | 4 |
| **08** | Gateway cart (JWT bắt buộc) | 4 |
| **09** | Edge cases | 2 |

## Lưu ý bảo mật

- **Mọi `/api/cart/**`** cần JWT (cả direct `:8084` và gateway).
- Gateway **không** coi cart là public — thiếu token → **401**.
- **`/api/carts/internal/**`** khác `/api/internal/**` — gateway **không chặn**, nhưng cart-service vẫn yêu cầu JWT.

## Sinh lại collection

```bash
python api-tests/generate_cart_collection.py
```

## Smoke test nhanh (PowerShell)

```powershell
.\scripts\Test-Cart-Service-Full.ps1
```

Chi tiết: [docs/CART_SERVICE.md](../docs/CART_SERVICE.md)
