# Postman — statistics-service (Full Coverage)

## Import

1. `api-tests/statistics-service.postman_collection.json` — **7 folder, 27 requests**
2. `api-tests/statistics-service.postman_environment.json`

## Chuẩn bị

```powershell
.\scripts\Test-RedisConnection.ps1
.\START.ps1 -SkipDocker
.\check-all-services.ps1
```

| Service | Port |
|---------|------|
| statistics-service | 8088 |
| auth | 8081 |
| gateway | 8080 |

## Thứ tự Collection Runner

| Folder | Nội dung |
|--------|----------|
| **00** | OpenAPI, health (Redis UP) |
| **01** | Login JWT |
| **02** | POST track VIEW/CART/CLICK/PURCHASE/RATING (direct :8088, alias → DB action_type) |
| **03** | GET recommendations |
| **04** | Admin statistics → 403 |
| **05** | Gateway (interactions cần JWT, recommendations public) |
| **06** | Edge cases |

## Lưu ý gateway

| Path | Gateway |
|------|---------|
| `/api/recommendations/**` | Public |
| `/api/interactions/**` | **JWT bắt buộc** |
| `/api/admin/statistics/**` | JWT + permission admin |

```bash
python api-tests/generate_statistics_collection.py
.\scripts\Test-Statistics-Service-Full.ps1
```
