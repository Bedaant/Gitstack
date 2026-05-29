"""Tests for the /admin/blog/auto-generate endpoint."""
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient

from server import app, db, require_admin

client = TestClient(app)


def _seed_recent_repos():
    """Insert repos classified within the last 7 days."""
    now = datetime.now(timezone.utc).isoformat()
    for i in range(3):
        db.github_repos.insert_one({
            "full_name": f"owner/repo-{i}",
            "name": f"repo-{i}",
            "description": f"A tool for {i}",
            "stars": 500 + i * 100,
            "repo_type": "complete_solution",
            "use_cases": ["crm", "analytics"],
            "classified_at": now,
        })


@pytest.fixture(autouse=True)
def clean_db():
    for name in db.list_collection_names():
        db.drop_collection(name)
    yield


@pytest.fixture(autouse=True)
def override_admin():
    """Override require_admin dependency for all tests in this file."""
    def fake_admin():
        return type("User", (), {
            "user_id": "admin_1",
            "email": "admin@test.com",
        })()
    app.dependency_overrides[require_admin] = fake_admin
    yield
    app.dependency_overrides.pop(require_admin, None)


@patch("server.call_ai")
def test_blog_auto_generate_success(mock_gemini):
    """Admin with recent repos should get a generated blog post."""
    _seed_recent_repos()

    mock_gemini.return_value = """{
        "title": "Top 5 Open-Source CRM Tools This Week",
        "excerpt": "Discover the best open-source CRM tools for startups.",
        "content": "# Top 5 Open-Source CRM Tools\\n\\nThis week we found...",
        "tags": ["crm", "open-source", "startup", "saas", "tools"]
    }"""

    response = client.post("/api/admin/blog/auto-generate")
    assert response.status_code == 201, response.text
    data = response.json()
    assert "slug" in data
    assert "title" in data
    assert "content" in data
    assert data["title"] == "Top 5 Open-Source CRM Tools This Week"

    # Verify DB
    doc = db.blog_posts.find_one({"slug": data["slug"]})
    assert doc is not None
    assert doc["excerpt"] == "Discover the best open-source CRM tools for startups."


def test_blog_auto_generate_no_repos():
    """No repos classified in last 7 days → 404."""
    response = client.post("/api/admin/blog/auto-generate")
    assert response.status_code == 404
    assert "No newly classified repos" in response.json()["detail"]


@patch("server.call_ai")
def test_blog_auto_generate_ai_fails(mock_gemini):
    """Gemini failure should return 500."""
    _seed_recent_repos()

    mock_gemini.side_effect = Exception("Gemini timeout")

    response = client.post("/api/admin/blog/auto-generate")
    assert response.status_code == 500
    assert "Failed to generate blog post" in response.json()["detail"]
