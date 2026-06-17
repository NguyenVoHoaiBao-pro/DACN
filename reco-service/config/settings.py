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

# SVD hyperparameters (Surprise)
SVD_N_FACTORS = int(os.environ.get("SVD_N_FACTORS", "50"))
SVD_N_EPOCHS = int(os.environ.get("SVD_N_EPOCHS", "20"))
SVD_LR_ALL = float(os.environ.get("SVD_LR_ALL", "0.005"))
SVD_REG_ALL = float(os.environ.get("SVD_REG_ALL", "0.02"))
SVD_TEST_SIZE = float(os.environ.get("SVD_TEST_SIZE", "0.2"))
