"""Rate limit tests for critical endpoints using slowapi + TestClient.

Note: slowapi stores limits in memory per process, so these tests must run
sequentially and may be flaky if the test process is reused heavily.
"""
import pytest
import mongomock
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
FastAPICache.init(InMemoryBackend(), prefix="test")

from server import app, db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    for name in db.list_collection_names():
        db.drop_collection(name)
    yield


# ── Helpers ──────────────────────────────────────────────────────────

def _make_async_cursor(docs):
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


def _hit_endpoint_until_429(method: str, path: str, json_body=None, max_calls=20):
    """Keep calling an endpoint until 429 or max_calls reached. Returns (status, call_count)."""
    for i in range(max_calls):
        if method == "POST":
            resp = client.post(path, json=json_body)
        elif method == "GET":
            resp = client.get(path)
        else:
            raise ValueError(f"Unsupported method: {method}")
        if resp.status_code == 429:
            return 429, i + 1
        if resp.status_code not in (200, 201, 422):
            # Unexpected error — abort
            return resp.status_code, i + 1
    return 200, max_calls


# ── Tests ────────────────────────────────────────────────────────────

def test_stacks_publish_429_after_5():
    """POST /stacks/publish should reject after 5 requests/minute."""
    body = {"name": "Test Stack", "idea": "Test idea", "tools": []}
    with patch.object(db.user_stacks, "insert_one", new_callable=AsyncMock):
        status, count = _hit_endpoint_until_429("POST", "/api/stacks/publish", json_body=body, max_calls=10)
    assert status == 429, f"Expected 429 after rate limit, got {status} after {count} calls"
    assert count > 5, f"Rate limit should kick in after 5 calls, but got {count}"


def test_solution_finder_429_after_10():
    """POST /ai/solution-finder should reject after 10 requests/minute."""
    body = {"query": "rate-limit-test", "limit": 3}
    with patch("server.db.github_repos.find", return_value=_make_async_cursor([])):
        with patch("server._get_httpx_client") as mock_get_client:
            mock_client = AsyncMock()
            mock_client.get.return_value = type("R", (), {"status_code": 200, "json": lambda self: {"items": []}})()
            mock_get_client.return_value = mock_client
            status, count = _hit_endpoint_until_429("POST", "/api/ai/solution-finder", json_body=body, max_calls=15)
    assert status == 429, f"Expected 429 after rate limit, got {status} after {count} calls"


def test_upvote_429_after_30():
    """POST /ai/solution-finder/upvote returns 401 without auth (auth dependency runs before rate limiter)."""
    body = {"full_name": "owner/repo", "use_case": "crm"}
    status, count = _hit_endpoint_until_429("POST", "/api/ai/solution-finder/upvote", json_body=body, max_calls=35)
    # Auth dependency runs before rate limiter, so unauthenticated requests always get 401
    assert status == 401, f"Expected 401 without auth, got {status}"
    assert count == 1, "Should fail immediately on first call without auth"
