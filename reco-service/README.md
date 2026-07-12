# reco-service — Gợi ý sản phẩm (Item-based CF)

Microservice Python/FastAPI, đăng ký Eureka `reco-service`, cổng **5003**.

## Cấu trúc thư mục

```text
reco-service/
├── app.py                      # FastAPI + Eureka
├── config/                     # settings.py, database.py
├── collaborativefiltering/     # Lõi thuật toán (một package duy nhất)
│   ├── asset/                  # Model sau train (*.npz, metadata.json)
│   ├── train.py                # Huấn luyện offline
│   ├── recommend.py            # Gợi ý online
│   └── data_sources.py         # Query review + order
├── scripts/
│   ├── SETUP_ENV.ps1
│   ├── RUN_TRAINING.ps1
│   └── START_SERVER.ps1
└── requirements.txt
```

## Chạy nhanh

```powershell
cd reco-service
.\scripts\SETUP_ENV.ps1          # lần đầu
.\scripts\RUN_TRAINING.ps1       # train → collaborativefiltering/asset/
.\scripts\START_SERVER.ps1       # hoặc từ repo gốc: .\START.ps1 -SkipDocker
```

```bash
uvicorn app:app --host 0.0.0.0 --port 5003
```

## API chính

| Method | URL |
|--------|-----|
| GET | `/api/recommend?user_id=1&top_n=10` |
| GET | `/health` |
| POST | `/api/retrain` |
| GET | `/docs` |

Gateway: `http://localhost:8080/api/recommend/...`
