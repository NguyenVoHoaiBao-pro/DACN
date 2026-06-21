import os
from dotenv import load_dotenv

load_dotenv()

# Server
API_PORT = int(os.environ.get("AI_PORT", 5003))

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "collaborativefiltering", "asset")
DOCS_DIR = os.path.join(BASE_DIR, "docs")

# Training data
FAKE_PURCHASE_RATING = float(os.environ.get("RECO_FAKE_PURCHASE_RATING", "3.5"))
MAX_LATEST_RATINGS = int(os.environ.get("RECO_MAX_LATEST_RATINGS", "50"))

# Synthetic augment (làm dày dữ liệu train khi DB mỏng)
SYNTHETIC_AUGMENT_ENABLED = os.environ.get("RECO_SYNTHETIC_AUGMENT", "true").lower() in ("1", "true", "yes")
SYNTHETIC_TARGET_INTERACTIONS = int(os.environ.get("RECO_SYNTHETIC_TARGET_INTERACTIONS", "1500"))
SYNTHETIC_MIN_PER_USER = int(os.environ.get("RECO_SYNTHETIC_MIN_PER_USER", "8"))
MIN_TRAIN_INTERACTIONS = int(os.environ.get("RECO_MIN_TRAIN_INTERACTIONS", "100"))

# SVD hyperparameters (Surprise)
SVD_N_FACTORS = int(os.environ.get("SVD_N_FACTORS", "50"))
SVD_N_EPOCHS = int(os.environ.get("SVD_N_EPOCHS", "20"))
SVD_LR_ALL = float(os.environ.get("SVD_LR_ALL", "0.005"))
SVD_REG_ALL = float(os.environ.get("SVD_REG_ALL", "0.02"))
SVD_TEST_SIZE = float(os.environ.get("SVD_TEST_SIZE", "0.2"))

# Hybrid fusion (align with DoAn notebook)
SVD_WEIGHT = float(os.environ.get("SVD_WEIGHT", "0.4"))
CBF_WEIGHT = float(os.environ.get("CBF_WEIGHT", "0.6"))
TOP_N_TFIDF = int(os.environ.get("TOP_N_TFIDF", "50"))
RATING_MIN = 1.0
RATING_MAX = 5.0

TFIDF_MAX_FEATURES = int(os.environ.get("TFIDF_MAX_FEATURES", "5000"))
TFIDF_NGRAM_MAX = int(os.environ.get("TFIDF_NGRAM_MAX", "2"))
TFIDF_MAX_DF = float(os.environ.get("TFIDF_MAX_DF", "0.9"))
COSINE_FULL_MATRIX_MAX = 5000
