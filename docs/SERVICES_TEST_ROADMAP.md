# Lộ trình kiểm thử microservices

Thứ tự khuyên dùng sau khi stack chạy (`.\START.ps1 -SkipDocker`, `check-all-services.ps1` → 10/10).

| # | Service | Port | Trạng thái | Postman | Smoke script |
|---|---------|------|------------|---------|--------------|
| 1 | auth-service | 8081 | ✅ Xong | `auth-service.postman_collection.json` | `Test-Each-Service.ps1` |
| 2 | user-service | 8083 | ✅ Xong | `user-service.postman_collection.json` | `Test-User-Service-Full.ps1` |
| 3 | catalog-service | 8082 | ✅ Xong | `catalog-service.postman_collection.json` | `Test-Catalog-Service-Full.ps1` |
| 4 | cart-service | 8084 | ✅ Sẵn sàng | `cart-service.postman_collection.json` | `Test-Cart-Service-Full.ps1` |
| 5 | order-service | 8086 | ✅ Sẵn sàng | `order-service.postman_collection.json` | `Test-Order-Service-Full.ps1` |
| 6 | review-service | 8087 | ✅ Sẵn sàng | `review-service.postman_collection.json` | `Test-Review-Service-Full.ps1` |
| 7 | statistics-service | 8088 | ✅ Xong | `statistics-service.postman_collection.json` | `Test-Statistics-Service-Full.ps1` |

## Tài liệu chi tiết

- [AUTH_SERVICE.md](AUTH_SERVICE.md)
- [USER_SERVICE.md](USER_SERVICE.md)
- [CATALOG_SERVICE.md](CATALOG_SERVICE.md)
- [CART_SERVICE.md](CART_SERVICE.md)
- [ORDER_POSTMAN_GUIDE.md](../api-tests/ORDER_POSTMAN_GUIDE.md)
- [REVIEW_POSTMAN_GUIDE.md](../api-tests/REVIEW_POSTMAN_GUIDE.md)
- [STATISTICS_POSTMAN_GUIDE.md](../api-tests/STATISTICS_POSTMAN_GUIDE.md)
- [TEST_EACH_SERVICE.md](TEST_EACH_SERVICE.md)

## Pattern Postman (auth / user / catalog / cart)

1. `generate_<service>_collection.py` — sinh JSON
2. `<service>-service.postman_environment.json`
3. `<SERVICE>_POSTMAN_GUIDE.md` trong `api-tests/`
4. `docs/<SERVICE>_SERVICE.md`
5. `scripts/Test-<Service>-Service-Full.ps1`

## Ghi chú gateway

| Path | Gateway (:8080) |
|------|-----------------|
| `/api/products/**`, `/api/categories/**` | Public |
| `/api/cart/**`, `/api/users/**`, `/api/orders/**` | JWT bắt buộc |
| `/api/shipping/**`, `/api/coupons/**`, `/api/public/**` | Public |
| `/api/internal/**` | **403** (chặn qua gateway) |
| `/api/carts/internal/**` | JWT (không thuộc `/api/internal/**`) |

Gọi **trực tiếp** order-service `:8086`, path `/api/orders/internal/**` là public (Feign service-to-service) — xem folder 10 Postman order.

## RBAC (order-service)

JWT từ auth-service chứa `permissions` (không chỉ `roles`). CUSTOMER có `USER_ORDER_HISTORY`, `CHECKOUT_PAYMENT`. Postman order đã cập nhật assertion strict **200** cho các API customer (không còn `200 or 403`).
