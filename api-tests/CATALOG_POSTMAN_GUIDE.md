# Postman — catalog-service (Full Coverage)

## Import vào Postman

1. **Collection:** `api-tests/catalog-service.postman_collection.json`  
   (11 folder, **55 requests**)
2. **Environment:** `api-tests/catalog-service.postman_environment.json`
3. Chọn environment **Electro Store - catalog-service (local)**.

## Chuẩn bị stack

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1   # can 10/10
```
| Service | Port | Bắt buộc |
|---------|------|----------|
| catalog-service | 8082 | Có |
| auth-service | 8081 | Folder 01 (JWT cho admin tests) |
| api-gateway | 8080 | Folder 09, internal block |

## Biến environment

| Biến | Mặc định | Ghi chú |  
|------|----------|---------|        
| `catalogUrl` | `http://localhost:8082` | Direct service |
| `authUrl` | `http://localhost:8081` | Login JWT |
| `gatewayUrl` | `http://localhost:8080` | Gateway |
| `username` / `password` | `khang_test` / `123456` | Tài khoản CUSTOMER |
| `productId` | `1` | Sản phẩm seed DB | 
| `categoryId` / `categorySlug` | `1` / `dien-thoai` | Category test |
| `variantId` | `1` | Biến thể sản phẩm |
| `accessToken` | (auto) | Set bởi folder 01 |

## Thứ tự chạy (Collection Runner)

| Folder | Nội dung | Requests |
|--------|----------|----------|
| **00** | OpenAPI, Swagger, Actuator | 3 |
| **01** | Login auth → lưu JWT | 1 |
| **02** | Products public GET (list, search, featured, 404) | 14 |
| **03** | Products admin — CUSTOMER JWT → 403 | 4 |
| **04** | Categories public GET + POST 403 | 9 |
| **05** | Producers | 2 |
| **06** | Admin inventory (direct + gateway JWT) | 6 |
| **07** | Admin suppliers & purchase-orders | 4 |
| **08** | Internal APIs (Feign) + gateway block | 6 |
| **09** | Gateway public catalog | 4 |
| **10** | Edge cases | 2 |

## Lưu ý bảo mật

- **Public GET** trên `:8082` và gateway **không cần JWT** (products, categories, producers).
- **Admin mutations** (`POST/PUT/DELETE /api/products`, categories) cần permission `PRODUCT_MANAGE` → CUSTOMER nhận **403**.
- **`/api/internal/catalog/**`** bị gateway chặn → **403** (đúng). Gọi trực tiếp `:8082`.
- **`/api/products/internal/**`** expose trên `:8082` cho Feign (user/cart/order) — không qua gateway.

## Sinh lại collection

```bash
python api-tests/generate_catalog_collection.py
```

## Smoke test nhanh (PowerShell)

```powershell
.\scripts\Test-Catalog-Service-Full.ps1
```

Chi tiết: [docs/CATALOG_SERVICE.md](../docs/CATALOG_SERVICE.md)
