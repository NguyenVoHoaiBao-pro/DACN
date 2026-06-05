import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from collaborativefiltering.recommend import ItemBasedCFService


def test_cf_service_initialization():
    service = ItemBasedCFService()
    assert hasattr(service, "load_model")
    assert hasattr(service, "get_recommendations")


def test_fallback_recommendations():
    service = ItemBasedCFService()
    if service.metadata:
        strategy, recs = service.get_recommendations(9999999)
        assert "Popular" in strategy or "Item-based" in strategy or "cold" in strategy.lower()
        assert isinstance(recs, list)
        assert len(recs) <= 10
