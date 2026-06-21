"""
train.py — Huấn luyện SVD Collaborative Filtering (đặc trưng ẩn).

Lấy dữ liệu từ microservice qua REST API, xây ma trận User-Item,
huấn luyện Surprise SVD, lưu artifact vào collaborativefiltering/asset/.

Chạy:
  python collaborativefiltering/train.py
  hoặc: .\\scripts\\RUN_TRAINING.ps1
"""

import os
import time
import json
import logging

import numpy as np
import pandas as pd
import joblib
from scipy.sparse import coo_matrix, save_npz
from sklearn.preprocessing import LabelEncoder
from surprise import Dataset, Reader, SVD, accuracy
from surprise.model_selection import train_test_split

from config.settings import (
    FAKE_PURCHASE_RATING,
    MIN_TRAIN_INTERACTIONS,
    MODEL_DIR,
    SVD_N_EPOCHS,
    SVD_N_FACTORS,
    SVD_LR_ALL,
    SVD_REG_ALL,
    SVD_TEST_SIZE,
    SYNTHETIC_AUGMENT_ENABLED,
    SYNTHETIC_MIN_PER_USER,
    SYNTHETIC_TARGET_INTERACTIONS,
)
from collaborativefiltering.service_client import (
    fetch_all_ratings_via_api,
    fetch_all_purchased_products_via_api,
    fetch_popular_products_via_api,
    fetch_products_for_reco_via_api,
)
from collaborativefiltering.synthetic_data import (
    build_synthetic_catalog_products,
    generate_dense_synthetic_ratings,
    popular_from_interactions,
)
from contentbased.content_model import content_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

MIN_USER_INTERACTIONS = 2
MAX_USER_INTERACTIONS = 500
MIN_PRODUCT_INTERACTIONS = 2
HOT_ITEMS_LIMIT = 50


def _resolve_product_pool(catalog_products: list | None = None) -> list[int]:
    products = catalog_products if catalog_products is not None else fetch_products_for_reco_via_api()
    pool = [int(p["id"]) for p in products if p.get("id") is not None]
    if pool:
        logger.info("   Product pool cho synthetic: %d SP tu catalog.", len(pool))
        return pool
    logger.warning("   Khong lay duoc catalog — synthetic dung product_id 1..80.")
    return list(range(1, 81))


def _resolve_user_pool(df_reviews, df_purchases, df_clean=None) -> list[int]:
    users = []
    for frame in (df_reviews, df_purchases):
        if frame is not None and len(frame) > 0 and "user_id" in frame.columns:
            users.extend(int(u) for u in frame["user_id"].unique())
    if df_clean is not None and len(df_clean) > 0:
        users.extend(int(u) for u in df_clean["user_id"].unique())
    if not users:
        return list(range(1, 51))
    return list(dict.fromkeys(users))


def _augment_with_synthetic(df_clean, product_pool, user_pool, reason: str):
    """Gop du lieu that + synthetic de train du de hon."""
    logger.warning("Bo sung synthetic ratings (%s)...", reason)
    df_synth = generate_dense_synthetic_ratings(
        product_ids=product_pool,
        user_ids=user_pool,
        target_interactions=SYNTHETIC_TARGET_INTERACTIONS,
        min_per_user=SYNTHETIC_MIN_PER_USER,
    )
    if df_clean is None or len(df_clean) == 0:
        combined = df_synth
    else:
        combined = pd.concat([df_clean, df_synth], ignore_index=True)
        combined = combined.groupby(["user_id", "product_id"], as_index=False)["rating"].max()

    combined = build_clean_dataframe(
        combined,
        pd.DataFrame(columns=["user_id", "product_id", "rating"]),
    )
    logger.info(
        "   Sau augment: %d tuong tac | %d users | %d products",
        len(combined),
        combined["user_id"].nunique() if len(combined) else 0,
        combined["product_id"].nunique() if len(combined) else 0,
    )
    return combined


def _get_mock_fallback_data(product_pool=None):
    """Sinh du lieu day tu product pool (uu tien ID catalog that)."""
    logger.warning("Chuyen sang Synthetic Data Fallback...")
    pool = product_pool or _resolve_product_pool()
    df_clean = generate_dense_synthetic_ratings(
        product_ids=pool,
        user_ids=list(range(1, 51)),
        target_interactions=SYNTHETIC_TARGET_INTERACTIONS,
        min_per_user=SYNTHETIC_MIN_PER_USER,
    )
    df_clean = build_clean_dataframe(
        df_clean,
        pd.DataFrame(columns=["user_id", "product_id", "rating"]),
    )
    hot_items = popular_from_interactions(df_clean, top_n=HOT_ITEMS_LIMIT) or pool[:HOT_ITEMS_LIMIT]
    logger.info(
        "   Synthetic fallback: %d tuong tac | %d users | %d products",
        len(df_clean),
        df_clean["user_id"].nunique(),
        df_clean["product_id"].nunique(),
    )
    return df_clean, hot_items


def fetch_training_ratings():
    """Đọc ratings thật + mua chưa review từ review-service và order-service API."""
    logger.info("Đọc dữ liệu train từ review-service và order-service API...")

    ratings_data = fetch_all_ratings_via_api()
    if ratings_data:
        df_reviews = pd.DataFrame(ratings_data)
        df_reviews.rename(columns={"userId": "user_id", "productId": "product_id"}, inplace=True)
        df_reviews["rating"] = df_reviews["rating"].astype(float)
    else:
        df_reviews = pd.DataFrame(columns=["user_id", "product_id", "rating"])
    logger.info("   [Reviews API] %d bản ghi đã duyệt.", len(df_reviews))

    purchases_data = fetch_all_purchased_products_via_api()
    if purchases_data:
        df_purchases = pd.DataFrame(purchases_data)
        df_purchases.rename(columns={"userId": "user_id", "productId": "product_id"}, inplace=True)
        df_purchases["rating"] = FAKE_PURCHASE_RATING
    else:
        df_purchases = pd.DataFrame(columns=["user_id", "product_id", "rating"])

    if len(df_reviews) > 0 and len(df_purchases) > 0:
        reviewed_pairs = set(zip(df_reviews["user_id"], df_reviews["product_id"]))
        mask = df_purchases.apply(
            lambda r: (r["user_id"], r["product_id"]) not in reviewed_pairs, axis=1
        )
        df_purchases = df_purchases[mask]

    logger.info("   [Purchases API] %d cặp user-product chưa review.", len(df_purchases))
    return df_reviews, df_purchases


def build_clean_dataframe(df_reviews, df_purchases):
    """Hợp nhất reviews + purchases; ưu tiên rating thật cao hơn."""
    df_all = pd.concat([df_reviews, df_purchases], ignore_index=True)
    df_merged = df_all.groupby(["user_id", "product_id"], as_index=False)["rating"].max()

    logger.info("Bắt đầu làm sạch & lọc nhiễu...")

    user_counts = df_merged["user_id"].value_counts()
    valid_users = user_counts[
        (user_counts >= MIN_USER_INTERACTIONS) & (user_counts <= MAX_USER_INTERACTIONS)
    ].index
    df_filtered = df_merged[df_merged["user_id"].isin(valid_users)]

    product_counts = df_filtered["product_id"].value_counts()
    df_filtered = df_filtered[
        df_filtered["product_id"].isin(product_counts[product_counts >= MIN_PRODUCT_INTERACTIONS].index)
    ]

    logger.info(
        "   Bộ dữ liệu sạch: %d tương tác | %d users | %d products",
        len(df_filtered),
        df_filtered["user_id"].nunique(),
        df_filtered["product_id"].nunique(),
    )
    return df_filtered


def extract_popular_products(top_n=HOT_ITEMS_LIMIT):
    """Sản phẩm bán chạy / phổ biến từ review-service API."""
    try:
        hot_list = fetch_popular_products_via_api(limit=top_n)
        logger.info("Trích xuất %d sản phẩm bán chạy từ API.", len(hot_list))
        return hot_list
    except Exception as exc:
        logger.error("Lỗi trích xuất popular products: %s", exc)
        return []


def _encode_ids(df_clean):
    """Mã hóa user_id / product_id thành chỉ số liên tục cho Surprise."""
    df = df_clean.copy()
    df["user_id"] = df["user_id"].astype(str)
    df["product_id"] = df["product_id"].astype(str)

    user_encoder = LabelEncoder()
    item_encoder = LabelEncoder()
    df["u_enc"] = user_encoder.fit_transform(df["user_id"])
    df["i_enc"] = item_encoder.fit_transform(df["product_id"])

    logger.info("   Encoded %d users, %d products.", len(user_encoder.classes_), len(item_encoder.classes_))
    return df, user_encoder, item_encoder


def _build_user_item_matrix(df, user_encoder, item_encoder):
    """Xây ma trận User-Item thưa (sparse) từ dữ liệu đã mã hóa."""
    logger.info("Xây dựng ma trận User-Item (sparse)...")

    matrix = coo_matrix(
        (df["rating"], (df["u_enc"], df["i_enc"])),
        shape=(len(user_encoder.classes_), len(item_encoder.classes_)),
    ).tocsr()

    total_cells = matrix.shape[0] * matrix.shape[1]
    sparsity = 1.0 - (matrix.nnz / total_cells) if total_cells > 0 else 1.0
    logger.info(
        "   Ma trận %dx%d, %d ratings, sparsity=%.2f%%",
        matrix.shape[0],
        matrix.shape[1],
        matrix.nnz,
        sparsity * 100,
    )
    return matrix, sparsity


def _train_svd_model(df):
    """Huấn luyện SVD — học vector ẩn user/item qua ma trận rating."""
    logger.info(
        "Huấn luyện SVD (n_factors=%d, n_epochs=%d)...",
        SVD_N_FACTORS,
        SVD_N_EPOCHS,
    )

    reader = Reader(rating_scale=(1.0, 5.0))
    data = Dataset.load_from_df(df[["u_enc", "i_enc", "rating"]], reader)

    trainset_eval, testset = train_test_split(data, test_size=SVD_TEST_SIZE, random_state=42)
    eval_model = SVD(
        n_factors=SVD_N_FACTORS,
        n_epochs=SVD_N_EPOCHS,
        lr_all=SVD_LR_ALL,
        reg_all=SVD_REG_ALL,
        random_state=42,
    )
    eval_model.fit(trainset_eval)
    predictions = eval_model.test(testset)
    rmse = accuracy.rmse(predictions, verbose=False)
    mae = accuracy.mae(predictions, verbose=False)
    logger.info("   Đánh giá hold-out: RMSE=%.4f, MAE=%.4f", rmse, mae)

    trainset = data.build_full_trainset()
    model = SVD(
        n_factors=SVD_N_FACTORS,
        n_epochs=SVD_N_EPOCHS,
        lr_all=SVD_LR_ALL,
        reg_all=SVD_REG_ALL,
        random_state=42,
    )
    model.fit(trainset)
    logger.info("   SVD fit toàn bộ trainset thành công.")

    return model, trainset, rmse, mae


def _build_offline_user_products(df_clean):
    """Map user_id -> danh sách product_id đã tương tác (lọc khi inference)."""
    offline = {}
    for uid, grp in df_clean.groupby("user_id"):
        offline[str(int(uid))] = [int(row["product_id"]) for _, row in grp.iterrows()]
    return offline


def _serialize_artifacts(
    model,
    trainset,
    user_encoder,
    item_encoder,
    matrix,
    sparsity,
    rmse,
    mae,
    popular_items,
    df_clean,
    use_fallback,
    use_synthetic=False,
):
    """Lưu model SVD, encoders, ma trận User-Item và metadata."""
    logger.info("Serialize model artifacts...")

    joblib.dump(model, os.path.join(MODEL_DIR, "svd_model.pkl"))
    joblib.dump(user_encoder, os.path.join(MODEL_DIR, "user_encoder.joblib"))
    joblib.dump(item_encoder, os.path.join(MODEL_DIR, "item_encoder.joblib"))
    logger.info("   - svd_model.pkl, user_encoder.joblib, item_encoder.joblib")

    matrix_path = os.path.join(MODEL_DIR, "user_item_matrix.npz")
    save_npz(matrix_path, matrix)
    logger.info("   - user_item_matrix.npz (%.1f KB)", os.path.getsize(matrix_path) / 1024)

    product_ids = [str(pid) for pid in item_encoder.classes_]
    if use_fallback:
        data_source = "synthetic-fallback"
    elif use_synthetic:
        data_source = "microservices-api+synthetic"
    else:
        data_source = "microservices-api"

    metadata = {
        "version": "6.0.0-hybrid",
        "model_type": "hybrid_svd_tfidf",
        "data_source": data_source,
        "trained_at": time.time(),
        "stats": {
            "users": trainset.n_users,
            "products": trainset.n_items,
            "interactions": trainset.n_ratings,
            "sparsity_pct": round(sparsity * 100, 2),
        },
        "svd_config": {
            "n_factors": SVD_N_FACTORS,
            "n_epochs": SVD_N_EPOCHS,
            "lr_all": SVD_LR_ALL,
            "reg_all": SVD_REG_ALL,
        },
        "performance": {
            "rmse": round(float(rmse), 4),
            "mae": round(float(mae), 4),
        },
        "popular_products": popular_items,
        "best_sellers": popular_items,
        "trained_product_ids": product_ids,
        "offline_user_products": _build_offline_user_products(df_clean),
    }

    metadata_path = os.path.join(MODEL_DIR, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=4, ensure_ascii=False)
    logger.info("   - metadata.json (%.1f KB)", os.path.getsize(metadata_path) / 1024)


def _cleanup_legacy_artifacts():
    """Xóa artifact Item-CF cũ nếu còn tồn tại."""
    legacy = ["item_similarity_topk.npz", "best_knn_model.pkl"]
    for name in legacy:
        path = os.path.join(MODEL_DIR, name)
        if os.path.exists(path):
            os.remove(path)
            logger.info("   Đã xóa artifact cũ: %s", name)


def main():
    """Pipeline huấn luyện SVD Collaborative Filtering."""
    t_start = time.time()
    logger.info("=" * 70)
    logger.info("BẮT ĐẦU HUẤN LUYỆN HYBRID (SVD + TF-IDF via Microservices API)")
    logger.info("=" * 70)

    os.makedirs(MODEL_DIR, exist_ok=True)
    use_fallback = False
    use_synthetic = False
    popular_items = []
    catalog_products = fetch_products_for_reco_via_api()
    product_pool = _resolve_product_pool(catalog_products)

    try:
        df_reviews, df_purchases = fetch_training_ratings()
        if len(df_reviews) == 0 and len(df_purchases) == 0:
            logger.warning("Khong co du lieu review/order tu API — dung synthetic fallback.")
            use_fallback = True
        else:
            df_clean = build_clean_dataframe(df_reviews, df_purchases)
            popular_items = extract_popular_products(top_n=HOT_ITEMS_LIMIT)
            if len(df_clean) == 0:
                logger.warning(
                    "Sau loc khong con du lieu (can user/product >= %d tuong tac).",
                    MIN_USER_INTERACTIONS,
                )
                use_fallback = True
            elif SYNTHETIC_AUGMENT_ENABLED and len(df_clean) < MIN_TRAIN_INTERACTIONS:
                user_pool = _resolve_user_pool(df_reviews, df_purchases, df_clean)
                df_clean = _augment_with_synthetic(
                    df_clean,
                    product_pool,
                    user_pool,
                    reason="du lieu that con %d ban ghi" % len(df_clean),
                )
                use_synthetic = True
                if not popular_items:
                    popular_items = popular_from_interactions(df_clean, top_n=HOT_ITEMS_LIMIT)
    except Exception as api_err:
        logger.error("Loi goi API microservices: %s", api_err)
        use_fallback = True

    if use_fallback:
        df_clean, popular_items = _get_mock_fallback_data(product_pool)
        use_synthetic = True

    df_encoded, user_encoder, item_encoder = _encode_ids(df_clean)
    matrix, sparsity = _build_user_item_matrix(df_encoded, user_encoder, item_encoder)
    model, trainset, rmse, mae = _train_svd_model(df_encoded)

    _serialize_artifacts(
        model,
        trainset,
        user_encoder,
        item_encoder,
        matrix,
        sparsity,
        rmse,
        mae,
        popular_items,
        df_clean,
        use_fallback,
        use_synthetic,
    )
    _cleanup_legacy_artifacts()
    _train_content_model(catalog_products, product_pool, use_fallback or use_synthetic)

    logger.info("=" * 70)
    logger.info("HUẤN LUYỆN HYBRID (SVD + TF-IDF) HOÀN THÀNH TRONG %.2fs!", time.time() - t_start)
    logger.info("=" * 70)


def _train_content_model(catalog_products, product_pool, use_synthetic_catalog=False):
    """Build va luu Content-Based model tu catalog-service hoac metadata synthetic."""
    logger.info("Huan luyen Content-Based (TF-IDF)...")
    products = catalog_products or fetch_products_for_reco_via_api()
    if not products and use_synthetic_catalog:
        products = build_synthetic_catalog_products(product_pool)
        logger.info("   Dung metadata synthetic cho %d san pham (CBF demo).", len(products))
    if not products:
        logger.warning("Catalog trong — bo qua CBF.")
        return
    if content_model.build(products):
        content_model.save(MODEL_DIR)
        logger.info("   - content_tfidf_vectorizer.joblib, content_similarity.npy")


if __name__ == "__main__":
    main()
