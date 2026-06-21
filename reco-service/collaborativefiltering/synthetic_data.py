"""Sinh dữ liệu rating synthetic dày — dùng ID sản phẩm/user thật khi có."""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

DEFAULT_USER_IDS = list(range(1, 51))
DEFAULT_PRODUCT_IDS = list(range(1, 81))


def _dedupe_preserve_order(values) -> list[int]:
    seen = set()
    result = []
    for value in values:
        pid = int(value)
        if pid in seen:
            continue
        seen.add(pid)
        result.append(pid)
    return result


def generate_dense_synthetic_ratings(
    product_ids: list | None = None,
    user_ids: list | None = None,
    target_interactions: int = 1500,
    min_per_user: int = 8,
    max_per_user: int = 25,
    seed: int = 42,
) -> pd.DataFrame:
    """Tạo ma trận rating dày với pattern gu user (cluster sản phẩm)."""
    rng = np.random.default_rng(seed)

    product_ids = _dedupe_preserve_order(product_ids or DEFAULT_PRODUCT_IDS)
    if len(product_ids) < 4:
        product_ids = DEFAULT_PRODUCT_IDS
        logger.warning("Product pool quá nhỏ — dùng ID mặc định 1..80.")

    if not user_ids:
        n_users = max(30, target_interactions // max(min_per_user, 1))
        user_ids = list(range(1, n_users + 1))
    else:
        user_ids = _dedupe_preserve_order(user_ids)
        if len(user_ids) < 20:
            extra = [u for u in DEFAULT_USER_IDS if u not in set(user_ids)]
            user_ids.extend(extra[: max(0, 30 - len(user_ids))])

    n_clusters = min(8, max(2, len(product_ids) // 8))
    chunk = max(1, len(product_ids) // n_clusters)
    clusters = [product_ids[i : i + chunk] for i in range(0, len(product_ids), chunk)]

    rating_choices = np.array([3.0, 3.5, 4.0, 4.5, 5.0])
    rating_probs = np.array([0.08, 0.12, 0.25, 0.30, 0.25])

    rows = []
    for uid in user_ids:
        n_pick = int(rng.integers(min_per_user, max_per_user + 1))
        preferred = rng.choice(len(clusters), size=min(2, len(clusters)), replace=False)
        chosen = set()

        attempts = 0
        while len(chosen) < n_pick and attempts < n_pick * 4:
            attempts += 1
            cluster = clusters[int(rng.choice(preferred))]
            pid = int(rng.choice(cluster))
            if pid in chosen:
                continue
            chosen.add(pid)
            rows.append(
                {
                    "user_id": uid,
                    "product_id": pid,
                    "rating": float(rng.choice(rating_choices, p=rating_probs)),
                }
            )

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    return df.groupby(["user_id", "product_id"], as_index=False)["rating"].max()


def build_synthetic_catalog_products(product_ids: list) -> list[dict]:
    """Metadata giả cho TF-IDF khi không gọi được catalog-service."""
    categories = ["Laptop", "Phone", "Phu kien", "TV", "Dong ho", "Tablet", "Am thanh", "Man hinh"]
    brands = ["Apple", "Samsung", "Anker", "Dell", "LG", "Sony", "Asus", "Xiaomi"]
    products = []
    for idx, pid in enumerate(_dedupe_preserve_order(product_ids)):
        cat = categories[idx % len(categories)]
        brand = brands[idx % len(brands)]
        products.append(
            {
                "id": int(pid),
                "name": f"{brand} {cat} model {pid}",
                "description": f"{brand} {cat} cong nghe cao cap phuc vu demo goi y san pham.",
                "category": cat,
                "brand": brand,
            }
        )
    return products


def popular_from_interactions(df: pd.DataFrame, top_n: int = 50) -> list[int]:
    if df is None or df.empty:
        return []
    scores = df.groupby("product_id")["rating"].agg(["count", "sum"])
    scores["score"] = scores["count"] * scores["sum"]
    ranked = scores.sort_values("score", ascending=False).index.tolist()
    return [int(x) for x in ranked[:top_n]]
