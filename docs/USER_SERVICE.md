# user-service — Kiểm thử (sau auth-service)

Port **8083**. Phụ thuộc: **auth-service** (JWT), **MySQL** `electro_user_db`.

## Luồng

```
Client → auth-service (login) → JWT
Client → user-service / gateway + Bearer JWT
auth-service → Feign → user-service /api/internal/** (không qua gateway)
```

## API chính

| Nhóm | Endpoint | Auth |
|------|----------|------|
| Profile | `GET/PUT /api/users/me` | JWT |
| Mật khẩu | `PUT /api/users/change-password` | JWT |
| Tìm user (staff) | `GET /api/users/search` | JWT + `USER_MANAGE` / `CUSTOMER_VIEW` |
| Wishlist | `GET/POST/DELETE /api/wishlist/**` | JWT |
| Địa chỉ | `GET/POST/PUT/DELETE /api/addresses/**` | JWT |
| Internal | `POST /api/internal/users/login`, `register`, … | Không JWT (Feign) |

## Bước 1 — Lấy JWT

```http
POST http://localhost:8081/api/auth/login
Content-Type: application/json

{ "username": "khang_test", "password": "<mat_khau_dung>" }
```

Copy `data.accessToken`.

## Bước 2 — Profile

```http
GET http://localhost:8083/api/users/me
Authorization: Bearer <token>
```

## Bước 3 — Wishlist / Addresses

Xem `api-tests/03-user.http` hoặc Postman folder 03–04.

## Gateway (:8080)

- `GET http://localhost:8080/api/users/me` — cùng JWT.
- `GET http://localhost:8080/api/addresses` — route đã cấu hình.
- `GET http://localhost:8080/api/internal/...` → **403**.

## Postman

- Collection: `api-tests/user-service.postman_collection.json`
- Environment: `api-tests/user-service.postman_environment.json`
- Hướng dẫn: [api-tests/USER_POSTMAN_GUIDE.md](../api-tests/USER_POSTMAN_GUIDE.md)

```bash
python api-tests/generate_user_collection.py
```

## Smoke test PowerShell

```powershell
# Day du (16 buoc) — da verify pass
.\scripts\Test-User-Service-Full.ps1

# Ngan
.\scripts\Test-Each-Service.ps1 -Service user
```

Tài khoản seed: `khang_test` / `123456` (hoặc đặt `TEST_USERNAME`, `TEST_PASSWORD` trong `.env`).

## Checklist da kiem thu (E2E)

| Buoc | API | Ket qua |
|------|-----|---------|
| Login | auth → JWT | OK |
| Internal | Feign login | OK |
| Profile | GET/PUT `/api/users/me` | OK |
| Staff | GET `/api/users/search` | 403 (dung) |
| Wishlist | GET/POST/check | OK |
| Addresses | CRUD + default | OK |
| Gateway | `/users/me`, `/addresses` | OK |
| Gateway | `/api/internal/**` | 403 |
| Security | GET `/me` khong token | 403 |

## Swagger

http://localhost:8083/swagger-ui/index.html

## Lưu ý JWT vs quyền

- JWT claim `roles`: tên role (ví dụ `CUSTOMER`).
- Endpoint staff (`/api/users/search`) vẫn cần **permission** trong DB — JWT thường không đủ → **403** là đúng khi test bằng tài khoản khách.

## Tiếp theo

Sau user-service: **catalog-service** — xem [CATALOG_SERVICE.md](CATALOG_SERVICE.md).  
Tiếp theo catalog: **cart-service** (port 8084).
