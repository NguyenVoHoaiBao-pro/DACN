"""
data_sources.py — Lấy dữ liệu rating / mua hàng từ microservice qua REST API.

Tuân thủ "Database per Service":
- review-service: ratings, popular products
- order-service: lịch sử mua hàng
"""

import logging
from typing import List, Set

from config.settings import MAX_LATEST_RATINGS
from collaborativefiltering.service_client import (
    fetch_user_ratings_via_api,
    fetch_user_reviewed_products_via_api,
    fetch_user_purchased_products_via_api,
    fetch_popular_products_via_api,
)

logger = logging.getLogger(__name__)


def fetch_user_interacted_product_ids(user_id) -> Set[int]:
    """Tập product_id user đã review hoặc đã mua (để loại khỏi gợi ý)."""
    interacted: Set[int] = set()
    uid = int(user_id)

    ratings = fetch_user_ratings_via_api(uid, limit=MAX_LATEST_RATINGS)
    interacted.update(pid for pid, _ in ratings)

    interacted.update(fetch_user_reviewed_products_via_api(uid))
    interacted.update(fetch_user_purchased_products_via_api(uid))

    return interacted


def fetch_popular_product_ids(limit: int = 50) -> List[int]:
    """Danh sách product_id bán chạy / phổ biến từ review-service API."""
    return fetch_popular_products_via_api(limit=limit)
