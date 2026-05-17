"""Unit tests for marketplace endpoints using mongomock (no real MongoDB needed)."""
import pytest
import mongomock
from datetime import datetime, timezone

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
FastAPICache.init(InMemoryBackend(), prefix="test")

from server import app, db, limiter
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Drop all collections and reset rate limits before each test."""
    for name in db.list_collection_names():
        db.drop_collection(name)
    try:
        limiter._storage.reset()
    except Exception:
        pass
    yield


def test_list_products_empty():
    response = client.get("/api/marketplace/products")
    assert response.status_code == 200
    data = response.json()
    assert data["products"] == []


def test_get_product():
    # Insert a seller first
    db.marketplace_sellers.insert_one({
        "seller_user_id": "seller_1",
        "user_id": "seller_1",
        "verified": True,
        "payout_method": "upi",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Insert a product
    product = {
        "product_id": "prod-001",
        "seller_user_id": "seller_1",
        "title": "Test MCP Server",
        "tagline": "A test product",
        "description": "Details here",
        "category": "MCP Servers",
        "source_price_cents": 5000,
        "setup_price_cents": 2000,
        "setup_available": True,
        "published": True,
        "screenshots": [],
        "r2_file_key": "test.zip",
        "github_repo_url": "https://github.com/seller_1/test",
        "purchase_count": 0,
        "setup_count": 0,
        "avg_rating": 0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    db.marketplace_products.insert_one(product)

    # Get single product
    response = client.get("/api/marketplace/products/prod-001")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test MCP Server"
    assert data["seller"]["seller_user_id"] == "seller_1"

    # Verify DB state directly (find_one is async, skip to avoid event-loop issues in sync test)
    doc = db.marketplace_products._coll.find_one({"product_id": "prod-001"})
    assert doc["title"] == "Test MCP Server"


def test_get_product_not_found():
    response = client.get("/api/marketplace/products/nonexistent")
    assert response.status_code == 404
