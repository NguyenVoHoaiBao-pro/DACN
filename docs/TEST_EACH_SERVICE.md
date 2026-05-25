# Test riêng từng microservice

## Chuẩn bị

```powershell
# .env: MYSQL_*, REDIS_URL, JWT_SECRET
.\scripts\Test-RedisConnection.ps1
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

---

## Swagger UI

| Service | Port | Swagger |
|---------|------|---------|
| auth-service | 8081 | http://localhost:8081/swagger-ui.html |
| catalog-service | 8082 | http://localhost:8082/swagger-ui/index.html |
| user-service | 8083 | http://localhost:8083/swagger-ui/index.html |
| cart-service | 8084 | http://localhost:8084/swagger-ui/index.html |
| order-service | 8086 | http://localhost:8086/swagger-ui/index.html |
| review-service | 8087 | http://localhost:8087/swagger-ui/index.html |
| statistics-service | 8088 | http://localhost:8088/swagger-ui/index.html |
| **Gateway** | 8080 | http://localhost:8080/swagger-ui.html |

Chọn server **trực tiếp** (port service) khi test Swagger từng service.

---

## JWT

1. `POST http://localhost:8081/api/auth/login`  
   Body: `{ "username": "khang_test", "password": "<mat_khau_dung>" }`
2. Copy `data.accessToken` → **Authorize** → `Bearer <token>`
3. Dùng token cho user/cart/order (và gateway nếu gọi API protected)

Chi tiết auth: [AUTH_SERVICE.md](AUTH_SERVICE.md)

---

## auth-service (8081)

| API | Auth | Ghi chú |
|-----|------|---------|
| `POST /api/auth/login` | Public | JWT + refresh (Redis) |
| `POST /api/auth/register` | Public | 201 |
| `POST /api/auth/refresh` | Public | Body `refreshToken` |
| `POST /api/auth/logout` | Public | Revoke refresh |
| `POST /api/auth/google` | Public | Body `idToken` |
| `GET /actuator/health` | Public | `redis` phải UP |

Postman: [api-tests/AUTH_POSTMAN_GUIDE.md](../api-tests/AUTH_POSTMAN_GUIDE.md)

---

## user-service (8083)

| API | Auth |
|-----|------|
| `POST /api/internal/users/login` | Internal (Feign) |
| `GET/PUT /api/users/me` | JWT |
| `PUT /api/users/change-password` | JWT |
| `GET /api/wishlist`, `POST /api/wishlist` | JWT |
| `GET/POST/PUT/DELETE /api/addresses/**` | JWT |
| `GET /api/users/search` | JWT + quyền staff |

Postman: [api-tests/USER_POSTMAN_GUIDE.md](../api-tests/USER_POSTMAN_GUIDE.md)  
Chi tiết: [USER_SERVICE.md](USER_SERVICE.md)

**Lưu ý:** `/api/internal/**` không expose qua gateway (403).

---

## catalog-service (8082)

| API | Auth |
|-----|------|
| `GET /api/products/**` | Public |
| `GET /api/categories/**` | Public |
| `POST/PUT/DELETE /api/products` | JWT + `PRODUCT_MANAGE` |
| `GET /api/products/internal/**` | Direct :8082 (Feign) |
| `GET /api/internal/catalog/**` | Direct :8082 — gateway **403** |

Postman: [api-tests/CATALOG_POSTMAN_GUIDE.md](../api-tests/CATALOG_POSTMAN_GUIDE.md)  
Chi tiết: [CATALOG_SERVICE.md](CATALOG_SERVICE.md)

**Lấy variantId:** `GET /api/products/1/variants` → ví dụ `115` (cho cart).

---

## cart-service (8084)

| API | Auth |
|-----|------|
| `GET/POST/PUT/DELETE /api/cart/**` | JWT |
| `GET /api/carts/internal/{userId}` | JWT (Feign order) |

Postman: [api-tests/CART_POSTMAN_GUIDE.md](../api-tests/CART_POSTMAN_GUIDE.md)  
Chi tiết: [CART_SERVICE.md](CART_SERVICE.md)

---

## order-service (8086)

| API | Auth |
|-----|------|
| `GET /api/coupons` | Public |
| `GET /api/shipping/**` | Public (GHN proxy) |
| `POST /api/orders` | JWT + `CHECKOUT_PAYMENT` |
| `GET /api/orders` | JWT + `USER_ORDER_HISTORY` |
| `GET /api/admin/orders/**` | Admin |

Postman: [api-tests/ORDER_POSTMAN_GUIDE.md](../api-tests/ORDER_POSTMAN_GUIDE.md)

---

## review-service (8087)

| API | Auth |
|-----|------|
| `GET /api/reviews?product_id=` | Public |
| `GET /api/reviews/summary` | Public (chỉ `is_approved=1`) |
| `POST /api/reviews` | JWT → `is_approved=0` chờ duyệt |
| `GET /api/admin/reviews` | ADMIN → 403 CUSTOMER |

Postman: [api-tests/REVIEW_POSTMAN_GUIDE.md](../api-tests/REVIEW_POSTMAN_GUIDE.md)

---

## statistics-service (8088)

| API | Auth |
|-----|------|
| `POST /api/interactions/track` | Public (:8088), JWT (gateway) |
| `GET /api/recommendations/user/{id}` | Public |
| `GET /api/admin/statistics/**` | JWT + `REPORT_REVENUE` / `REPORT_SALES` / `ROLE_ADMIN` |

**Nghiệp vụ DB (`electro_statistics_db.user_interactions`):** `VIEW`=1.0, `CART`=3.0, `PURCHASE`=5.0; alias `CLICK`→`CART`, `RATING`→`RATED`. VIEW buffer Redis queue, sync MySQL mỗi 60s.

Postman: [api-tests/STATISTICS_POSTMAN_GUIDE.md](../api-tests/STATISTICS_POSTMAN_GUIDE.md) — **7 folder, 29 requests**

Cần Redis (`REDIS_*` trong `.env`).

---

## API Gateway (8080)

| Loại | Ví dụ |
|------|--------|
| Public | `/api/auth/**`, `/api/products/**` |
| Cần JWT | `/api/users/me`, `/api/cart` |
| Chặn | `/api/internal/**` → 403 |

---

## Smoke test

```powershell
.\scripts\Test-User-Service-Full.ps1
.\scripts\Test-Catalog-Service-Full.ps1
.\scripts\Test-Cart-Service-Full.ps1
.\scripts\Test-Order-Service-Full.ps1
.\scripts\Test-Review-Service-Full.ps1
.\scripts\Test-Statistics-Service-Full.ps1
.\scripts\Test-Each-Service.ps1
.\scripts\Test-RedisConnection.ps1
.\scripts\Open-Swagger.ps1 -Service catalog
```
