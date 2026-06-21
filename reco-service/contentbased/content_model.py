"""Content-Based Filtering — TF-IDF + Cosine on product metadata."""

import json
import logging
import os
import re
import threading

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config.settings import (
    COSINE_FULL_MATRIX_MAX,
    MODEL_DIR,
    TFIDF_MAX_DF,
    TFIDF_MAX_FEATURES,
    TFIDF_NGRAM_MAX,
)

logger = logging.getLogger(__name__)

CONTENT_VECTORIZER_FILE = "content_tfidf_vectorizer.joblib"
CONTENT_SIM_FILE = "content_similarity.npy"
CONTENT_META_FILE = "content_product_meta.json"


def _clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    text = text.lower()
    return re.sub(r"[^a-z0-9\s]", " ", text)


def _build_corpus(product: dict) -> str:
    parts = [
        str(product.get("category") or ""),
        str(product.get("brand") or ""),
        str(product.get("name") or ""),
        str(product.get("category") or ""),
        str(product.get("brand") or ""),
        str(product.get("description") or "")[:500],
    ]
    return " ".join(_clean_text(p) for p in parts if p.strip())


class ContentBasedModel:
    def __init__(self):
        self.vectorizer = None
        self.similarity_matrix = None
        self.product_ids: list[int] = []
        self.product_id_to_idx: dict[int, int] = {}
        self.is_trained = False
        self._lock = threading.Lock()

    def build(self, products: list[dict]) -> bool:
        if not products:
            logger.warning("Khong co san pham de train Content-Based model.")
            return False

        with self._lock:
            self.product_ids = [int(p["id"]) for p in products]
            corpus = [_build_corpus(p) for p in products]

            self.vectorizer = TfidfVectorizer(
                stop_words="english",
                max_features=TFIDF_MAX_FEATURES,
                ngram_range=(1, TFIDF_NGRAM_MAX),
                sublinear_tf=True,
                min_df=1,
                max_df=TFIDF_MAX_DF,
            )
            matrix = self.vectorizer.fit_transform(corpus)
            n_products = matrix.shape[0]

            if n_products <= COSINE_FULL_MATRIX_MAX:
                self.similarity_matrix = cosine_similarity(matrix, matrix)
            else:
                self.similarity_matrix = None
                self._tfidf_matrix = matrix

            self.product_id_to_idx = {pid: idx for idx, pid in enumerate(self.product_ids)}
            self.is_trained = True
            logger.info("Content-Based model: %d products, TF-IDF dim=%d", n_products, matrix.shape[1])
            return True

    def save(self, model_dir: str = MODEL_DIR) -> None:
        if not self.is_trained:
            return
        os.makedirs(model_dir, exist_ok=True)
        joblib.dump(self.vectorizer, os.path.join(model_dir, CONTENT_VECTORIZER_FILE))
        if self.similarity_matrix is not None:
            np.save(os.path.join(model_dir, CONTENT_SIM_FILE), self.similarity_matrix)
        meta = {"product_ids": self.product_ids}
        with open(os.path.join(model_dir, CONTENT_META_FILE), "w", encoding="utf-8") as fh:
            json.dump(meta, fh, ensure_ascii=False)

    def load(self, model_dir: str = MODEL_DIR) -> bool:
        vec_path = os.path.join(model_dir, CONTENT_VECTORIZER_FILE)
        meta_path = os.path.join(model_dir, CONTENT_META_FILE)
        sim_path = os.path.join(model_dir, CONTENT_SIM_FILE)

        if not os.path.exists(vec_path) or not os.path.exists(meta_path):
            logger.warning("Thieu artifact Content-Based trong %s", model_dir)
            return False

        with self._lock:
            self.vectorizer = joblib.load(vec_path)
            with open(meta_path, "r", encoding="utf-8") as fh:
                meta = json.load(fh)
            self.product_ids = [int(pid) for pid in meta["product_ids"]]
            self.product_id_to_idx = {pid: idx for idx, pid in enumerate(self.product_ids)}
            self.similarity_matrix = np.load(sim_path) if os.path.exists(sim_path) else None
            self.is_trained = True
            logger.info("Content-Based loaded: %d products", len(self.product_ids))
            return True

    def _similarity_row(self, idx: int) -> np.ndarray:
        if self.similarity_matrix is not None:
            return self.similarity_matrix[idx]
        raise RuntimeError("Large-catalog lazy similarity chua duoc trien khai.")

    def get_similar(
        self,
        product_id: int,
        top_k: int = 10,
        exclude_ids: set | None = None,
    ) -> list[dict]:
        if not self.is_trained or product_id not in self.product_id_to_idx:
            return []

        exclude_ids = exclude_ids or set()
        idx = self.product_id_to_idx[product_id]
        sims = self._similarity_row(idx)

        order = sims.argsort()[::-1]
        rows = []
        for i in order:
            pid = self.product_ids[i]
            if pid == product_id or pid in exclude_ids:
                continue
            score = float(sims[i])
            if score <= 0:
                continue
            rows.append({"product_id": pid, "cosine_score": round(score, 4)})
            if len(rows) >= top_k:
                break
        return rows


content_model = ContentBasedModel()
