"""Basic mongomock sanity test (no real MongoDB needed)."""
import mongomock
from datetime import datetime, timezone


def test_mongomock_insert_and_find():
    client = mongomock.MongoClient()
    db = client["test_db"]
    db.products.insert_one({
        "product_id": "prod-001",
        "title": "Test Product",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    doc = db.products.find_one({"product_id": "prod-001"})
    assert doc is not None
    assert doc["title"] == "Test Product"


def test_mongomock_find_empty():
    client = mongomock.MongoClient()
    db = client["test_db"]
    docs = list(db.products.find({"product_id": "none"}))
    assert docs == []
