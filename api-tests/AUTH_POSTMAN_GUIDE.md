# Hướng dẫn test auth-service bằng Postman

## Import

1. **Collection:** `auth-service.postman_collection.json`
2. **Environment:** `auth-service.postman_environment.json`
3. Chọn environment **Electro Store - auth-service (local)** (góc phải Postman)

> Postman Environment ≠ file `.env` của project.  
> `.env` dùng cho Spring Boot (`REDIS_URL`, `MYSQL_*`).  
> Xem [docs/ENV_AND_REDIS.md](../docs/ENV_AND_REDIS.md).

---

## Điều kiện trước khi chạy

| Thành phần | Port | Ghi chú |
|------------|------|---------|
| auth-service | 8081 | Bắt buộc |
| user-service | 8083 | Feign login/register |
| Redis Cloud | — | `REDIS_URL` hoặc `REDIS_*` trong `.env` |
| api-gateway | 8080 | Folder 07–08 |
| discovery-server | 8761 | Gateway + Feign |

```powershell
# 1. Kiem tra Redis (truoc khi start)
pip install redis
.\scripts\Test-RedisConnection.ps1

# 2. Start stack
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

**Health auth:** `GET http://localhost:8081/actuator/health` → `redis: UP`, tổng thể `UP`.

---

## Cấu trúc collection (12 folder, ~45 requests)

| Folder | Mục đích |
|--------|----------|
| **00** | OpenAPI, Swagger, actuator health |
| **01** | Login OK → lưu `accessToken` + `refreshToken` |
| **02** | Login 401 (sai user/pass) |
| **03** | Edge case body |
| **04** | Sai HTTP method |
| **05** | JWT filter auth-service |
| **06** | Register, refresh Redis, logout, rotation |
| **07** | Login/register/refresh **qua gateway** :8080 |
| **08** | Gateway JWT: 401/403, catalog public |
| **09** | Actuator |
| **10** | Feign user-service (bắt buộc 200) |
| **11** | Google OAuth (optional) |

---

## Thứ tự chạy gợi ý

```
00 → 01 (Login) → 06 (Register / Refresh / Logout) → 07 → 08 → 10
```

Hoặc **Run collection** — token được set tự động sau Login/Register.

---

## Biến Postman Environment

| Biến | Giá trị mặc định | Mô tả |
|------|------------------|--------|
| `baseUrl` | `http://localhost:8081` | Gọi thẳng auth |
| `gatewayUrl` | `http://localhost:8080` | Qua gateway |
| `username` | `khang_test` | Login |
| `password` | `any` | Phải khớp **BCrypt** trong DB |
| `accessToken` | *(trống)* | Tự set sau Login |
| `refreshToken` | *(trống)* | UUID Redis — tự set sau Login/Register |
| `regUsername` / `regEmail` | *(trống)* | Pre-request Register (timestamp) |
| `userEmail` | `khang_test@gmail.com` | Test login bằng email |
| `invalidUsername` | `user_does_not_exist_99999` | Test 401 |

---

## API & kỳ vọng chính

| Request | Status | Ghi chú |
|---------|--------|---------|
| Login đúng | **200** | Có `accessToken` + `refreshToken` (UUID) |
| Login sai | **401** | |
| Register user mới | **201** | Username unique mỗi lần (folder 06) |
| Register trùng | **400** | |
| Refresh hợp lệ | **200** | Token mới (rotation) |
| Refresh dummy | **401** | |
| Refresh sau logout | **401** | |
| Logout | **200** | |
| Gateway `/api/users/me` không JWT | **401** | Folder 08 |
| Gateway `/api/internal/**` | **403** | |

---

## Lưu ý quan trọng

### Mật khẩu (BCrypt)

Password trong environment phải **khớp hash trong DB**.  
Nếu Login 401 với `khang_test` / `any` → dùng **Register** (folder 06) tạo user `Pass123!`.

### Refresh token

- Là **chuỗi UUID** (Redis), **không** phải JWT dài `eyJ...`
- Không dùng refresh token làm `Bearer` cho API business

### Redis / 503

Nếu `Registration failed: Redis unavailable` hoặc health `redis: DOWN`:

1. `.\scripts\Test-RedisConnection.ps1`
2. Sửa `.env` — thường `REDIS_URL=redis://...` (không `rediss://` nếu port plain)
3. `.\STOP.ps1 -KeepInfra` → `.\START.ps1 -SkipDocker`

### User object trong response

`user` là **LoginProfile** — không có `password`, không load full permissions.

---

## Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [docs/AUTH_SERVICE.md](../docs/AUTH_SERVICE.md) | Tổng quan auth-service |
| [docs/ENV_AND_REDIS.md](../docs/ENV_AND_REDIS.md) | `.env`, Redis Cloud |
| [docs/TEST_EACH_SERVICE.md](../docs/TEST_EACH_SERVICE.md) | Test từng service |
| [README.md](README.md) | REST Client, cấu trúc `api-tests/` |

## Tạo lại collection

```bash
python api-tests/generate_auth_collection.py
```
