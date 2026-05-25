# cart-service — Kiểm thử (sau catalog-service)

Port **8084**. Phụ thuộc: **auth-service** (JWT), **catalog-service** (variantId), **MySQL** `electro_cart_db`.

## Luồng

```
Client → auth-service (login) → JWT
Client → cart-service / gateway + Bearer JWT
order-service → Feign → /api/carts/internal/{userId} (direct :8084 + JWT)
```

## API chính

| Nhóm | Endpoint | Auth |
|------|----------|------|
| Giỏ hàng | `GET /api/cart` | JWT |
| Thêm SP | `POST /api/cart` | JWT |
| Cập nhật SL | `PUT /api/cart/{id}` | JWT |
| Xóa item | `DELETE /api/cart/{id}` | JWT |
| Xóa giỏ | `DELETE /api/cart` | JWT |
| Internal | `GET/DELETE /api/carts/internal/{userId}/**` | JWT (Feign order) |

## Bước 1 — Lấy JWT

```http
POST http://localhost:8081/api/auth/login
Content-Type: application/json

{ "username": "khang_test", "password": "123456" }
```

## Bước 2 — Lấy variantId (catalog)

```http
GET http://localhost:8082/api/products/1/variants
```

## Bước 3 — Cart CRUD

```http
GET http://localhost:8084/api/cart
Authorization: Bearer <token>
```

```http
POST http://localhost:8084/api/cart
Authorization: Bearer <token>
Content-Type: application/json

{ "variantId": 1, "quantity": 1 }
```

## Gateway (:8080)

- `GET http://localhost:8080/api/cart` — cần JWT.
- Thiếu token → **401**.

## Postman

- Collection: `api-tests/cart-service.postman_collection.json`
- Environment: `api-tests/cart-service.postman_environment.json`
- Hướng dẫn: [api-tests/CART_POSTMAN_GUIDE.md](../api-tests/CART_POSTMAN_GUIDE.md)

```bash
python api-tests/generate_cart_collection.py
```

## Smoke test PowerShell

```powershell
.\scripts\Test-Cart-Service-Full.ps1
```

## Swagger

http://localhost:8084/swagger-ui/index.html

## Tiếp theo

Sau cart-service: **order-service** (port **8086**) — `api-tests/05-order.http`.
