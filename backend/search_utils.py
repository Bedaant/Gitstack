"""
Search utilities — normalization, fallback chain, click data loading.
"""

import hashlib
import json
from typing import List, Dict, Any, Optional
from loguru import logger


def normalize_repo(repo: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize any repo dict to a consistent schema for frontend."""
    stars = repo.get("stars", 0)
    if isinstance(stars, str):
        stars = int(stars.replace(",", ""))

    return {
        "tool_id": repo.get("tool_id") or repo.get("full_name", "").replace("/", "_").lower(),
        "name": repo.get("name", ""),
        "full_name": repo.get("full_name", ""),
        "owner": repo.get("owner", ""),
        "description": repo.get("description", ""),
        "stars": stars,
        "language": repo.get("language", "Unknown"),
        "topics": repo.get("topics") or [],
        "use_cases": repo.get("use_cases") or [],
        "replaces_saas": repo.get("replaces_saas") or [],
        "repo_type": repo.get("repo_type", ""),
        "has_docker": repo.get("has_docker", False),
        "has_ui": repo.get("has_ui", False),
        "health_score": repo.get("health_score", 0),
        "github_url": repo.get("github_url") or repo.get("html_url", ""),
        "source": (repo.get("_pillar") or "unknown").split(",")[0],
        "_score": round(repo.get("_final_score", repo.get("_composite_score", 0)), 2),
    }


async def load_click_data(db, query: str) -> Dict[str, Dict[str, Any]]:
    """Load click-through multipliers for repos from this query."""
    try:
        query_hash = hashlib.sha256(query.encode()).hexdigest()
        docs = await db.repo_click_scores.find(
            {"query_hash": query_hash},
            {"_id": 0}
        ).to_list(100)
        return {d["full_name"]: d for d in docs}
    except Exception as e:
        logger.debug(f"Click data load failed: {e}")
        return {}


async def search_github_live(
    query: str,
    github_headers: Dict[str, str],
    per_page: int = 15
) -> List[Dict[str, Any]]:
    """Search GitHub API for repos not in our DB."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/search/repositories",
                params={
                    "q": f"{query} stars:>50",
                    "sort": "stars",
                    "order": "desc",
                    "per_page": per_page,
                },
                headers=github_headers,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get("items", []):
                    results.append({
                        "tool_id": item["full_name"].replace("/", "_").lower(),
                        "name": item["name"],
                        "full_name": item["full_name"],
                        "owner": item.get("owner", {}).get("login", "") if isinstance(item.get("owner"), dict) else "",
                        "description": item.get("description") or "",
                        "stars": item["stargazers_count"],
                        "language": item.get("language") or "Unknown",
                        "topics": item.get("topics") or [],
                        "html_url": item["html_url"],
                        "_pillar": "github_live",
                    })
                return results
    except Exception as e:
        logger.warning(f"GitHub live search failed: {e}")
    return []


async def mongodb_text_search(db, query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Fallback: MongoDB regex search (old behavior)."""
    import re
    keywords = query.lower().split()[:5]
    if not keywords:
        return []

    text_regex = "|".join(re.escape(k) for k in keywords)
    db_query = {
        "$or": [
            {"name": {"$regex": text_regex, "$options": "i"}},
            {"description": {"$regex": text_regex, "$options": "i"}},
            {"topics": {"$in": keywords}},
            {"use_cases": {"$regex": text_regex, "$options": "i"}},
        ]
    }

    results = []
    tools = await db.tools.find(db_query, {"_id": 0}).limit(limit).to_list(limit)
    for t in tools:
        t["_pillar"] = "curated"
        results.append(t)

    if len(results) < limit:
        remaining = limit - len(results)
        gh = await db.github_repos.find(db_query, {"_id": 0}).sort("stars", -1).limit(remaining).to_list(remaining)
        for r in gh:
            r["_pillar"] = "github_cached"
            results.append(r)

    return results


def make_cache_key(query: str, page: int, per_page: int) -> str:
    """Generate cache key for search results."""
    return hashlib.sha256(f"{query}:{page}:{per_page}".encode()).hexdigest()
