"""
train.py — Huan luyen Item-based Collaborative Filtering.

Lay du lieu tu cac microservice qua REST API (tuan thu microservices architecture).
Luu artifact vao collaborativefiltering/asset/ (metadata.json, *.npz, *.pkl).

Chay:
  python collaborativefiltering/train.py
  hoac: .\\scripts\\RUN_TRAINING.ps1
"""

import os
import sys
import time
import json
import pickle
import logging

import numpy as np
import pandas as pd
from scipy.sparse import coo_matrix, csr_matrix, save_npz
from sklearn.metrics.pairwise import cosine_similarity
from surprise import Dataset, Reader, KNNWithMeans

from config.settings import (
    FAKE_PURCHASE_RATING,
    MODEL_DIR,
)
from collaborativefiltering.service_client import (
    fetch_all_ratings_via_api,
    fetch_all_purchased_products_via_api,
    fetch_popular_products_via_api,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hang so cau hinh
# ---------------------------------------------------------------------------
KNN_SURPRISE_K = 40

MIN_USER_INTERACTIONS = 2
MAX_USER_INTERACTIONS = 500
MIN_PRODUCT_INTERACTIONS = 2
TOP_K_NEIGHBORS = 50
MOCK_NUM_RECORDS = 8000
MOCK_NUM_USERS_RANGE = (10001, 10091)
MOCK_NUM_PRODUCTS_RANGE = (20001, 20181)
HOT_ITEMS_LIMIT = 50
SEED_NUM_USERS = 80


# ===================================================================
# 1. Doc du lieu tu cac Microservice qua REST API
# ===================================================================

def fetch_training_ratings():
    """Doc ratings that + mua chua review tu cac microservice API."""
    logger.info("Doc du lieu train tu review-service va order-service API...")

    # 1. Lay toan bo ratings da duyet tu review-service
    ratings_data = fetch_all_ratings_via_api()
    if ratings_data:
        df_reviews = pd.DataFrame(ratings_data)
        # Rename columns tu camelCase sang snake_case
        df_reviews.rename(columns={
            "userId": "user_id",
            "productId": "product_id",
        }, inplace=True)
        df_reviews["rating"] = df_reviews["rating"].astype(float)
    else:
        df_reviews = pd.DataFrame(columns=["user_id", "product_id", "rating"])
    logger.info("   [Reviews API] %d ban ghi da duyet.", len(df_reviews))

    # 2. Lay toan bo purchased products tu order-service
    purchases_data = fetch_all_purchased_products_via_api()
    if purchases_data:
        df_purchases = pd.DataFrame(purchases_data)
        df_purchases.rename(columns={
            "userId": "user_id",
            "productId": "product_id",
        }, inplace=True)
        df_purchases["rating"] = FAKE_PURCHASE_RATING
    else:
        df_purchases = pd.DataFrame(columns=["user_id", "product_id", "rating"])

    # 3. Loai bo nhung cap (user, product) da co review that
    if len(df_reviews) > 0 and len(df_purchases) > 0:
        reviewed_pairs = set(
            zip(df_reviews["user_id"], df_reviews["product_id"])
        )
        mask = df_purchases.apply(
            lambda r: (r["user_id"], r["product_id"]) not in reviewed_pairs, axis=1
        )
        df_purchases = df_purchases[mask]

    logger.info("   [Purchases API] %d cap user-product chua review.", len(df_purchases))

    return df_reviews, df_purchases


# ===================================================================
# 2. Lam sach va loc nhieu
# ===================================================================
def build_clean_dataframe(df_reviews, df_purchases):
    """Hop nhat reviews + purchases; uu tien rating that cao hon."""
    df_all = pd.concat([df_reviews, df_purchases], ignore_index=True)
    df_merged = df_all.groupby(["user_id", "product_id"], as_index=False)["rating"].max()

    logger.info("Bat dau don dep & loc nhieu (Denoising)...")

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
        "   Bo du lieu sach: %d tuong tac | %d users | %d products",
        len(df_filtered), df_filtered["user_id"].nunique(), df_filtered["product_id"].nunique(),
    )
    return df_filtered


# ===================================================================
# 4. Trich xuat Hot Items
# ===================================================================
def extract_popular_products(top_n=HOT_ITEMS_LIMIT):
    """San pham pho bien tu review-service API."""
    try:
        hot_list = fetch_popular_products_via_api(limit=top_n)
        logger.info("Trich xuat thanh cong %d san pham Hot Items tu API.", len(hot_list))
        return hot_list
    except Exception as exc:
        logger.error("Loi trich xuat Hot Items: %s. Tra ve rong.", exc)
        return []


# ===================================================================
# 5. Mock Fallback Data
# ===================================================================
def _get_mock_fallback_data():
    """Tu sinh du lieu gia lap chat luong cao neu API khong kha dung."""
    logger.warning("Khong the goi API microservices. Chuyen sang Che do Gia lap (Mock Data Fallback)...")
    np.random.seed(42)

    user_ids = np.random.randint(*MOCK_NUM_USERS_RANGE, MOCK_NUM_RECORDS)
    product_ids = np.random.randint(*MOCK_NUM_PRODUCTS_RANGE, MOCK_NUM_RECORDS)
    ratings = np.random.choice([1.5, 3.0, 3.5, 5.0], MOCK_NUM_RECORDS, p=[0.55, 0.20, 0.15, 0.10])

    df_mock = pd.DataFrame({
        "user_id": user_ids,
        "product_id": product_ids,
        "rating": ratings,
    })

    df_clean = df_mock.groupby(["user_id", "product_id"], as_index=False)["rating"].max()

    user_counts = df_clean["user_id"].value_counts()
    valid_users = user_counts[
        (user_counts >= MIN_USER_INTERACTIONS) & (user_counts <= MAX_USER_INTERACTIONS)
    ].index
    df_clean = df_clean[df_clean["user_id"].isin(valid_users)]

    product_counts = df_clean["product_id"].value_counts()
    df_clean = df_clean[df_clean["product_id"].isin(product_counts[product_counts >= MIN_PRODUCT_INTERACTIONS].index)]

    pop_series = df_clean.groupby("product_id")["rating"].sum()
    hot_items = [int(x) for x in pop_series.sort_values(ascending=False).index[:HOT_ITEMS_LIMIT]]

    logger.info(
        "   Mock Data Fallback: %d tuong tac | %d users | %d products",
        len(df_clean), df_clean["user_id"].nunique(), df_clean["product_id"].nunique(),
    )
    return df_clean, hot_items


# ===================================================================
# 6. Surprise KNN item-based (artifact)
# ===================================================================
def _train_surprise_item_knn(df_clean):
    """Huan luyen KNN item-based (Surprise) — luu best_knn_model.pkl."""
    df_knn = df_clean.copy()
    df_knn["user_id"] = df_knn["user_id"].astype(str)
    df_knn["product_id"] = df_knn["product_id"].astype(str)

    reader = Reader(rating_scale=(1.0, 5.0))
    data = Dataset.load_from_df(df_knn[["user_id", "product_id", "rating"]], reader)
    trainset = data.build_full_trainset()

    sim_options = {"name": "cosine", "user_based": False}
    model = KNNWithMeans(k=KNN_SURPRISE_K, sim_options=sim_options)
    logger.info("Dang huan luyen Surprise KNN item-based (k=%d)...", KNN_SURPRISE_K)
    model.fit(trainset)
    logger.info("   Surprise KNN fit thanh cong.")
    return model, trainset


# ===================================================================
# 7. Xay dung KNN Matrix & Cosine Similarity
# ===================================================================
def _build_knn_artifacts(df_clean):
    """Xay dung ma tran User-Item va tinh Cosine Similarity Top-K."""
    logger.info("Dang xay dung Ma Tran User-Item & Cosine Similarities...")

    user_ids = df_clean["user_id"].unique()
    product_ids = df_clean["product_id"].unique()

    user_to_index = {int(uid): i for i, uid in enumerate(user_ids)}
    product_to_index = {int(pid): i for i, pid in enumerate(product_ids)}

    df_clean = df_clean.copy()
    df_clean["u_idx"] = df_clean["user_id"].map(user_to_index)
    df_clean["p_idx"] = df_clean["product_id"].map(product_to_index)

    matrix = coo_matrix(
        (df_clean["rating"], (df_clean["u_idx"], df_clean["p_idx"])),
        shape=(len(user_ids), len(product_ids)),
    ).tocsr()

    item_sim = cosine_similarity(matrix.T)
    np.fill_diagonal(item_sim, 0)

    k = min(TOP_K_NEIGHBORS, len(product_ids) - 1)
    if k > 0:
        for i in range(item_sim.shape[0]):
            row = item_sim[i]
            if np.count_nonzero(row) > k:
                kth_val = np.partition(row, -k)[-k]
                row[row < kth_val] = 0
                item_sim[i] = row

    item_sim_sparse = csr_matrix(item_sim)
    logger.info("   Da hoan thanh tinh toan Item Similarities Top-%d!", k)

    return matrix, item_sim_sparse, user_to_index, product_to_index


# ===================================================================
# 8. Serialize & Xuat Artifacts
# ===================================================================
def _build_offline_user_ratings(df_clean):
    """Map user_id -> list [product_id, rating] cho nhom user da co trong train set."""
    offline = {}
    for uid, grp in df_clean.groupby("user_id"):
        offline[str(int(uid))] = [
            [int(row["product_id"]), float(row["rating"])]
            for _, row in grp.iterrows()
        ]
    return offline


def _serialize_all_artifacts(
    knn_model, trainset, matrix, item_sim_sparse,
    user_to_index, product_to_index, popular_items, df_clean, use_fallback,
):
    """Luu toan bo model artifacts ra disk."""
    logger.info("Dang serialize & dong bo hoa Model Artifacts...")

    knn_filepath = os.path.join(MODEL_DIR, "best_knn_model.pkl")
    knn_artifact = {
        "model": knn_model,
        "model_type": "item_knn_surprise",
        "trained_at": time.time(),
        "n_users": trainset.n_users,
        "n_items": trainset.n_items,
        "n_ratings": trainset.n_ratings,
    }
    with open(knn_filepath, "wb") as fh:
        pickle.dump(knn_artifact, fh)
    logger.info("   - Da luu KNN model: %s", knn_filepath)

    # B. KNN Sparse Matrices
    knn_matrix_path = os.path.join(MODEL_DIR, "item_similarity_topk.npz")
    user_matrix_path = os.path.join(MODEL_DIR, "user_item_matrix.npz")
    save_npz(knn_matrix_path, item_sim_sparse)
    save_npz(user_matrix_path, matrix)
    logger.info(
        "   - Da luu Item KNN similarity: %s (%.1f KB)",
        knn_matrix_path, os.path.getsize(knn_matrix_path) / 1024,
    )
    logger.info(
        "   - Da luu User-Item matrix: %s (%.1f KB)",
        user_matrix_path, os.path.getsize(user_matrix_path) / 1024,
    )

    # C. Metadata
    data_source = "MockDataEngine" if use_fallback else "microservices-api"
    metadata = {
        "version": "4.0.0-item-cf",
        "model_type": "item_based_cf",
        "data_source": data_source,
        "trained_at": time.time(),
        "stats": {
            "users": len(user_to_index),
            "products": len(product_to_index),
            "interactions": matrix.nnz,
        },
        "user_map": {str(k): int(v) for k, v in user_to_index.items()},
        "product_map": {str(k): int(v) for k, v in product_to_index.items()},
        "reverse_product_map": {str(v): int(k) for k, v in product_to_index.items()},
        "popular_products": popular_items,
        "best_sellers": popular_items,
        "offline_user_ratings": _build_offline_user_ratings(df_clean),
    }

    metadata_filepath = os.path.join(MODEL_DIR, "metadata.json")
    with open(metadata_filepath, "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=4, ensure_ascii=False)
    logger.info(
        "   - Da luu Metadata: %s (%.1f KB)",
        metadata_filepath, os.path.getsize(metadata_filepath) / 1024,
    )


# ===================================================================
# Main Pipeline
# ===================================================================
def main():
    """Chay pipeline huan luyen Item-based Collaborative Filtering."""
    t_start = time.time()
    logger.info("=" * 70)
    logger.info("BAT DAU HUAN LUYEN ITEM-BASED CF (via Microservices API)")
    logger.info("=" * 70)

    os.makedirs(MODEL_DIR, exist_ok=True)

    use_fallback = False
    popular_items = []

    try:
        df_reviews, df_purchases = fetch_training_ratings()

        if len(df_reviews) == 0 and len(df_purchases) == 0:
            logger.warning("Khong co du lieu review/order tu API — dung mock.")
            use_fallback = True
        else:
            df_clean = build_clean_dataframe(df_reviews, df_purchases)
            popular_items = extract_popular_products(top_n=HOT_ITEMS_LIMIT)

    except Exception as api_err:
        logger.error("Loi goi API microservices: %s", api_err)
        use_fallback = True

    if use_fallback:
        df_clean, popular_items = _get_mock_fallback_data()

    knn_model, trainset = _train_surprise_item_knn(df_clean)
    matrix, item_sim_sparse, user_to_index, product_to_index = _build_knn_artifacts(df_clean)

    _serialize_all_artifacts(
        knn_model, trainset, matrix, item_sim_sparse,
        user_to_index, product_to_index, popular_items, df_clean, use_fallback,
    )

    t_end = time.time()
    logger.info("=" * 70)
    logger.info("HUAN LUYEN & DONG GOI HOAN THANH TRONG %.2fs!", t_end - t_start)
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
