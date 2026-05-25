# catalog-service — Kiểm thử (sau user-service)

Port **8082**. Phụ thuộc: **MySQL** `electro_catalog_db`.

## Luồng

```
Client → catalog-service :8082 (public GET, không JWT)
Client → gateway :8080 (public catalog routes)
auth-service → Feign → /api/products/internal/** (direct :8082)
cart/order → Feign → /api/internal/catalog/** (direct :8082, gateway chặn)
```

## API chính

| Nhóm | Endpoint | Auth |
|------|----------|------|
| Products | `GET /api/products/**` | Public |
| Categories | `GET /api/categories/**` | Public |
| Producers | `GET /api/producers` | Public |
| Admin products | `POST/PUT/DELETE /api/products/**` | JWT + `PRODUCT_MANAGE` |
| Admin inventory | `/api/admin/inventory/**` | JWT + quyền admin |
| Admin suppliers | `/api/admin/suppliers/**` | JWT + quyền admin |
| Internal products | `/api/products/internal/**` | Direct :8082 (Feign) |
| Internal catalog | `/api/internal/catalog/**` | Direct :8082 (Feign) |

## Bước 1 — Public (không JWT)

```http
GET http://localhost:8082/api/products?page=0&size=10
```

```http
GET http://localhost:8082/api/products/1
GET http://localhost:8082/api/categories?page=0&size=10
GET http://localhost:8082/api/producers
```

## Bước 2 — Gateway

```http
GET http://localhost:8080/api/products?page=0&size=5
```

```http
GET http://localhost:8080/api/internal/catalog/variants/1/cart-info
→ 403 "Internal API is not exposed via gateway"
```

## Bước 3 — Admin (JWT CUSTOMER → 403)

Login qua auth-service, rồi:

```http
POST http://localhost:8082/api/products
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Test", "sku": "PM-001", "basePrice": 100, "productTypeId": 1 }
→ 403 (CUSTOMER không có PRODUCT_MANAGE)
```

## Postman

- Collection: `api-tests/catalog-service.postman_collection.json`
- Environment: `api-tests/catalog-service.postman_environment.json`
- Hướng dẫn: [api-tests/CATALOG_POSTMAN_GUIDE.md](../api-tests/CATALOG_POSTMAN_GUIDE.md)

```bash
python api-tests/generate_catalog_collection.py
```

## Smoke test PowerShell

```powershell
.\scripts\Test-Catalog-Service-Full.ps1
```

## Checklist đã kiểm thử (E2E)

| Bước | API | Kết quả |
|------|-----|---------|
| Products | GET `/api/products` | OK |
| Product detail | GET `/api/products/1` | OK |
| Categories | GET `/api/categories` | OK |
| Producers | GET `/api/producers` | OK |
| Internal | GET `/api/products/internal/1` | OK |
| Gateway | GET `/api/products` | OK |
| Gateway | GET `/api/internal/catalog/**` | 403 |

## Swagger

http://localhost:8082/swagger-ui/index.html

## Lấy variantId cho cart/order

```http
GET http://localhost:8082/api/products/1/variants
```

Ghi `variantId` (ví dụ **115** cho product 1 — không dùng `1` vì ID variant trong DB khác product id).

## Tiếp theo

Sau catalog-service: **cart-service** (`api-tests/04-cart.http`, port **8084**) — cần JWT từ auth.
