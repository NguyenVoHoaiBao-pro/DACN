# Distributed Tracing — Zipkin UI (Micrometer + OpenTelemetry)

Xem timeline request qua giao diện **Zipkin**: Gateway → order-service → cart-service → …

## Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Instrumentation | Spring Boot 3 + Micrometer Tracing (tự động) |
| Bridge | `micrometer-tracing-bridge-otel` |
| Export | `opentelemetry-exporter-zipkin` |
| UI | Zipkin Docker — http://localhost:9411 |
| Liên service | **OpenFeign** (tự truyền Trace ID) |

## Khởi động

```powershell
cd D:\electro-store-microservices

# Zipkin (Docker Desktop)
docker compose up -d zipkin

# Microservices
.\START.ps1 -SkipDocker
```

Mở trình duyệt: **http://localhost:9411**

## Demo trước giảng viên (~3 phút)

### 1. Gửi request test

```powershell
.\scripts\Demo-DistributedTracing.ps1
```

Hoặc thủ công:

```http
GET http://localhost:8080/api/products?page=0&size=5
```

Response header: **`X-Trace-Id`** (từ api-gateway).

### 2. Xem trên Zipkin UI

1. Mở http://localhost:9411  
2. Bấm **Run Query** (hoặc Search)  
3. Chọn service: `api-gateway` hoặc `order-service`  
4. Bấm vào một trace → thấy **timeline** từng span (ms)

### 3. Demo nhiều service (checkout)

Đăng nhập → checkout → trên Zipkin tìm trace `order-service` → thấy span con `cart-service`, `user-service`.

## Cấu hình tập trung (3 bước)

### Bước 1 — Dependencies trong `shared/pom.xml` (một lần)

Các business service import `shared` → tự có:

- `micrometer-tracing-bridge-otel`
- `opentelemetry-exporter-zipkin`
- `feign-micrometer` (Feign truyền Trace ID)
- `TracingConfig` — `RestTemplate` qua `RestTemplateBuilder`

`api-gateway` khai báo tracing riêng (không dùng `shared`).

### Bước 2 — Config chung `config-repo/application.yml`

```yaml
management.tracing.sampling.probability: 1.0
management.zipkin.tracing.endpoint: http://localhost:9411/api/v2/spans
spring.cloud.openfeign.micrometer.enabled: true
logging.pattern.level: "%5p [${spring.application.name:},traceId=%X{traceId:-},spanId=%X{spanId:-}]"
```

### Bước 3 — RestTemplate

- `shared/TracingConfig.java` — bean mặc định (tracing-aware)
- `order-service/GHNConfig` — bean riêng cho GHN (đã dùng `RestTemplateBuilder`)
- Không dùng `new RestTemplate()` (đã sửa `user-service`, `statistics-service`)

## Cấu hình `.env` (tùy chọn)

```env
ZIPKIN_ENDPOINT=http://localhost:9411/api/v2/spans
TRACING_SAMPLING_PROBABILITY=1.0
```

## Log console

Sau khi tích hợp tracing, mỗi dòng log có dạng:

```text
2026-05-24 22:15:30.123 INFO  [order-service,abc123xyz,999fff888] c.e.order.service.OrderService : ...
```

| Phần | Ý nghĩa |
|------|---------|
| `order-service` | Tên microservice |
| `abc123xyz` | **Trace ID** — chung cho cả luồng request |
| `999fff888` | **Span ID** — riêng từng bước trong service đó |

Cấu hình: `config-repo/application.yml` (`logging.pattern.level` + `management.tracing.logging.enabled`).

### Xem log nhanh (PowerShell / Cursor terminal)

Log file khi chạy `START.ps1`: `.run\<service-name>.log`

```powershell
# 15 dong cuoi order-service
.\scripts\Watch-TraceLogs.ps1 -Service order-service

# Tat ca service
.\scripts\Watch-TraceLogs.ps1 -Service all

# Loc theo traceId (tu X-Trace-Id header)
.\scripts\Watch-TraceLogs.ps1 -Service catalog-service -TraceId abc123def456

# Theo doi realtime
Get-Content .\.run\order-service.log -Wait -Tail 10
```

IntelliJ: mở Run configuration từng service → tab **Console** — cùng format nếu chạy trực tiếp từ IDE.

**So sánh traceId:** Gọi API qua Gateway → copy `X-Trace-Id` → tìm cùng ID trên log `api-gateway`, `catalog-service`, `order-service`…

## Troubleshooting

| Vấn đề | Cách xử lý |
|--------|------------|
| Zipkin trống | `docker compose ps` — `electro-zipkin` phải Up; gọi API/Shop trước khi xem |
| Chỉ thấy statistics-service | Job `@Scheduled` 60s — lọc Service Name: `api-gateway` / `order-service` |
| Không có trace Feign | Restart services sau `mvn install shared` |
| 503 Gateway | Đợi Eureka + `.\check-all-services.ps1` |
