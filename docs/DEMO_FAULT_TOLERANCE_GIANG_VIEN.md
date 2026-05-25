# Demo Fault Tolerance — Kịch bản trình bày (~5 phút)

**Thông điệp:** Service giao hàng (GHN) lỗi → **order-service** và **cửa hàng** vẫn hoạt động.

---

## Chuẩn bị (trước buổi)

```powershell
cd D:\electro-store-microservices
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

Mở sẵn 3 tab trình duyệt:

| Tab | URL |
|-----|-----|
| Cửa hàng | http://localhost:5173/shop |
| Circuit Breaker | http://localhost:8086/actuator/circuitbreakers |
| Eureka | http://localhost:8761 |

PowerShell: `Get-Content .\.run\order-service.log -Wait -Tail 15`

---

## Bước 1 — Bình thường (30 giây)

**Nói:** *"GHN là service phụ tính phí ship. Khi hoạt động bình thường, phí lấy từ API GHN."*

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase normal
```

**Chỉ tay màn hình:**
- `ghn-shipping` = **CLOSED** (xanh)
- `shippingFee` ≠ 30000 (phí GHN thật)
- `GET /api/products` = catalog vẫn OK

---

## Bước 2 — Mô phỏng GHN sập (30 giây)

**Nói:** *"Giả lập GHN maintenance — chỉ service giao hàng lỗi, không tắt cả hệ thống."*

```powershell
.\scripts\Set-GhnDemoMode.ps1 -Mode down
.\STOP.ps1
.\START.ps1 -SkipDocker
```

Đợi order-service lên port 8086 (~30–60s).

---

## Bước 3 — Circuit Breaker OPEN (2 phút)

**Nói:** *"Resilience4j đếm lỗi. Quá ngưỡng → Circuit OPEN → ngắt gọi GHN, dùng fallback."*

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase stress
```

**Quan sát cùng giảng viên:**

| Lần gọi | Hiện tượng |
|---------|------------|
| 1–3 | Chậm (~5–8s) — còn thử GHN |
| Sau đó | Actuator: `ghn-shipping` → **OPEN** (đỏ) |
| 4–5 | **30000đ**, phản hồi **nhanh** |

Refresh tab: http://localhost:8086/actuator/circuitbreakers

---

## Bước 4 — Hệ thống không sập (1 phút)

**Nói:** *"Service phụ lỗi nhưng service đặt hàng và catalog vẫn sống — fault isolation."*

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase prove-alive
```

Refresh **http://localhost:5173/shop** → sản phẩm vẫn hiện.

---

## Bước 5 — Khôi phục (20 giây)

```powershell
.\scripts\Set-GhnDemoMode.ps1 -Mode up
.\STOP.ps1
.\START.ps1 -SkipDocker
```

Circuit về **CLOSED** sau vài request thành công.

---

## Câu giảng viên hay hỏi

| Câu hỏi | Trả lời |
|---------|---------|
| Dùng gì? | Resilience4j Circuit Breaker + fallback 30.000đ |
| Code ở đâu? | `GhnCircuitBreakerClient.java`, `GHNService.java` |
| Fallback bao nhiêu? | 30.000đ — `ghn.fallback-shipping-fee` |
| Khác monolith? | Monolith timeout kéo cả app; microservice cô lập lỗi |

---

## Một lệnh chạy full (có pause)

```powershell
.\scripts\Demo-FaultTolerance.ps1 -Phase all
```
