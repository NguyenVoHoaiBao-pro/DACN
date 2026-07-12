"""
recommend.py — Gợi ý sản phẩm (Item-based CF).

Đọc model từ thư mục asset/ (metadata.json, item_similarity_topk.npz).
Chạy qua FastAPI: app.py import cf_service từ module này.
"""

import os
import json
import logging
import pickle
import threading
from collections import defaultdict

import numpy as np
from scipy.sparse import load_npz

from config.settings import MODEL_DIR, ITEM_CF_NEIGHBORS
from collaborativefiltering.data_sources import fetch_user_seed_ratings, fetch_popular_product_ids

logger = logging.getLogger(__name__)

COLD_START_DEFAULT_SCORE = 4.9
FILL_DEFAULT_SCORE = 4.8


class ItemBasedCFService:
    """Item-based CF: tương đồng hàng × rating seed."""

    def __init__(self):
        self.item_sim = None
        self.metadata = None
        self.knn_model = None
        self.is_loading = False
        self._lock = threading.Lock()
        self.load_model()

    def load_model(self):
        if self.is_loading:
            return False

        with self._lock:
            self.is_loading = True
            try:
                if not self._load_knn_matrices():
                    return False
                if not self._load_metadata():
                    return False
                self._load_knn_model_optional()
                stats = self.metadata.get("stats", {})
                logger.info(
                    "Item-CF loaded: products=%s users=%s interactions=%s",
                    stats.get("products"),
                    stats.get("users"),
                    stats.get("interactions"),
                )
                return True
            except Exception as exc:
                logger.error("Load model loi: %s", exc)
                return False
            finally:
                self.is_loading = False

    def _load_knn_matrices(self):
        sim_path = os.path.join(MODEL_DIR, "item_similarity_topk.npz")
        if not os.path.exists(sim_path):
            logger.warning("Thieu %s — chay: python collaborativefiltering/train.py", sim_path)
            return False
        self.item_sim = load_npz(sim_path)
        return True

    def _load_metadata(self):
        meta_path = os.path.join(MODEL_DIR, "metadata.json")
        if not os.path.exists(meta_path):
            logger.warning("Thieu %s", meta_path)
            return False
        with open(meta_path, "r", encoding="utf-8") as fh:
            self.metadata = json.load(fh)
        return True

    def _load_knn_model_optional(self):
        path = os.path.join(MODEL_DIR, "best_knn_model.pkl")
        if os.path.exists(path):
            with open(path, "rb") as fh:
                artifact = pickle.load(fh)
            self.knn_model = artifact.get("model")
        else:
            self.knn_model = None

    def get_recommendations(self, user_id, top_n=10):
        if not self.metadata or self.item_sim is None:
            return "Warming Up (chua co model Item-CF)", []

        product_map = self.metadata["product_map"]
        popular = self.metadata.get("popular_products") or self.metadata.get("best_sellers", [])
        user_map = self.metadata.get("user_map", {})
        str_uid = str(user_id)

        seed_ratings, source = self._resolve_seed_ratings(user_id, str_uid, user_map)

        if not seed_ratings:
            return self._popular_fallback(popular, top_n, "Popular Products (cold-start)")

        interacted = {pid for pid, _ in seed_ratings}
        candidates = self._score_item_neighbors(seed_ratings, product_map, interacted)

        strategy = "Item-based CF (%s, seeds=%d)" % (source, len(seed_ratings))
        return self._fill_recommendations(candidates, popular, interacted, top_n, strategy)

    def _resolve_seed_ratings(self, user_id, str_uid, user_map):
        live, source = fetch_user_seed_ratings(user_id)

        if str_uid in user_map and self.metadata.get("offline_user_ratings"):
            offline = self.metadata["offline_user_ratings"].get(str_uid, [])
            if offline and not live:
                return [(int(p), float(r)) for p, r in offline], "trained_user_offline"
            if offline:
                seen = {p for p, _ in live}
                merged = list(live)
                for p, r in offline:
                    if int(p) not in seen:
                        merged.append((int(p), float(r)))
                return merged, "trained_user_hybrid"

        return live, source

    def _score_item_neighbors(self, seed_ratings, product_map, interacted):
        scores = defaultdict(float)

        for pid, rating in seed_ratings:
            pid_str = str(pid)
            if pid_str not in product_map:
                continue
            idx = product_map[pid_str]
            row = self.item_sim[idx].toarray().flatten()
            if row.max() <= 0:
                continue

            top_indices = np.argsort(row)[::-1][:ITEM_CF_NEIGHBORS]
            for n_idx in top_indices:
                sim = float(row[n_idx])
                if sim <= 0:
                    continue
                neighbor_pid = int(self.metadata["reverse_product_map"][str(n_idx)])
                if neighbor_pid in interacted:
                    continue
                scores[neighbor_pid] += sim * float(rating)

        candidates = [
            {"product_id": pid, "predicted_rating": round(score, 4)}
            for pid, score in scores.items()
        ]
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

    def _popular_fallback(self, popular, top_n, strategy):
        if not popular:
            popular = fetch_popular_product_ids(top_n)
        recs = [
            {"product_id": int(pid), "predicted_rating": COLD_START_DEFAULT_SCORE}
            for pid in popular[:top_n]
        ]
        return strategy, recs


cf_service = ItemBasedCFService()