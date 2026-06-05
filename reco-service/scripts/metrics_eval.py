"""
metrics_eval.py — EDA + đánh giá offline (Precision@K, Recall@K).

Chạy: python scripts/metrics_eval.py
"""

import os
import time
import logging

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from scipy.sparse import coo_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(BASE_DIR, "docs", "eda_reports")
DATASET_PATH_PRIMARY = os.path.join(BASE_DIR, "docs", "ratings_dataset.csv")
DATASET_PATH_FALLBACK = os.path.join(BASE_DIR, "ratings_Electronics (1).csv")

MAX_ROWS = 300000
MIN_USER_INTERACTIONS = 5
MAX_USER_INTERACTIONS = 300
MIN_PRODUCT_INTERACTIONS = 5
TEST_SIZE = 0.20
SAMPLE_USERS = 1000
TOP_K = 10


def _load_dataset():
    data_path = DATASET_PATH_PRIMARY if os.path.exists(DATASET_PATH_PRIMARY) else DATASET_PATH_FALLBACK
    if not os.path.exists(data_path):
        logger.error("Khong tim thay dataset: %s", data_path)
        logger.info("Dat ratings_dataset.csv vao thu muc docs/")
        return None

    logger.info("Nap dataset tu: %s", data_path)
    df = pd.read_csv(
        data_path,
        nrows=MAX_ROWS,
        names=["user_id", "product_id", "interaction_score", "timestamp"],
    )
    return df.dropna(subset=["user_id", "product_id", "interaction_score"])


def _denoise_dataset(df):
    logger.info("Loc Outliers (Bot, Spam)...")
    user_counts = df["user_id"].value_counts()
    valid_users = user_counts[
        (user_counts >= MIN_USER_INTERACTIONS) & (user_counts <= MAX_USER_INTERACTIONS)
    ].index
    df_filtered = df[df["user_id"].isin(valid_users)]
    product_counts = df_filtered["product_id"].value_counts()
    df_filtered = df_filtered[
        df_filtered["product_id"].isin(product_counts[product_counts >= MIN_PRODUCT_INTERACTIONS].index)
    ]
    df_agg = df_filtered.groupby(["user_id", "product_id"])["interaction_score"].max().reset_index()
    sparsity = 1.0 - (len(df_agg) / (df_agg["user_id"].nunique() * df_agg["product_id"].nunique()))
    logger.info("  Sparsity: %.2f%%", sparsity * 100)
    return df_filtered, df_agg


def _generate_eda_charts(df_filtered, df_agg):
    os.makedirs(DOCS_DIR, exist_ok=True)
    plt.figure(figsize=(8, 5))
    sns.countplot(x="interaction_score", data=df_filtered, palette="viridis")
    plt.title("Phan phoi tuong tac")
    plt.savefig(os.path.join(DOCS_DIR, "event_distribution.png"))
    plt.close()

    top_products = (
        df_agg.groupby("product_id")["interaction_score"].sum().sort_values(ascending=False).head(10)
    )
    plt.figure(figsize=(10, 5))
    sns.barplot(x=top_products.index.astype(str), y=top_products.values, palette="rocket")
    plt.title("Top 10 san pham")
    plt.savefig(os.path.join(DOCS_DIR, "top_10_products.png"))
    plt.close()
    logger.info("EDA charts -> %s", DOCS_DIR)


def _run_offline_evaluation(df_agg):
    train_df, test_df = train_test_split(df_agg, test_size=TEST_SIZE, random_state=42)
    train_user_ids = train_df["user_id"].unique()
    train_product_ids = train_df["product_id"].unique()
    user_to_index = {uid: i for i, uid in enumerate(train_user_ids)}
    product_to_index = {pid: i for i, pid in enumerate(train_product_ids)}

    train_df = train_df.copy()
    train_df["u_idx"] = train_df["user_id"].map(user_to_index).astype(int)
    train_df["p_idx"] = train_df["product_id"].map(product_to_index).astype(int)

    matrix_train = coo_matrix(
        (train_df["interaction_score"], (train_df["u_idx"], train_df["p_idx"])),
        shape=(len(train_user_ids), len(train_product_ids)),
    ).tocsr()

    item_sim_train = cosine_similarity(matrix_train.T)
    np.fill_diagonal(item_sim_train, 0)
    test_user_items = test_df.groupby("user_id")["product_id"].apply(set).to_dict()
    _compute_metrics(
        matrix_train, item_sim_train, user_to_index, product_to_index, test_user_items, train_df
    )


def _compute_metrics(matrix_train, item_sim_train, user_to_index, product_to_index, test_user_items, train_df):
    np.random.seed(42)
    sample_test_users = np.random.choice(
        list(test_user_items.keys()), min(SAMPLE_USERS, len(test_user_items)), replace=False
    )
    reverse_product_map = {v: k for k, v in product_to_index.items()}
    popular_product_ids = set(
        train_df.groupby("product_id")["interaction_score"].sum().sort_values(ascending=False).head(TOP_K).index
    )

    hits = hits_baseline = evaluated_users = 0
    total_precision = total_recall = total_precision_baseline = total_recall_baseline = 0.0
    start_eval = time.time()

    for uid in sample_test_users:
        if uid not in user_to_index:
            continue
        u_idx = user_to_index[uid]
        user_vector = matrix_train[u_idx].toarray().flatten()
        scores = item_sim_train.dot(user_vector)
        sim_sum = np.abs(item_sim_train).dot(user_vector > 0)
        sim_sum[sim_sum == 0] = 1
        pred_scores = scores / sim_sum
        pred_scores[np.where(user_vector > 0)[0]] = -999
        top_indices = np.argsort(pred_scores)[::-1][:TOP_K]

        recommended_items = {
            reverse_product_map[idx]
            for idx in top_indices
            if pred_scores[idx] > 0 and idx in reverse_product_map
        }
        if not recommended_items:
            continue

        actual_items = test_user_items[uid]
        hit_items = recommended_items.intersection(actual_items)
        if hit_items:
            hits += 1
        total_precision += len(hit_items) / len(recommended_items)
        total_recall += len(hit_items) / len(actual_items)
        evaluated_users += 1

        hit_b = popular_product_ids.intersection(actual_items)
        if hit_b:
            hits_baseline += 1
        total_precision_baseline += len(hit_b) / TOP_K
        total_recall_baseline += len(hit_b) / len(actual_items)

    if evaluated_users:
        ap = total_precision / evaluated_users
        ar = total_recall / evaluated_users
        f1 = 2 * ap * ar / (ap + ar) if (ap + ar) else 0
        hr = hits / evaluated_users
        apb = total_precision_baseline / evaluated_users
        hrb = hits_baseline / evaluated_users
        logger.info("Precision@%d AI=%.2f%% Baseline=%.2f%%", TOP_K, ap * 100, apb * 100)
        logger.info("Recall@%d AI=%.2f%%", TOP_K, ar * 100)
        logger.info("F1=%.2f%% HitRate AI=%.2f%% Baseline=%.2f%%", f1 * 100, hr * 100, hrb * 100)
    logger.info("Thoi gian: %.2fs", time.time() - start_eval)


def main():
    df = _load_dataset()
    if df is None:
        return
    df_filtered, df_agg = _denoise_dataset(df)
    _generate_eda_charts(df_filtered, df_agg)
    _run_offline_evaluation(df_agg)


if __name__ == "__main__":
    main()
