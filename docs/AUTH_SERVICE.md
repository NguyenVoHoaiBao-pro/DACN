# auth-service — Tổng quan & API

Port: **8081**  
Swagger: http://localhost:8081/swagger-ui.html  

Gateway: `http://localhost:8080/api/auth/**`

---

## Vai trò

| Việc | Mô tả |
|------|--------|
| Đăng nhập | `POST /api/auth/login` → JWT access token |
| Đăng ký | `POST /api/auth/register` → tạo user qua user-service |
| Refresh | `POST /api/auth/refresh` → token mới (lưu Redis) |
| Logout | `POST /api/auth/logout` → xóa refresh trên Redis |
| Google | `POST /api/auth/google` → `idToken` Google |

**Không** lưu user trong DB — **user-service** (`:8083`) qua Feign.

---

## API public (không cần JWT)

| Method | Path | Response |
|--------|------|----------|
| POST | `/api/auth/login` | 200 + `accessToken`, `refreshToken`, `user` |
| POST | `/api/auth/register` | 201 + tokens |
| POST | `/api/auth/refresh` | 200 + tokens (body: `refreshToken`) |
| POST | `/api/auth/logout` | 200 |
| POST | `/api/auth/google` | 200 + tokens (body: `idToken`) |

### Login body

```json
{
  "username": "khang_test",
  "password": "mat_khau_trong_db"
}
```

`username` có thể là **email** (vd `khang_test@gmail.com`).

### Register body

```json
{
  "username": "user_moi",
  "email": "user@test.com",
  "password": "Pass123!",
  "name": "Ten hien thi"
}
```

---

## Token

| Loại | Định dạng | Lưu trữ | Thời hạn |
|------|-----------|---------|----------|
| Access | JWT | Client | 1 ngày |
| Refresh | UUID | **Redis Cloud** | 7 ngày |

Header API khác: `Authorization: Bearer <accessToken>`

---

## Phụ thuộc

```
Client → auth-service → Feign → user-service (verify / register)
              ↓
         Redis Cloud (refresh token)
```

| Thành phần | Bắt buộc |
|------------|----------|
| user-service :8083 | Có |
| Redis (`.env`) | Có (login/register/refresh) |
| Eureka | Có (Feign) |

---

## Cấu hình `.env`

Xem [ENV_AND_REDIS.md](ENV_AND_REDIS.md).

---

## Test

| Cách | Tài liệu |
|------|----------|
| Postman (12 folder, 45 requests) | [api-tests/AUTH_POSTMAN_GUIDE.md](../api-tests/AUTH_POSTMAN_GUIDE.md) |
| REST Client | [api-tests/01-auth.http](../api-tests/01-auth.http) |
| Redis | `.\scripts\Test-RedisConnection.ps1` |

Tạo lại Postman collection:

```bash
python api-tests/generate_auth_collection.py
```

---

## Gateway

- Login/register/refresh qua `:8080` — folder 07 Postman.
- API protected (`/api/users/**`, …) cần JWT — folder 08.
- `/api/internal/**` **bị chặn** qua gateway (403).
