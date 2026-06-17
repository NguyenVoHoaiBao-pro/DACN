# asset/

Chứa model sau khi chạy `train.py`:

| File | Mô tả |
|------|--------|
| `svd_model.pkl` | Model Surprise SVD (vector ẩn user/item) |
| `user_encoder.joblib` | LabelEncoder: user_id → chỉ số nội bộ |
| `item_encoder.joblib` | LabelEncoder: product_id → chỉ số nội bộ |
| `user_item_matrix.npz` | Ma trận User-Item thưa (sparse) |
| `metadata.json` | Stats, RMSE/MAE, popular products, offline user products |

Huấn luyện: `python collaborativefiltering/train.py` hoặc `.\scripts\RUN_TRAINING.ps1`
