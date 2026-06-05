# Cấu hình môi trường (.env) & Redis Cloud

Tài liệu tập trung cho **biến môi trường** khi chạy local với `START.ps1`.

## File `.env`

| File | Mục đích |
|------|----------|
| `.env.example` | Mẫu — copy thành `.env` |
| `.env` | Cấu hình thật — **đã gitignore, không commit** |

`START.ps1` tự nạp `.env` vào process (in dòng `Da nap bien moi truong tu .env`).

---

## MySQL (Aiven)

| Biến | Mô tả |
|------|--------|
| `MYSQL_HOST` | Host Aiven |
| `MYSQL_PORT` | Port (vd `28570`) |
| `MYSQL_USER` | `avnadmin` |
| `MYSQL_PASSWORD` | Mật khẩu Aiven |
| `MYSQL_USE_SSL` | `true` |
| `MYSQL_REQUIRE_SSL` | `true` |
| `MYSQL_SSL_MODE` | `REQUIRED` |

Các service đọc qua `application.yml`: `${MYSQL_PASSWORD}`, `${MYSQL_HOST}`, …

---

## Redis Cloud (refresh token + statistics)

### Vai trò

| Service | Dùng Redis cho |
|---------|----------------|
| **auth-service** | Refresh token (`auth:refresh:{uuid}`), TTL 7 ngày |
| **statistics-service** | Hàng đợi analytics (`analytics:interactions_queue`) |

### Cách 1 — `REDIS_URL` (khuyên dùng)

```env
REDIS_URL=redis://default:PASSWORD@HOST.db.redis.io:14085
```

| Scheme | Ý nghĩa |
|--------|---------|
| `redis://` | Không TLS (port public cloud.redis.io thường dùng) |
| `rediss://` | Có TLS |

Khi có `REDIS_URL`, **auth-service** và **statistics-service** dùng `RedisUrlConfiguration` (ưu tiên hơn host/port).

### Cách 2 — Tách biến

```env
REDIS_HOST=xxx.db.redis.io
REDIS_PORT=14085
REDIS_USERNAME=default
REDIS_PASSWORD=...
REDIS_SSL=false
```

Dùng khi **không** đặt `REDIS_URL`.

### Kiểm tra kết nối

```powershell
pip install redis   # lần đầu
.\scripts\Test-RedisConnection.ps1
```

Kỳ vọng: `PING via URL: True` hoặc `Ket noi OK KHONG SSL`.

Sau khi sửa `.env`:

```powershell
.\STOP.ps1 -KeepInfra
.\START.ps1 -SkipDocker
```

Health auth: `http://localhost:8081/actuator/health` → `redis.status: UP`.

### Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|-------------|-------------|------------|
| `redis: DOWN`, `NotSslRecordException` | `REDIS_SSL=true` nhưng server plain | `REDIS_SSL=false` hoặc `redis://` trong URL |
| `WRONG_VERSION_NUMBER` (script Python) | Giống trên | Dùng `redis://` không phải `rediss://` |
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
