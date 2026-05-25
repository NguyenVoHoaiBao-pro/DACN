# Postman — order-service (Full Coverage)

## Import

1. `api-tests/order-service.postman_collection.json` — **13 folder, 47 requests**
2. `api-tests/order-service.postman_environment.json`

## Chuẩn bị

```powershell
.\START.ps1 -SkipDocker
.\check-all-services.ps1   # 10/10
```

| Service | Port | Vai trò |
|---------|------|---------|
| order-service | 8086 | Test chính |
| auth | 8081 | JWT (roles + **permissions**) |
| user | 8083 | `addressId` |
| cart | 8084 | Checkout từ giỏ (`variantId=115`) |
| gateway | 8080 | Folder 11 |

## RBAC & JWT

Sau login, JWT chứa cả `roles` và `permissions`. User `khang_test` (CUSTOMER) có:

- `USER_ORDER_HISTORY` — xem đơn hàng
- `CHECKOUT_PAYMENT` — checkout / preview coupon / hủy đơn
- `USER_PROFILE_UPDATE`, `USER_WARRANTY_LOOKUP`, ...

**Quan trọng:** Chạy lại **folder 01** (login) nếu token cũ không có claim `permissions`. Folder 01 có test tự động kiểm tra `USER_ORDER_HISTORY` và `CHECKOUT_PAYMENT` trong JWT.

## Thứ tự Collection Runner

| Folder | Nội dung | Kỳ vọng chính |
|--------|----------|---------------|
| **00** | OpenAPI, health | 200 |
| **01** | Login + addresses + add cart | JWT có permissions, cart 200 |
| **02** | Public: coupons, warranty, shipping | 200 (shipping có thể 502) |
| **03** | Orders JWT auth | 401 không JWT, **200** có JWT |
| **04** | Checkout COD E2E | **200** |
| **05** | Order detail & history | 200 / 404 |
| **06** | Preview coupon | 200 / 400 |
| **07** | Cancel order | 200 / 400 / 404 |
| **08** | Payment + IPN smoke | 200 / 400 / 404 |
| **09** | Admin | **403** (CUSTOMER) |
| **10** | Internal APIs (Feign) | **200** (gọi trực tiếp :8086) |
| **11** | Gateway | 200 |
| **12** | Edge cases | 401, 405, 404 |

## Lưu ý

- Checkout E2E: chạy folder **01 → 04** tuần tự (login → cart → checkout).
- Folder **09** vẫn expect **403** với CUSTOMER — admin cần tài khoản có `ORDER_VIEW_ALL` hoặc `ROLE_ADMIN`.
- Folder **10** gọi trực tiếp `:8086` (service-to-service). Qua gateway `:8080`, path `/api/internal/**` bị chặn.
- GHN shipping có thể **502** nếu không cấu hình token GHN.

## Regenerate & smoke test

```powershell
python api-tests/generate_order_collection.py
.\scripts\Test-Order-Service-Full.ps1
```
