# asset/

Chứa model sau khi chạy `train.py`:

- `metadata.json` — map user/product, popular items
- `item_similarity_topk.npz` — ma trận tương đồng item
- `user_item_matrix.npz` — ma trận user–item
- `best_knn_model.pkl` — Surprise KNN (tùy chọn)

Huấn luyện: `python collaborativefiltering/train.py` hoặc `.\scripts\RUN_TRAINING.ps1`
