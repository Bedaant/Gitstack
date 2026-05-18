"""Unit tests for the /ai/solution-finder endpoint.

Uses mongomock + unittest.mock to test all 3 fallback layers without real MongoDB or GitHub API calls.
"""
import pytest
import mongomock
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
FastAPICache.init(InMemoryBackend(), prefix="test")

from server import app, db, limiter

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Drop all collections, clear cache, and reset rate limits before each test."""
    for name in db.list_collection_names():
        db.drop_collection(name)
    try:
        import asyncio
        asyncio.get_event_loop().run_until_complete(FastAPICache.clear())
    except Exception:
        pass
    try:
        limiter._storage.reset()
    except Exception:
        pass
    yield


# ── Helpers ──────────────────────────────────────────────────────────

class FakeResponse:
    """Fake httpx.Response for mocking."""
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json = json_data
    def json(self):
        return self._json


def _make_async_cursor(docs):
    """Return a mock async cursor chain (find -> sort -> limit -> to_list)."""
    class AsyncCursor:
        def __init__(self, data):
            self._data = data
        def sort(self, *a, **k):
            return self
        def limit(self, n):
            return self
        def skip(self, n):
            return self
        async def to_list(self, n=None):
            return self._data
    return AsyncCursor(docs)


def _seed_local_repos(count: int = 5):
    """Insert fake complete_solution repos into the local DB."""
    for i in range(count):
        db.github_repos.insert_one({
            "full_name": f"owner/repo-{i}",
            "name": f"repo-{i}",
            "description": f"A CRM tool number {i}",
            "stars": 500 + i * 100,
            "repo_type": "complete_solution",
            "use_cases": ["crm", "email-marketing"],
            "topics": ["crm", "saas"],
            "health_score": 80,
            "has_docker": True,
        })


# ── Tests ────────────────────────────────────────────────────────────

def test_local_db_hit_only():
    """Layer 1 returns enough results; no GitHub/Gemini calls needed."""
    docs = [
        {
            "full_name": f"owner/repo-{i}",
            "name": f"repo-{i}",
            "description": f"A CRM tool number {i}",
            "stars": 500 + i * 100,
            "repo_type": "complete_solution",
            "use_cases": ["crm", "email-marketing"],
            "topics": ["crm", "saas"],
            "health_score": 80,
            "has_docker": True,
        }
        for i in range(5)
    ]

    with patch("server.db.github_repos.find", return_value=_make_async_cursor(docs)):
        with patch("server.call_gemini") as mock_gemini:
            mock_gemini.return_value = '{"keywords": ["crm"], "github_query": "crm open source", "intent_summary": "CRM tool for managing customer relationships"}'
            response = client.post("/api/ai/solution-finder", json={"query": "crm local", "limit": 3})

    assert response.status_code == 200
    data = response.json()
    assert data["layer_used"] == "local_db"
    assert len(data["solutions"]) == 3
    assert all(s["match_source"] == "local_db" for s in data["solutions"])
    assert data["intent_source"] in ("gemini", "gemini_cached")


def test_layer_2_fallback():
    """Layer 1 returns < 3 results, so Layer 2 (GitHub API) is triggered."""
    local_docs = [
        {
            "full_name": f"owner/repo-{i}",
            "name": f"repo-{i}",
            "description": "A CRM tool",
            "stars": 500,
            "repo_type": "complete_solution",
            "use_cases": ["crm"],
            "topics": ["crm"],
            "health_score": 80,
            "has_docker": True,
        }
        for i in range(2)
    ]

    fake_github_response = {
        "items": [
            {
                "full_name": "live/awesome-crm",
                "name": "awesome-crm",
                "owner": {"login": "live"},
                "description": "A live CRM",
                "stargazers_count": 800,
                "forks_count": 50,
                "language": "Python",
                "topics": ["crm"],
                "html_url": "https://github.com/live/awesome-crm",
                "pushed_at": "2024-01-01T00:00:00Z",
                "license": {"spdx_id": "MIT"},
            }
        ]
    }

    with patch("server.db.github_repos.find", side_effect=[
        _make_async_cursor(local_docs),  # local_query
        _make_async_cursor([]),           # unclassified_query
    ]):
        with patch("server.call_gemini") as mock_gemini:
            mock_gemini.return_value = '{"keywords": ["crm"], "github_query": "crm open source", "intent_summary": "CRM tool for managing customer relationships"}'

            with patch("server._get_httpx_client") as mock_get_client:
                mock_client = AsyncMock()
                mock_client.get.return_value = FakeResponse(200, fake_github_response)
                mock_get_client.return_value = mock_client

                response = client.post("/api/ai/solution-finder", json={"query": "crm layer2", "limit": 3})

    assert response.status_code == 200
    data = response.json()
    assert data["layer_used"] == "github_live"
    assert len(data["solutions"]) >= 2  # 1 local + 1 live


def test_layer_3_fallback():
    """Layer 1 and 2 both return < 3, so Layer 3 (Gemini discovery) is triggered."""
    # No local repos

    fake_gemini_discover = '[{"full_name": "discovered/fancy-crm", "reason": "Best CRM for small teams"}]'
    fake_github_repo = {
        "full_name": "discovered/fancy-crm",
        "name": "fancy-crm",
        "owner": {"login": "discovered"},
        "description": "Fancy CRM",
        "stargazers_count": 200,
        "forks_count": 10,
        "language": "TypeScript",
        "topics": ["crm"],
        "html_url": "https://github.com/discovered/fancy-crm",
        "pushed_at": "2024-01-01T00:00:00Z",
        "license": {"spdx_id": "MIT"},
    }

    with patch("server.db.github_repos.find", side_effect=[
        _make_async_cursor([]),  # local_query
        _make_async_cursor([]),  # unclassified_query
    ]):
        with patch("server.call_gemini") as mock_gemini:
            mock_gemini.side_effect = [
                '{"keywords": ["crm"], "github_query": "crm open source", "intent_summary": "CRM tool for managing customer relationships"}',  # intent parsing
                fake_gemini_discover,  # discovery
            ]

            with patch("server._get_httpx_client") as mock_get_client:
                mock_client = AsyncMock()
                # First call (Layer 2 search) → empty
                # Second call (Layer 3 validate) → success
                mock_client.get.side_effect = [
                    FakeResponse(200, {"items": []}),
                    FakeResponse(200, fake_github_repo),
                ]
                mock_get_client.return_value = mock_client

                response = client.post("/api/ai/solution-finder", json={"query": "crm layer3", "limit": 3})

    assert response.status_code == 200
    data = response.json()
    assert data["layer_used"] == "ai_discovered"
    assert len(data["solutions"]) >= 1


def test_empty_all_layers():
    """All layers return nothing — graceful empty response."""
    with patch("server.db.github_repos.find", return_value=_make_async_cursor([])):
        with patch("server.call_gemini") as mock_gemini:
            mock_gemini.side_effect = [
                '{"keywords": ["xyz123"], "github_query": "xyz123", "intent_summary": "Unknown tool"}',
                '[]',
            ]

            with patch("server._get_httpx_client") as mock_get_client:
                mock_client = AsyncMock()
                mock_client.get.return_value = FakeResponse(200, {"items": []})
                mock_get_client.return_value = mock_client

                response = client.post("/api/ai/solution-finder", json={"query": "xyz123 empty", "limit": 3})

    assert response.status_code == 200
    data = response.json()
    assert data["solutions"] == []
    assert data["total"] == 0


def test_gemini_intent_fallback():
    """When Gemini intent parsing fails, the endpoint falls back to raw keywords."""
    docs = [
        {
            "full_name": f"owner/repo-{i}",
            "name": f"repo-{i}",
            "description": f"A CRM tool number {i}",
            "stars": 500 + i * 100,
            "repo_type": "complete_solution",
            "use_cases": ["crm", "email-marketing"],
            "topics": ["crm", "saas"],
            "health_score": 80,
            "has_docker": True,
        }
        for i in range(5)
    ]

    with patch("server.db.github_repos.find", return_value=_make_async_cursor(docs)):
        with patch("server.call_gemini") as mock_gemini:
            mock_gemini.side_effect = Exception("Gemini is down")
            response = client.post("/api/ai/solution-finder", json={"query": "crm fallback", "limit": 3})

    assert response.status_code == 200
    data = response.json()
    assert data["layer_used"] == "local_db"
    assert len(data["solutions"]) == 3
    assert data["intent_source"] == "raw_fallback"


def test_upvote_requires_auth():
    """POST /ai/solution-finder/upvote without auth must return 401."""
    response = client.post("/api/ai/solution-finder/upvote", json={
        "full_name": "owner/repo",
        "use_case": "crm",
    })
    assert response.status_code == 401
