"""
database.py — DEPRECATED.

reco-service khong con truy van truc tiep vao database cua cac service khac.
Du lieu duoc lay qua REST API (xem collaborativefiltering/service_client.py).

File nay duoc giu lai de tranh loi import tu code cu chua cap nhat.
"""

import logging

logger = logging.getLogger(__name__)

logger.info(
    "database.py DEPRECATED: reco-service khong con dung MySQL connection pool. "
    "Du lieu lay qua REST API cac microservice."
)


def get_connection():
    """DEPRECATED — Khong con su dung."""
    raise RuntimeError(
        "reco-service khong con truy van DB truc tiep. "
        "Hay dung collaborativefiltering.service_client thay the."
    )
