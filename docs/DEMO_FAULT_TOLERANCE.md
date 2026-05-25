# Demo Fault Tolerance — Trình bày trước giảng viên

**Thông điệp:** Khi **dịch vụ giao hàng (GHN)** lỗi, **order-service** và **cả cửa hàng** vẫn hoạt động — không sập ứng dụng.

## Công nghệ đã triển khai

| Cơ chế | Vị trí | Tác dụng |
|--------|--------|----------|
| **Circuit Breaker** (Resilience4j) | `GhnCircuitBreakerClient` | Sau vài lỗi GHN → OPEN → không gọi GHN nữa |
| **Fallback** | `fetchShippingFeeFallback` | Trả phí ship **30.000đ** cố định |
| **Timeout** | RestTemplate GHN 5s/8s | Không treo thread lâu |
| **Feign Circuit Breaker** | cart/order ↔ catalog/user | Service phụ Feign lỗi → CB, không kéo sập JVM |
| **Eureka + Gateway** | Hạ tầng | Request chỉ tới service còn sống |

---

## Chuẩn bị trước buổi demo (15 phút)

```powershell
cd D:\electro-store-microservices
docker compose up -d          # MySQL, Redis, Jaeger (tùy chọn)
.\START.ps1 -SkipDocker
.\check-all-services.ps1      # Tất cả port OK, đặc biệt order-service :8086
```

Mở sẵn trên trình duyệt:

| Tab | URL |
|-----|-----|
| Cửa hàng | http://localhost:5173/shop |
| Circuit Breaker | http://localhost:8086/actuator/circuitbreakers |
| Eureka | http://localhost:8761 |

Tài khoản test: `khang_test` / `123456` (hoặc theo `.env`).

---

## Kịch bản demo (~7 phút)

### Bước 0 — Giới thiệu (30 giây)

> "GHN là service phụ trợ tính phí ship. Nếu GHN sập, monolith cũ có thể timeout cả checkout. Ở đồ án microservices, order-service dùng **Circuit Breaker + Fallback** — hệ thống chính vẫn bán hàng được."

---

### Bước 1 — Trạng thái BÌNH THƯỜNG (1 phút)

**PowerShell:**

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase normal
```

**Nói với giảng viên:**

- Catalog, Gateway **UP** — khách vẫn xem sản phẩm.
- `ghn-shipping` → **CLOSED** (đường xanh trên actuator).
- Gọi tính phí ship → phí thật từ GHN (không phải 30.000).

**Frontend (tùy chọn):** Mở Shop → thấy sản phẩm.

---

### Bước 2 — Mô phỏng GHN SẬP (1 phút)

Sửa `order-service/src/main/resources/application.yml`:

```yaml
ghn:
  base-url: http://127.0.0.1:59999   # URL sai — GHN không phản hồi
```

**Restart chỉ order-service** (tiết kiệm thời gian):

```powershell
.\STOP.ps1
# Hoặc kill process order-service, rồi chạy lại order trong START.ps1
.\START.ps1 -SkipDocker
```

> "Đây mô phỏng GHN maintenance / mạng lỗi — không cần tắt cả server."

---

### Bước 3 — Kích hoạt Circuit OPEN (2 phút)

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase stress
```

Script gọi `POST /api/shipping/checkout` **5 lần** liên tiếp.

**Quan sát:**

1. **Lần 1–3:** Có thể chậm (~5–8s) vì còn thử GHN.
2. **Sau đó:** `ghn-shipping` → **OPEN** (đỏ trên actuator).
3. **Lần 4–5:** Trả **30000** ngay, **không chờ** timeout GHN.

**Mở:** http://localhost:8086/actuator/circuitbreakers

**Nói:**

> "Circuit Breaker đếm lỗi trong cửa sổ 10 request. Tỷ lệ lỗi > 50% → OPEN 20 giây — ngắt gọi GHN, dùng fallback 30.000đ."

---

### Bước 4 — Chứng minh HỆ THỐNG KHÔNG SẬP (2 phút) — Quan trọng nhất

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase prove-alive
```

| Kiểm tra | Kỳ vọng |
|----------|---------|
| `GET /api/products` qua Gateway | **200** — catalog vẫn bán hàng |
| `GET /actuator/health` order-service | **UP** — order không crash |
| `POST /api/shipping/checkout` | **200**, `shippingFee: 30000` — fallback |
| Eureka | catalog, cart, user vẫn **UP** |

**Frontend:** Refresh **Shop** — sản phẩm vẫn hiện. Vào **Checkout** (đã đăng nhập) — vẫn tính được phí ship fallback (30.000đ).

**Nói:**

> "Service giao hàng (GHN) lỗi, nhưng **service đặt hàng** và **catalog** vẫn sống. Đây là **fault isolation** của microservices + Circuit Breaker."

---

### Bước 5 — Khôi phục (30 giây)

Đổi lại `ghn.base-url: https://online-gateway.ghn.vn`, restart order-service.

Đợi ~20s → Circuit **HALF_OPEN** → **CLOSED** → phí ship lại từ GHN.

---

## Demo phụ (nếu giảng viên hỏi thêm)

### A. Feign — cart gọi catalog

Dừng `catalog-service` → thêm sản phẩm vào giỏ có thể lỗi có kiểm soát (503), **shop list vẫn cache được nếu đã load** — nhấn mạnh CB trên `catalogService` Feign.

### B. So sánh KHÔNG có Circuit Breaker

> "Không CB: mỗi checkout chờ timeout 8s × N user → thread pool cạn, order-service chậm toàn bộ. Có CB: sau vài lỗi, trả fallback < 100ms."

---

## Slide / sơ đồ nói nhanh

```
[Client] → [Gateway] → [order-service] → [GHN API ❌]
                            ↓
                     Circuit OPEN
                            ↓
                     Fallback 30.000đ
                            ↓
                     HTTP 200 (không 500)

[Client] → [Gateway] → [catalog-service] ✅  (độc lập)
```

---

## Checklist ngày thi

- [ ] `order-service` chạy port 8086
- [ ] Actuator circuitbreakers mở được
- [ ] Đã test script `stress` một lần trước buổi
- [ ] Biết chỗ sửa `ghn.base-url` và restart nhanh
- [ ] Tab Eureka + actuator mở sẵn
