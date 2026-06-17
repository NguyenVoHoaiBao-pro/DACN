# reco-service — Gợi ý sản phẩm (SVD Collaborative Filtering)

Microservice Python/FastAPI, đăng ký Eureka `reco-service`, cổng **5003**.

Thuật toán: **SVD (Singular Value Decomposition)** — học vector ẩn user/item từ ma trận User-Item, predict rating và xếp hạng sản phẩm.

Cold-start (user mới / item mới) → fallback **sản phẩm bán chạy** từ review-service.

## Cấu trúc thư mục

```text
reco-service/
├── app.py                      # FastAPI + Eureka
├── config/settings.py          # SVD hyperparameters
├── collaborativefiltering/
│   ├── asset/                  # Model sau train
│   │   ├── svd_model.pkl
│   │   ├── user_encoder.joblib
│   │   ├── item_encoder.joblib
│   │   ├── user_item_matrix.npz
│   │   └── metadata.json
│   ├── train.py                # Huấn luyện offline (SVD)
│   ├── recommend.py            # Gợi ý online (predict)
│   ├── data_sources.py         # API review + order
│   └── service_client.py       # HTTP client Eureka
├── docs/DATA_FLOW.md           # Sơ đồ luồng dữ liệu
└── scripts/
    ├── SETUP_ENV.ps1
    ├── RUN_TRAINING.ps1
    └── START_SERVER.ps1
```

## Chạy nhanh

```powershell
cd reco-service
.\scripts\SETUP_ENV.ps1
.\scripts\RUN_TRAINING.ps1
.\scripts\START_SERVER.ps1
```

## API chính

| Method | URL |
|--------|-----|
| GET | `/api/recommend?user_id=1&top_n=10` |
| GET | `/health` |
| POST | `/api/retrain` |
| GET | `/docs` |

Gateway: `http://localhost:8080/api/recommend/...`

## Biến môi trường SVD

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `SVD_N_FACTORS` | 50 | Số chiều vector ẩn |
| `SVD_N_EPOCHS` | 20 | Số vòng lặp huấn luyện |
| `SVD_LR_ALL` | 0.005 | Learning rate |
| `SVD_REG_ALL` | 0.02 | Regularization |
| `RECO_FAKE_PURCHASE_RATING` | 3.5 | Rating implicit cho đơn mua chưa review |
