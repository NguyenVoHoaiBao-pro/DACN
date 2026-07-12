"""
service_client.py — HTTP client goi REST API cac microservice qua Eureka.

Thay the truy van SQL truc tiep vao database cua cac service khac,
tuan thu nguyen tac "Database per Service" cua microservices.
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx
import py_eureka_client.eureka_client as eureka_client

logger = logging.getLogger(__name__)

# Timeout cho HTTP requests (seconds)
HTTP_TIMEOUT = 30.0
HTTP_TIMEOUT_BULK = 120.0  # Cho cac request lay du lieu lon (training)

# Fallback URLs khi Eureka chua san sang
_FALLBACK_URLS = {
    "review-service": os.getenv("REVIEW_SERVICE_URL", "http://localhost:8087"),
    "order-service": os.getenv("ORDER_SERVICE_URL", "http://localhost:8086"),
    "catalog-service": os.getenv("CATALOG_SERVICE_URL", "http://localhost:8082"),
}


def _resolve_service_url(service_name: str) -> str:
    """Resolve URL cua service tu Eureka, fallback sang localhost."""
    try:
        instance = eureka_client.get_instance(service_name)
        if instance:
            host = instance.get("hostName") or instance.get("ipAddr", "localhost")
            port = instance.get("port", {})
            port_num = port.get("$", 8080) if isinstance(port, dict) else port
            return f"http://{host}:{port_num}"
    except Exception as exc:
        logger.debug("Eureka lookup '%s' that bai: %s — dung fallback", service_name, exc)

    return _FALLBACK_URLS.get(service_name, f"http://localhost:8080")


def _call_service(
    service_name: str,
    path: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = HTTP_TIMEOUT,
) -> Any:
    """Goi REST API cua mot microservice."""
    base_url = _resolve_service_url(service_name)
    url = f"{base_url}{path}"

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "HTTP %d tu %s%s: %s",
            exc.response.status_code, service_name, path,
            exc.response.text[:200],
        )
        raise
    except httpx.ConnectError as exc:
        logger.error("Khong the ket noi %s (%s): %s", service_name, url, exc)
        raise
    except Exception as exc:
        logger.error("Loi goi %s%s: %s", service_name, path, exc)
        raise


# ═══════════════════════════════════════════════════════════════════════════
# Review Service API
# ═══════════════════════════════════════════════════════════════════════════

def fetch_user_ratings_via_api(user_id: int, limit: int = 5) -> list:
    """Lay danh sach rating cua user tu review-service API.

    Returns: List[(product_id, rating)]
    """
    try:
        data = _call_service(
            "review-service",
            f"/api/reviews/internal/user/{user_id}/ratings",
            params={"limit": limit},
        )
        return [(item["productId"], float(item["rating"])) for item in data]
    except Exception as exc:
        logger.error("fetch_user_ratings_via_api loi (user_id=%s): %s", user_id, exc)
        return []


def fetch_user_reviewed_products_via_api(user_id: int) -> set:
    """Lay set product_id ma user da review tu review-service API."""
    try:
        data = _call_service(
            "review-service",
            f"/api/reviews/internal/user/{user_id}/reviewed-products",
        )
        return set(int(pid) for pid in data)
    except Exception as exc:
        logger.error("fetch_user_reviewed_products loi (user_id=%s): %s", user_id, exc)
        return set()


def fetch_popular_products_via_api(limit: int = 50) -> list:
    """Lay danh sach product_id pho bien tu review-service API.

    Returns: List[int]
    """
    try:
        data = _call_service(
            "review-service",
            "/api/reviews/internal/popular-products",
            params={"limit": limit},
        )
        return [int(item["productId"]) for item in data]
    except Exception as exc:
        logger.error("fetch_popular_products_via_api loi: %s", exc)
        return []


def fetch_all_ratings_via_api() -> list:
    """Lay TOAN BO ratings da duyet tu review-service (cho training).

    Returns: List[dict] voi keys: userId, productId, rating
    """
    try:
        data = _call_service(
            "review-service",
            "/api/reviews/internal/all-ratings",
            timeout=HTTP_TIMEOUT_BULK,
        )
        return data
    except Exception as exc:
        logger.error("fetch_all_ratings_via_api loi: %s", exc)
        return []


# ═══════════════════════════════════════════════════════════════════════════
# Order Service API
# ═══════════════════════════════════════════════════════════════════════════

def fetch_user_purchased_products_via_api(user_id: int) -> list:
    """Lay danh sach product_id da mua (status hop le) tu order-service API.

    Returns: List[int]
    """
    try:
        data = _call_service(
            "order-service",
            f"/api/orders/internal/users/{user_id}/purchased-products",
        )
        return [int(pid) for pid in data]
    except Exception as exc:
        logger.error("fetch_user_purchased_products loi (user_id=%s): %s", user_id, exc)
        return []


def fetch_all_purchased_products_via_api() -> list:
    """Lay TOAN BO cap (user_id, product_id) da mua (cho training).

    Returns: List[dict] voi keys: userId, productId
    """
    try:
        data = _call_service(
            "order-service",
            "/api/orders/internal/all-purchased-products",
            timeout=HTTP_TIMEOUT_BULK,
        )
        return data
    except Exception as exc:
        logger.error("fetch_all_purchased_products_via_api loi: %s", exc)
        return []