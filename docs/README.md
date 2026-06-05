# Tài liệu Electro Store Microservices

## Bắt đầu nhanh

| Việc | Tài liệu |
|------|----------|
| Chạy hệ thống | `START.ps1`, `STOP.ps1`, `check-all-services.ps1` (thư mục gốc) |
| Cấu hình `.env`, Redis, MySQL | [ENV_AND_REDIS.md](ENV_AND_REDIS.md) |
| Chatbot / Pinecone | [CHATBOT_PINECONE.md](CHATBOT_PINECONE.md) |
| Reco-service (AI gợi ý) | [../reco-service/README.md](../reco-service/README.md) |

## Scripts vận hành

| Script | Mô tả |
|--------|--------|
| `scripts/Start-Infra.ps1` | Khởi động Docker (MySQL, Redis, …) |
| `scripts/Import-Databases.ps1` | Import schema/dữ liệu MySQL |
| `scripts/Reingest-Chatbot.ps1` | Nạp lại dữ liệu chatbot RAG |
| `scripts/Setup-PineconeHybridIndex.ps1` | Tạo Pinecone index cho chatbot |
