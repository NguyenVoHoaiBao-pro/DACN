"""
recommend.py — Gợi ý sản phẩm bằng SVD (đặc trưng ẩn).

Đọc model từ asset/ (svd_model.pkl, encoders, metadata.json).
Cold-start (user/item mới) → fallback sản phẩm bán chạy.
"""

import os
import json
import logging
import threading

import joblib

from config.settings import MODEL_DIR
from collaborativefiltering.data_sources import (
    fetch_popular_product_ids,
    fetch_user_interacted_product_ids,
)

logger = logging.getLogger(__name__)

COLD_START_DEFAULT_SCORE = 4.9
FILL_DEFAULT_SCORE = 4.8


class SVDRecommendationService:
    """SVD Collaborative Filtering: predict rating qua vector ẩn user × item."""

    def __init__(self):
        self.svd_model = None
        self.user_encoder = None
        self.item_encoder = None
        self.metadata = None
        self.is_loading = False
        self._lock = threading.Lock()
        self.load_model()

    def load_model(self):
        if self.is_loading:
            return False

        with self._lock:
            self.is_loading = True
            try:
                if not self._load_metadata():
                    return False
                if not self._load_svd_model():
                    return False
                if not self._load_encoders():
                    return False

                stats = self.metadata.get("stats", {})
                logger.info(
                    "SVD loaded: products=%s users=%s interactions=%s rmse=%s",
                    stats.get("products"),
                    stats.get("users"),
                    stats.get("interactions"),
                    self.metadata.get("performance", {}).get("rmse"),
                )
                return True
            except Exception as exc:
                logger.error("Load model lỗi: %s", exc)
                return False
            finally:
                self.is_loading = False

    def _load_metadata(self):
        meta_path = os.path.join(MODEL_DIR, "metadata.json")
        if not os.path.exists(meta_path):
            logger.warning("Thiếu %s — chạy: python collaborativefiltering/train.py", meta_path)
            return False
        with open(meta_path, "r", encoding="utf-8") as fh:
            self.metadata = json.load(fh)
        return True

    def _load_svd_model(self):
        path = os.path.join(MODEL_DIR, "svd_model.pkl")
        if not os.path.exists(path):
            logger.warning("Thiếu %s", path)
            return False
        self.svd_model = joblib.load(path)
        return True

    def _load_encoders(self):
        user_path = os.path.join(MODEL_DIR, "user_encoder.joblib")
        item_path = os.path.join(MODEL_DIR, "item_encoder.joblib")
        if not os.path.exists(user_path) or not os.path.exists(item_path):
            logger.warning("Thiếu encoder files trong %s", MODEL_DIR)
            return False
        self.user_encoder = joblib.load(user_path)
        self.item_encoder = joblib.load(item_path)
        return True

    def get_recommendations(self, user_id, top_n=10):
        if not self.metadata or self.svd_model is None:
            return "Warming Up (chưa có model SVD)", []

        str_uid = str(user_id)
        popular = self.metadata.get("popular_products") or self.metadata.get("best_sellers", [])

        if str_uid not in set(self.user_encoder.classes_):
            return self._popular_fallback(popular, top_n, "Popular Products (cold-start: new user)")

        interacted = self._resolve_interacted_products(user_id, str_uid)
        candidates = self._predict_all_candidates(str_uid, interacted)

        if not candidates:
            return self._popular_fallback(
                popular,
                top_n,
                "Popular Products (cold-start: no candidates)",
                exclude=interacted,
            )

        strategy = "SVD Latent Factors (user=%s, candidates=%d)" % (str_uid, len(candidates))
        return self._fill_recommendations(candidates, popular, interacted, top_n, strategy)

    def _resolve_interacted_products(self, user_id, str_uid):
        """Lấy sản phẩm user đã tương tác (API live + offline train set)."""
        live_ids = fetch_user_interacted_product_ids(user_id)
        interacted = set(live_ids)

        offline = self.metadata.get("offline_user_products", {}).get(str_uid, [])
        interacted.update(int(pid) for pid in offline)

        return interacted

    def _predict_all_candidates(self, str_uid, interacted):
        """Predict rating cho mọi sản phẩm trong tập train, loại đã tương tác."""
        try:
            u_internal = self.user_encoder.transform([str_uid])[0]
        except ValueError:
            return []

        candidates = []
        for pid_str in self.item_encoder.classes_:
            pid = int(pid_str)
            if pid in interacted:
                continue
            try:
                i_internal = self.item_encoder.transform([pid_str])[0]
                pred = self.svd_model.predict(u_internal, i_internal)
                score = max(1.0, min(5.0, float(pred.est)))
                candidates.append({"product_id": pid, "predicted_rating": round(score, 4)})
            except (ValueError, KeyError):
                continue

        candidates.sort(key=lambda x: x["predicted_rating"], reverse=True)
        return candidates

    def _fill_recommendations(self, candidates, popular, interacted, top_n, strategy):
        recs = candidates[:top_n]
        used = {x["product_id"] for x in recs}

        if len(recs) < top_n:
            for pid in popular:
                ipid = int(pid)
                if ipid in used or ipid in interacted:
                    continue
                recs.append({"product_id": ipid, "predicted_rating": FILL_DEFAULT_SCORE})
                used.add(ipid)
                if len(recs) >= top_n:
                    break

        return strategy, recs

    def _popular_fallback(self, popular, top_n, strategy, exclude=None):
        exclude = exclude or set()
        if not popular:
            popular = fetch_popular_product_ids(top_n)

        recs = []
        for pid in popular:
            ipid = int(pid)
            if ipid in exclude:
                continue
            recs.append({"product_id": ipid, "predicted_rating": COLD_START_DEFAULT_SCORE})
            if len(recs) >= top_n:
                break

        return strategy, recs


reco_service = SVDRecommendationService()
cf_service = reco_service
