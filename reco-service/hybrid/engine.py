"""Hybrid engine — Retrieve (TF-IDF) → Rank (SVD) → Fusion."""

import logging

from config.settings import CBF_WEIGHT, RATING_MAX, RATING_MIN, SVD_WEIGHT, TOP_N_TFIDF
from contentbased.content_model import content_model
from collaborativefiltering.recommend import reco_service

logger = logging.getLogger(__name__)


def rating_to_norm(score: float) -> float:
    return max(0.0, min(1.0, (score - RATING_MIN) / (RATING_MAX - RATING_MIN)))


class HybridRecommendationEngine:
    """Session-based hybrid: user_id + anchor product (trang chi tiet SP)."""

    def get_similar_products(self, anchor_product_id: int, top_k: int = 10) -> tuple[str, list[dict]]:
        if not content_model.is_trained:
            return "CBF unavailable", []

        exclude = {int(anchor_product_id)}
        rows = content_model.get_similar(int(anchor_product_id), top_k=top_k, exclude_ids=exclude)
        recs = [
            {
                "product_id": r["product_id"],
                "cosine_score": r["cosine_score"],
                "final_score": r["cosine_score"],
            }
            for r in rows
        ]
        strategy = "Content-Based TF-IDF (anchor=%s)" % anchor_product_id
        return strategy, recs

    def get_hybrid_recommendations(
        self,
        user_id,
        anchor_product_id: int,
        top_n: int = 10,
    ) -> tuple[str, list[dict]]:
        anchor_product_id = int(anchor_product_id)
        str_uid = str(user_id)

        if not content_model.is_trained:
            logger.warning("CBF chua san sang — fallback SVD-only.")
            return reco_service.get_recommendations(user_id, top_n=top_n)

        interacted = reco_service._resolve_interacted_products(user_id, str_uid)
        exclude = interacted | {anchor_product_id}

        candidates = content_model.get_similar(
            anchor_product_id,
            top_k=TOP_N_TFIDF,
            exclude_ids=exclude,
        )
        if not candidates:
            return reco_service.get_recommendations(user_id, top_n=top_n)

        rows = []
        for item in candidates:
            pid = item["product_id"]
            cb_score = item["cosine_score"]
            svd_rating = reco_service.predict_rating(str_uid, pid)
            svd_norm = rating_to_norm(svd_rating) if svd_rating is not None else 0.0
            final_score = SVD_WEIGHT * svd_norm + CBF_WEIGHT * cb_score
            rows.append(
                {
                    "product_id": pid,
                    "predicted_rating": round(svd_rating, 4) if svd_rating is not None else None,
                    "cosine_score": cb_score,
                    "svd_norm": round(svd_norm, 4),
                    "final_score": round(final_score, 4),
                }
            )

        rows.sort(key=lambda x: x["final_score"], reverse=True)
        strategy = (
            "Hybrid TF-IDF+SVD (anchor=%s, pool=%d, alpha=%s/%s)"
            % (anchor_product_id, len(candidates), SVD_WEIGHT, CBF_WEIGHT)
        )
        return strategy, rows[:top_n]

    def get_user_recommendations(self, user_id, top_n: int = 10) -> tuple[str, list[dict]]:
        """Trang chu — giu SVD CF (khong co anchor)."""
        return reco_service.get_recommendations(user_id, top_n=top_n)


hybrid_engine = HybridRecommendationEngine()
