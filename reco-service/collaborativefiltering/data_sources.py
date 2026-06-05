"""
data_sources.py — Lay du lieu rating / mua hang tu cac microservice qua REST API.

Tuan thu nguyen tac "Database per Service":
- review-service: ratings, popular products
- order-service: lich su mua hang

KHONG truy van truc tiep vao database cua cac service khac.
"""

import logging
from typing import List, Tuple

from config.settings import FAKE_PURCHASE_RATING, MAX_LATEST_RATINGS
from collaborativefiltering.service_client import (
    fetch_user_ratings_via_api,
    fetch_user_reviewed_products_via_api,
    fetch_user_purchased_products_via_api,
    fetch_popular_products_via_api,
)

logger = logging.getLogger(__name__)


def fetch_latest_user_ratings(user_id: int, limit: int = MAX_LATEST_RATINGS) -> List[Tuple[int, float]]:
    """Lay rating moi nhat cua user tu review-service API."""
    return fetch_user_ratings_via_api(user_id, limit=limit)


def fetch_purchases_without_review(user_id: int) -> List[Tuple[int, float]]:
    """Lay danh sach san pham da mua nhung chua review.

    Goi 2 API:
    1. order-service: lay product_ids da mua
    2. review-service: lay product_ids da review
    => Loai bo giao de tim "mua chua review"
    """
    purchased_ids = fetch_user_purchased_products_via_api(user_id)
    if not purchased_ids:
        return []

    reviewed_ids = fetch_user_reviewed_products_via_api(user_id)

    unreviewed = [pid for pid in purchased_ids if pid not in reviewed_ids]
    return [(pid, FAKE_PURCHASE_RATING) for pid in unreviewed]


def fetch_user_seed_ratings(user_id: int) -> Tuple[List[Tuple[int, float]], str]:
    """Ket hop ratings that + mua chua review lam seed cho CF."""
    ratings = fetch_latest_user_ratings(user_id)
    purchases = fetch_purchases_without_review(user_id)

    seen = {pid for pid, _ in ratings}
    merged = list(ratings)
    for pid, score in purchases:
        if pid not in seen:
            merged.append((pid, score))
            seen.add(pid)

    if ratings and purchases:
        label = "ratings_and_purchases"
    elif ratings:
        label = "ratings_only"
    elif purchases:
        label = "purchases_only"
    else:
        label = "none"

    return merged, label


def fetch_popular_product_ids(limit: int = 50) -> List[int]:
    """Lay danh sach product_id pho bien tu review-service API."""
    return fetch_popular_products_via_api(limit=limit)
