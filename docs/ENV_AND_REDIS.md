# Cấu hình môi trường (.env) & Redis local

Tài liệu tập trung cho **biến môi trường** khi chạy local với `START.ps1`.

## File `.env`

| File | Mục đích |
|------|----------|
| `.env.example` | Mẫu — copy thành `.env` |
| `.env` | Cấu hình thật — **đã gitignore, không commit** |

`START.ps1` tự nạp `.env` vào process (in dòng `Da nap bien moi truong tu .env`).

---

## MySQL (Docker local)

Khởi động: `docker compose up -d` (container `electro-mysql`, port `3306`).

| Biến | Mô tả |
|------|--------|
| `MYSQL_HOST` | `localhost` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `root` |
| `MYSQL_PASSWORD` | Để trống (mặc định Docker) |
| `MYSQL_USE_SSL` | `false` |

Import schema sau khi MySQL chạy:

```powershell
.\scripts\Import-Databases.ps1
```

Các service đọc qua `application.yml`: `${MYSQL_HOST}`, `${MYSQL_PORT}`, …

---

## Redis (Docker local)

Khởi động: cùng `docker compose up -d` (container `electro-redis`, port `6379`).

### Vai trò

| Service | Dùng Redis cho |
|---------|----------------|
| **auth-service** | Refresh token (`auth:refresh:{uuid}`), TTL 7 ngày |
| **statistics-service** | Hàng đợi analytics (`analytics:interactions_queue`) |

### Cấu hình khuyên dùng

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_SSL=false
```

**Không** đặt `REDIS_URL` khi dev local — nếu có, auth/statistics sẽ ưu tiên URL đó thay vì host/port.

### Kiểm tra kết nối

```powershell
pip install redis   # lần đầu
.\scripts\Test-RedisConnection.ps1
```

Kỳ vọng: `Ket noi OK KHONG SSL`.

Sau khi sửa `.env`:

```powershell
.\STOP.ps1 -KeepInfra
.\START.ps1 -SkipDocker
```

Health auth: `http://localhost:8081/actuator/health` → `redis.status: UP`.

### Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| `redis: DOWN`, connection refused | Redis chưa chạy | `docker compose up -d` |
| `redis: DOWN`, `NotSslRecordException` | `REDIS_SSL=true` nhưng server plain | `REDIS_SSL=false` |
| Login 503 `Redis unavailable` | Redis chưa kết nối | Chạy `Test-RedisConnection.ps1`, restart |
| Health tổng thể `DOWN` | Chỉ do Redis DOWN | Sửa Redis; các component khác vẫn có thể UP |

---

## JWT

```env
JWT_SECRET=chuoi_bi_mat_dai_it_nhat_32_ky_tu
```

Dùng chung: **auth-service** (ký token), **api-gateway** (validate), **user/cart/order** (validate).

---

## Google OAuth (tùy chọn)

```env
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

API: `POST /api/auth/google` body `{ "idToken": "..." }`.

---

## Postman vs `.env`

| | Postman Environment | `.env` |
|---|---------------------|--------|
| Dùng cho | URL test, user/password Postman | Spring Boot khi `START.ps1` |
| Redis | Không đọc `.env` | auth/statistics đọc `REDIS_*` |

Swagger UI: `http://localhost:8081/swagger-ui/index.html` (auth-service) và các service tương ứng (xem output của `START.ps1`).
