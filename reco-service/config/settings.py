import os
from dotenv import load_dotenv

load_dotenv()

# Server
API_PORT = int(os.environ.get("AI_PORT", 5003))

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "collaborativefiltering", "asset")
DOCS_DIR = os.path.join(BASE_DIR, "docs")

# Item-based CF
FAKE_PURCHASE_RATING = float(os.environ.get("RECO_FAKE_PURCHASE_RATING", "3.5"))
MAX_LATEST_RATINGS = int(os.environ.get("RECO_MAX_LATEST_RATINGS", "5"))
ITEM_CF_NEIGHBORS = int(os.environ.get("RECO_ITEM_CF_NEIGHBORS", "100"))
