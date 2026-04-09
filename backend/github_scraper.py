"""
GitHub Scraper Service for GitStack
- Fetches trending repos from GitHub
- Smart filtering with quality rules
- Tiered storage (HOT/WARM/COLD)
- Runs every 6 hours
"""

import asyncio
import httpx
import os
import re
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# GitHub API config
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")  # Optional, increases rate limit

# Quality rules
QUALITY_RULES = {
    "min_stars_trending": 100,      # Lower for trending (rising stars)
    "min_stars_search": 500,        # Higher for general search
    "min_contributors": 2,          # Not abandoned
    "last_commit_days": 180,        # Active in last 6 months
    "must_have_readme": True,
    "must_have_license": True,
}

# Categories to scrape
CATEGORIES = [
    "developer-tools", "saas", "automation", "ai", "machine-learning",
    "database", "api", "cli", "devops", "monitoring", "analytics",
    "authentication", "payments", "email", "cms", "ecommerce",
    "no-code", "low-code", "boilerplate", "starter-template",
    "open-source", "self-hosted", "productivity", "collaboration",
    "react", "nextjs", "typescript", "python", "llm", "chatbot",
    "design-system", "ui", "frontend", "data-science", "security",
    "docker", "kubernetes", "workflow", "agent", "generative-ai"
]

# Languages to track
LANGUAGES = ["", "python", "javascript", "typescript", "go", "rust", "java"]

class GitHubScraper:
    def __init__(self, db):
        self.db = db
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitStack-Scraper"
        }
        if GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {GITHUB_TOKEN}"
    
    async def scrape_trending(self, language: str = "", since: str = "daily") -> List[Dict]:
        """Scrape GitHub trending page (no API needed)"""
        url = f"https://github.com/trending/{language}?since={since}"
        repos = []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers={"User-Agent": "GitStack"}, timeout=30)
                if response.status_code != 200:
                    logger.error(f"Failed to fetch trending: {response.status_code}")
                    return repos
                
                soup = BeautifulSoup(response.text, 'html.parser')
                articles = soup.select('article.Box-row')
                
                for article in articles[:25]:  # Top 25 per language
                    try:
                        # Get repo name
                        h2 = article.select_one('h2 a')
                        if not h2:
                            continue
                        full_name = h2.get('href', '').strip('/')
                        if not full_name or '/' not in full_name:
                            continue
                        
                        # Get description
                        desc_elem = article.select_one('p')
                        description = desc_elem.get_text(strip=True) if desc_elem else ""
                        
                        # Get stars
                        stars_elem = article.select_one('a[href$="/stargazers"]')
                        stars_text = stars_elem.get_text(strip=True) if stars_elem else "0"
                        stars = self._parse_stars(stars_text)
                        
                        # Get language
                        lang_elem = article.select_one('[itemprop="programmingLanguage"]')
                        lang = lang_elem.get_text(strip=True) if lang_elem else "Unknown"
                        
                        # Get today's stars
                        today_elem = article.select_one('span.d-inline-block.float-sm-right')
                        today_stars = 0
                        if today_elem:
                            today_text = today_elem.get_text(strip=True)
                            today_match = re.search(r'([\d,]+)', today_text)
                            if today_match:
                                today_stars = int(today_match.group(1).replace(',', ''))
                        
                        repos.append({
                            "full_name": full_name,
                            "name": full_name.split('/')[-1],
                            "description": description,
                            "stars": stars,
                            "language": lang,
                            "today_stars": today_stars,
                            "trending_since": since,
                            "source": "trending"
                        })
                    except Exception as e:
                        logger.error(f"Error parsing trending repo: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error scraping trending: {e}")
        
        return repos
    
    async def search_github_api(self, query: str, max_results: int = 100) -> List[Dict]:
        """Search GitHub via API with quality filters"""
        repos = []
        per_page = min(max_results, 100)
        
        try:
            async with httpx.AsyncClient() as client:
                url = f"{GITHUB_API}/search/repositories"
                params = {
                    "q": query,
                    "sort": "stars",
                    "order": "desc",
                    "per_page": per_page
                }
                
                response = await client.get(url, headers=self.headers, params=params, timeout=30)
                if response.status_code != 200:
                    logger.error(f"GitHub API error: {response.status_code}")
                    return repos
                
                data = response.json()
                for item in data.get("items", []):
                    repos.append({
                        "full_name": item["full_name"],
                        "name": item["name"],
                        "description": item.get("description") or "",
                        "stars": item["stargazers_count"],
                        "forks": item["forks_count"],
                        "language": item.get("language") or "Unknown",
                        "topics": item.get("topics", []),
                        "html_url": item["html_url"],
                        "created_at": item["created_at"],
                        "updated_at": item["updated_at"],
                        "pushed_at": item["pushed_at"],
                        "open_issues": item["open_issues_count"],
                        "license": item.get("license", {}).get("spdx_id") if item.get("license") else None,
                        "has_readme": True,  # Assume true, verify later if needed
                        "source": "api_search"
                    })
                    
        except Exception as e:
            logger.error(f"Error searching GitHub: {e}")
        
        return repos
    
    async def get_repo_details(self, full_name: str) -> Optional[Dict]:
        """Get detailed info for a specific repo"""
        try:
            async with httpx.AsyncClient() as client:
                # Get repo info
                response = await client.get(
                    f"{GITHUB_API}/repos/{full_name}",
                    headers=self.headers,
                    timeout=30
                )
                if response.status_code != 200:
                    return None
                
                repo = response.json()
                
                # Get contributors count
                contrib_response = await client.get(
                    f"{GITHUB_API}/repos/{full_name}/contributors",
                    headers=self.headers,
                    params={"per_page": 1, "anon": "true"},
                    timeout=30
                )
                contributors = 0
                if contrib_response.status_code == 200:
                    # Check Link header for total count
                    link_header = contrib_response.headers.get("Link", "")
                    if "last" in link_header:
                        match = re.search(r'page=(\d+)>; rel="last"', link_header)
                        if match:
                            contributors = int(match.group(1))
                    else:
                        contributors = len(contrib_response.json())
                
                return {
                    "full_name": repo["full_name"],
                    "name": repo["name"],
                    "owner": repo["owner"]["login"],
                    "description": repo.get("description") or "",
                    "stars": repo["stargazers_count"],
                    "forks": repo["forks_count"],
                    "watchers": repo["watchers_count"],
                    "language": repo.get("language") or "Unknown",
                    "topics": repo.get("topics", []),
                    "html_url": repo["html_url"],
                    "homepage": repo.get("homepage"),
                    "created_at": repo["created_at"],
                    "updated_at": repo["updated_at"],
                    "pushed_at": repo["pushed_at"],
                    "open_issues": repo["open_issues_count"],
                    "license": repo.get("license", {}).get("spdx_id") if repo.get("license") else None,
                    "contributors": contributors,
                    "default_branch": repo["default_branch"],
                    "size": repo["size"],
                    "archived": repo["archived"],
                    "disabled": repo["disabled"],
                }
                
        except Exception as e:
            logger.error(f"Error getting repo details for {full_name}: {e}")
            return None
    
    def _parse_stars(self, stars_text: str) -> int:
        """Parse stars like '1.2k' to integer"""
        stars_text = stars_text.strip().lower().replace(',', '')
        if 'k' in stars_text:
            return int(float(stars_text.replace('k', '')) * 1000)
        elif 'm' in stars_text:
            return int(float(stars_text.replace('m', '')) * 1000000)
        try:
            return int(stars_text)
        except:
            return 0
    
    def calculate_score(self, repo: Dict) -> float:
        """Calculate quality score for a repo"""
        score = 0
        
        # Stars (max 40 points)
        stars = repo.get("stars", 0)
        if stars >= 10000:
            score += 40
        elif stars >= 5000:
            score += 35
        elif stars >= 1000:
            score += 30
        elif stars >= 500:
            score += 20
        elif stars >= 100:
            score += 10
        
        # Recent activity (max 20 points)
        pushed_at = repo.get("pushed_at")
        if pushed_at:
            try:
                pushed_date = datetime.fromisoformat(pushed_at.replace('Z', '+00:00'))
                days_ago = (datetime.now(timezone.utc) - pushed_date).days
                if days_ago <= 7:
                    score += 20
                elif days_ago <= 30:
                    score += 15
                elif days_ago <= 90:
                    score += 10
                elif days_ago <= 180:
                    score += 5
            except:
                pass
        
        # Today's trending stars (max 20 points)
        today_stars = repo.get("today_stars", 0)
        if today_stars >= 100:
            score += 20
        elif today_stars >= 50:
            score += 15
        elif today_stars >= 20:
            score += 10
        elif today_stars >= 5:
            score += 5
        
        # Contributors (max 10 points)
        contributors = repo.get("contributors", 0)
        if contributors >= 50:
            score += 10
        elif contributors >= 20:
            score += 7
        elif contributors >= 5:
            score += 5
        elif contributors >= 2:
            score += 2
        
        # Has license (5 points)
        if repo.get("license"):
            score += 5
        
        # Description quality (5 points)
        desc = repo.get("description", "")
        if len(desc) >= 50:
            score += 5
        elif len(desc) >= 20:
            score += 2
        
        return score
    
    def passes_quality_filter(self, repo: Dict, is_trending: bool = False) -> bool:
        """Check if repo passes quality rules"""
        min_stars = QUALITY_RULES["min_stars_trending"] if is_trending else QUALITY_RULES["min_stars_search"]
        
        if repo.get("stars", 0) < min_stars:
            return False
        
        if repo.get("archived") or repo.get("disabled"):
            return False
        
        # Check last activity
        pushed_at = repo.get("pushed_at")
        if pushed_at:
            try:
                pushed_date = datetime.fromisoformat(pushed_at.replace('Z', '+00:00'))
                days_ago = (datetime.now(timezone.utc) - pushed_date).days
                if days_ago > QUALITY_RULES["last_commit_days"]:
                    return False
            except:
                pass
        
        return True
    
    async def run_full_scrape(self) -> Dict:
        """Run complete scraping job"""
        logger.info("Starting full GitHub scrape...")
        stats = {
            "trending_fetched": 0,
            "search_fetched": 0,
            "hot_added": 0,
            "warm_added": 0,
            "total_processed": 0
        }
        
        all_repos = {}  # Dedupe by full_name
        
        # 1. Scrape trending for all languages and timeframes
        for lang in LANGUAGES:
            for since in ["daily", "weekly"]:
                logger.info(f"Scraping trending: {lang or 'all'} / {since}")
                trending = await self.scrape_trending(lang, since)
                for repo in trending:
                    if repo["full_name"] not in all_repos:
                        repo["is_trending"] = True
                        all_repos[repo["full_name"]] = repo
                        stats["trending_fetched"] += 1
                await asyncio.sleep(1)  # Rate limiting
        
        # 2. Search by categories
        date_filter = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
        for category in CATEGORIES[:20]:  # Search more categories
            query = f"topic:{category} stars:>100 pushed:>{date_filter}"
            logger.info(f"Searching: {query}")
            results = await self.search_github_api(query, max_results=50)
            for repo in results:
                if repo["full_name"] not in all_repos:
                    repo["is_trending"] = False
                    all_repos[repo["full_name"]] = repo
                    stats["search_fetched"] += 1
            await asyncio.sleep(2)  # Rate limiting
        
        # 3. Filter and score all repos
        scored_repos = []
        for repo in all_repos.values():
            if self.passes_quality_filter(repo, repo.get("is_trending", False)):
                repo["score"] = self.calculate_score(repo)
                scored_repos.append(repo)
                stats["total_processed"] += 1
        
        # 4. Sort by score
        scored_repos.sort(key=lambda x: x["score"], reverse=True)
        
        # 5. Save to database
        hot_repos = scored_repos[:500]  # Top 500 = HOT tier
        warm_repos = scored_repos[500:50000]  # Rest = WARM tier (up to 50k)
        
        # Save HOT tier with full details
        for repo in hot_repos:
            await self.save_repo(repo, tier="hot")
            stats["hot_added"] += 1
        
        # Save WARM tier with basic info
        for repo in warm_repos:
            await self.save_repo(repo, tier="warm")
            stats["warm_added"] += 1
        
        # 6. Update scrape metadata
        await self.db.scrape_metadata.update_one(
            {"_id": "last_scrape"},
            {"$set": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stats": stats
            }},
            upsert=True
        )
        
        logger.info(f"Scrape complete: {stats}")
        return stats
    
    async def save_repo(self, repo: Dict, tier: str = "warm"):
        """Save repo to database"""
        doc = {
            "repo_id": repo["full_name"].replace("/", "_").lower(),
            "full_name": repo["full_name"],
            "name": repo["name"],
            "owner": repo.get("owner") or repo["full_name"].split("/")[0],
            "description": repo.get("description", ""),
            "stars": repo.get("stars", 0),
            "forks": repo.get("forks", 0),
            "language": repo.get("language", "Unknown"),
            "topics": repo.get("topics", []),
            "html_url": repo.get("html_url") or f"https://github.com/{repo['full_name']}",
            "pushed_at": repo.get("pushed_at"),
            "license": repo.get("license"),
            "contributors": repo.get("contributors", 0),
            "score": repo.get("score", 0),
            "tier": tier,
            "is_trending": repo.get("is_trending", False),
            "today_stars": repo.get("today_stars", 0),
            "source": repo.get("source", "unknown"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "ai_description": None,  # Will be filled by AI later for HOT tier
        }
        
        await self.db.github_repos.update_one(
            {"full_name": repo["full_name"]},
            {"$set": doc},
            upsert=True
        )
    
    async def cleanup_old_repos(self, days: int = 30):
        """Remove repos not updated in X days"""
        cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        result = await self.db.github_repos.delete_many({
            "updated_at": {"$lt": cutoff},
            "tier": "warm"  # Only delete warm tier, keep hot
        })
        logger.info(f"Cleaned up {result.deleted_count} old repos")


# Standalone scraper function for cron job
async def run_scraper():
    """Run the scraper (called by scheduler)"""
    from dotenv import load_dotenv
    load_dotenv()
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    scraper = GitHubScraper(db)
    
    # Run full scrape
    stats = await scraper.run_full_scrape()
    
    # Cleanup old repos
    await scraper.cleanup_old_repos(30)
    
    client.close()
    return stats


if __name__ == "__main__":
    asyncio.run(run_scraper())
