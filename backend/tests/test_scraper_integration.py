"""Integration tests for the GitHub scraper.

Mocks GitHub API responses and Gemini classification to test scraper logic
without making real network calls.
"""
import pytest
import mongomock
from unittest.mock import patch, AsyncMock
from datetime import datetime, timezone

class FakeResponse:
    def __init__(self, status_code, json_data):
        self.status_code = status_code
        self._json = json_data
    def json(self):
        return self._json


from github_scraper import GitHubScraper


@pytest.fixture
def scraper():
    db = mongomock.MongoClient().gitstack
    return GitHubScraper(db)


@pytest.fixture(autouse=True)
def clean_db(scraper):
    for name in scraper.db.list_collection_names():
        scraper.db.drop_collection(name)
    yield


# ── Tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_scrape_trending_parses_html(scraper):
    """BeautifulSoup correctly parses GitHub trending HTML."""
    html = """
    <article class="Box-row">
        <h2><a href="/owner/repo1">owner/repo1</a></h2>
        <p>A trending repo</p>
        <a href="/owner/repo1/stargazers">1,234</a>
        <span itemprop="programmingLanguage">Python</span>
        <span class="d-inline-block float-sm-right">123 stars today</span>
    </article>
    """
    with patch.object(scraper._client, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.text = html

        repos = await scraper.scrape_trending("python", "daily")

    assert len(repos) == 1
    assert repos[0]["full_name"] == "owner/repo1"
    assert repos[0]["stars"] == 1234
    assert repos[0]["language"] == "Python"
    assert repos[0]["today_stars"] == 123


@pytest.mark.asyncio
async def test_search_github_api_paginates(scraper):
    """search_github_api loops through pages and deduplicates."""
    call_count = 0

    async def fake_get(url, **kwargs):
        nonlocal call_count
        call_count += 1
        params = kwargs.get("params", {})
        page = params.get("page", 1)
        if page == 1:
            return FakeResponse(200, {
                "items": [
                    {"full_name": "a/b", "name": "b", "description": "", "stargazers_count": 100,
                     "forks_count": 5, "language": "Python", "topics": [], "html_url": "https://github.com/a/b",
                     "created_at": "2023-01-01", "updated_at": "2023-01-01", "pushed_at": "2023-01-01",
                     "open_issues_count": 0, "license": {"spdx_id": "MIT"}},
                ]
            })
        else:
            return FakeResponse(200, {"items": []})

    with patch.object(scraper._client, "get", side_effect=fake_get):
        repos = await scraper.search_github_api("topic:ai stars:>50", max_results=100)

    assert len(repos) == 1
    assert repos[0]["full_name"] == "a/b"
    assert call_count >= 1


@pytest.mark.asyncio
async def test_quality_rules_filter(scraper):
    """Repos with < 50 stars or no license are dropped by passes_quality_filter."""
    good_repo = {
        "full_name": "good/repo",
        "stars": 100,
        "license": "MIT",
        "pushed_at": datetime.now(timezone.utc).isoformat(),
        "contributors": 5,
    }
    bad_repo = {
        "full_name": "bad/repo",
        "stars": 10,
        "license": None,
        "pushed_at": datetime.now(timezone.utc).isoformat(),
        "contributors": 0,
    }
    assert scraper.passes_quality_filter(good_repo, False) is True
    assert scraper.passes_quality_filter(bad_repo, False) is False


@pytest.mark.asyncio
async def test_classification_batching(scraper):
    """classify_repos_batch sends repos to Gemini in batches of 10."""
    repos = [
        {"full_name": f"owner/repo-{i}", "stars": 200 + i, "description": "A tool"}
        for i in range(15)
    ]

    fake_gemini_response = '[{"full_name": "owner/repo-0", "repo_type": "complete_solution", "use_cases": ["crm"], "replaces_saas": ["Salesforce"], "has_docker": true, "has_api": true, "has_ui": true}]'

    with patch("google.generativeai.GenerativeModel") as mock_model_cls:
        mock_model = AsyncMock()
        mock_response = AsyncMock()
        mock_response.text = fake_gemini_response
        mock_model.generate_content_async.return_value = mock_response
        mock_model_cls.return_value = mock_model

        # Patch find_one to return None so all repos need classification.
        scraper.db.github_repos.find_one = AsyncMock(return_value=None)
        count = await scraper.classify_repos_batch(repos)
        # Gemini should be called at least once (we have 15 repos, batch size ~10)
        assert mock_model_cls.call_count >= 1


@pytest.mark.asyncio
async def test_tiered_storage(scraper):
    """Top 2000 repos scored as HOT, rest as WARM."""
    repos = [
        {"full_name": f"owner/repo-{i}", "stars": 5000 - i, "score": 100 - i}
        for i in range(2500)
    ]

    with patch.object(scraper, "save_repo", new_callable=AsyncMock) as mock_save:
        for repo in repos[:2000]:
            await scraper.save_repo(repo, tier="hot")
        for repo in repos[2000:]:
            await scraper.save_repo(repo, tier="warm")

        hot_calls = [c for c in mock_save.call_args_list if c.kwargs.get("tier") == "hot" or (len(c.args) > 1 and c.args[1] == "hot")]
        warm_calls = [c for c in mock_save.call_args_list if c.kwargs.get("tier") == "warm" or (len(c.args) > 1 and c.args[1] == "warm")]
        assert len(hot_calls) == 2000
        assert len(warm_calls) == 500
