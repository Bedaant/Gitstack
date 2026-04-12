"""
GitHub Scraper Service for GitStack
- Fetches trending repos from GitHub
- Smart filtering with quality rules
- Tiered storage (HOT/WARM/COLD)
- Runs every 6 hours
- AI-powered auto topic discovery
"""

import asyncio
import httpx
import os
import re
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup
import google.generativeai as genai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# GitHub API config
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")  # Optional, increases rate limit

# Quality rules
QUALITY_RULES = {
    "min_stars_trending": 100,      # Lower for trending (rising stars)
    "min_stars_search": 200,        # Lower to catch newer trending tools
    "min_contributors": 1,
    "last_commit_days": 365,        # Active in last 12 months
    "must_have_readme": True,
    "must_have_license": True,
}

# Expanded CATEGORIES — covers today's trending developer topics
CATEGORIES = [
    # Core dev tools
    "developer-tools", "saas", "automation", "ai", "machine-learning",
    "database", "api", "cli", "devops", "monitoring", "analytics",
    "authentication", "payments", "email", "cms", "ecommerce",
    "no-code", "low-code", "boilerplate", "starter-template",
    "open-source", "self-hosted", "productivity", "collaboration",
    "react", "nextjs", "typescript", "python", "llm", "chatbot",
    "design-system", "ui", "frontend", "data-science", "security",
    "docker", "kubernetes", "workflow", "agent", "generative-ai",

    # AI Coding Tools — Claude, Cursor, MCP
    "claude", "claude-code", "mcp", "model-context-protocol",
    "cursor", "cursor-ai", "windsurf", "aider", "codeium",
    "vscode-extension", "copilot-alternative",

    # AI Memory & Personal Knowledge Management
    "obsidian", "obsidian-plugin", "ai-memory", "mem0", "memgpt",
    "second-brain", "knowledge-graph", "personal-knowledge-management",
    "zettelkasten", "logseq", "note-taking", "pkm",

    # AI Agents & Orchestration
    "openai-agents", "multi-agent", "autonomous-agents",
    "computer-use", "browser-use", "web-agent", "agentops",
    "crewai", "autogen", "swarm",

    # Local AI / Self-hosted models
    "ollama", "vllm", "llamacpp", "lmstudio", "localai",
    "local-llm", "private-ai", "on-premise-ai",

    # AI Infrastructure
    "vercel-ai-sdk", "ai-sdk", "langfuse", "langsmith",
    "prompt-engineering", "rag", "vector-database", "embedding",
    "openrouter", "litellm", "groq",

    # Reasoning models
    "deepseek", "reasoning", "chain-of-thought", "o1",

    # Modern Dev Tooling
    "neovim", "zed", "nix", "mise", "devcontainer", "bun",
    "biome", "turbo", "pnpm",

    # Web3 & infra
    "homelab", "selfhosted", "traefik", "coolify", "portainer",

    # === Awesome lists — curated repos for every category ===
    "awesome", "awesome-list", "awesome-claude", "awesome-mcp",
    "awesome-obsidian", "awesome-chatgpt", "awesome-llm",
    "awesome-agents", "awesome-selfhosted", "awesome-cursorrules",
    "awesome-ai-tools", "awesome-generative-ai", "awesome-prompts",
    "prompt", "prompts", "prompt-library", "system-prompt",

    # === Skills, practices, templates ===
    "claude-skills", "cursor-rules", "ai-rules", "llm-rules",
    "best-practices", "cheatsheet", "starter", "cookbook",
    "examples", "tutorials", "guide", "learning",

    # === Deep Tooling Categories (Strictly Open Source / Alternatives) ===
    "text-to-speech", "speech-to-text", "voice-cloning", "elevenlabs-alternative",
    "static-analysis", "code-review", "sonarqube-alternative", "code-quality",
    "stable-diffusion", "comfyui", "midjourney-alternative", "dalle-alternative",
    "rag", "vector-database", "pinecone-alternative", "semantic-search",
    "web-scraping", "playwright", "firecrawl-alternative", "open-source-scraper",
    "api-testing", "api-gateway", "postman-alternative", "open-source-api-tool",
    "dotfiles", "terminal", "zsh", "tui", "ratatui",
    "document-ai", "ocr", "llamaparse-alternative", "open-source-ocr",
    "game-engine", "godot", "unity-alternative", "open-source-game-engine",
    "observability", "sentry-alternative", "datadog-alternative", "uptime"
]

# Languages to track
LANGUAGES = ["", "python", "javascript", "typescript", "go", "rust", "java", "swift", "kotlin"]

# New auto-discovered topic TTL (days)
AUTO_TOPIC_TTL_DAYS = 7


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
                        h2 = article.select_one('h2 a')
                        if not h2:
                            continue
                        full_name = h2.get('href', '').strip('/')
                        if not full_name or '/' not in full_name:
                            continue

                        desc_elem = article.select_one('p')
                        description = desc_elem.get_text(strip=True) if desc_elem else ""

                        stars_elem = article.select_one('a[href$="/stargazers"]')
                        stars_text = stars_elem.get_text(strip=True) if stars_elem else "0"
                        stars = self._parse_stars(stars_text)

                        lang_elem = article.select_one('[itemprop="programmingLanguage"]')
                        lang = lang_elem.get_text(strip=True) if lang_elem else "Unknown"

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
                    logger.error(f"GitHub API error: {response.status_code} for query: {query}")
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
                        "has_readme": True,
                        "source": "api_search"
                    })

        except Exception as e:
            logger.error(f"Error searching GitHub: {e}")

        return repos

    async def get_repo_details(self, full_name: str) -> Optional[Dict]:
        """Get detailed info for a specific repo"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{GITHUB_API}/repos/{full_name}",
                    headers=self.headers,
                    timeout=30
                )
                if response.status_code != 200:
                    return None

                repo = response.json()

                contrib_response = await client.get(
                    f"{GITHUB_API}/repos/{full_name}/contributors",
                    headers=self.headers,
                    params={"per_page": 1, "anon": "true"},
                    timeout=30
                )
                contributors = 0
                if contrib_response.status_code == 200:
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

        today_stars = repo.get("today_stars", 0)
        if today_stars >= 100:
            score += 20
        elif today_stars >= 50:
            score += 15
        elif today_stars >= 20:
            score += 10
        elif today_stars >= 5:
            score += 5

        contributors = repo.get("contributors", 0)
        if contributors >= 50:
            score += 10
        elif contributors >= 20:
            score += 7
        elif contributors >= 5:
            score += 5
        elif contributors >= 2:
            score += 2

        if repo.get("license"):
            score += 5

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

    async def discover_and_create_topics(self, scraped_repos: List[Dict]):
        """
        Use Gemini AI to detect emerging topic clusters from the freshly scraped repos
        and auto-create them as new topics in the database (with a 7-day TTL).
        """
        if not scraped_repos:
            return

        # Build a compact summary of the top 60 trending repos
        top_repos = sorted(scraped_repos, key=lambda r: r.get("today_stars", 0) + r.get("stars", 0), reverse=True)[:60]
        repo_summaries = "\n".join([
            f"- {r['name']}: {r.get('description', '')[:100]} [topics: {', '.join(r.get('topics', [])[:5])}]"
            for r in top_repos
        ])

        # Get existing topic IDs so we don't duplicate them
        existing_topics = await self.db.topics.find({}, {"_id": 0, "topic_id": 1, "name": 1}).to_list(100)
        existing_ids = {t["topic_id"] for t in existing_topics}
        existing_names = [t["name"] for t in existing_topics]

        prompt = f"""You are analyzing what's trending on GitHub right now for developers.

Here are the top trending repositories this cycle:
{repo_summaries}

Existing topic categories we already have: {', '.join(existing_names)}

Identify 3-5 DISTINCT, EMERGING technology clusters in the data above that are NOT already covered by our existing categories.
Focus on specific, concrete trends that developers are clearly flocking to right now (e.g., "Claude MCP Tools", "AI Memory Systems", "Local LLM Runners", "Vibe Coding Tools").

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {{
    "id": "kebab-case-id",
    "name": "Human Readable Name (max 3 words)",
    "icon": "one of: Bot, Zap, Brain, Code, Terminal, Server, Database, Globe, Sparkles, Cpu, Network, Shield",
    "color": "one of: text-blue-600, text-purple-600, text-green-600, text-orange-600, text-pink-600, text-cyan-600, text-red-600, text-yellow-600",
    "bg_color": "one of: bg-blue-100, bg-purple-100, bg-green-100, bg-orange-100, bg-pink-100, bg-cyan-100, bg-red-100, bg-yellow-100",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }}
]

Only return clusters that are genuinely distinct trends with clear evidence in the repo list above. If fewer than 3 emerge clearly, return fewer."""

        try:
            genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction="You are a developer trend analyst. Return only valid JSON arrays."
            )
            response = await model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            raw = response.text.strip()
            # Strip markdown if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
            new_topics = json.loads(raw)
        except Exception as e:
            logger.error(f"AI topic discovery failed: {e}")
            return

        now = datetime.now(timezone.utc).isoformat()
        expires_at = (datetime.now(timezone.utc) + timedelta(days=AUTO_TOPIC_TTL_DAYS)).isoformat()
        created_count = 0

        for topic in new_topics:
            topic_id = topic.get("id", "").lower().replace(" ", "-")
            if not topic_id or topic_id in existing_ids:
                continue  # Skip duplicates

            topic_doc = {
                "topic_id": topic_id,
                "name": topic.get("name", topic_id),
                "icon": topic.get("icon", "Sparkles"),
                "color": topic.get("color", "text-purple-600"),
                "bg_color": topic.get("bg_color", "bg-purple-100"),
                "tool_count": 0,
                "auto_discovered": True,
                "keywords": topic.get("keywords", []),
                "created_at": now,
                "expires_at": expires_at,
            }

            await self.db.topics.update_one(
                {"topic_id": topic_id},
                {"$set": topic_doc},
                upsert=True
            )
            # Also store keywords in a separate collection for route lookup
            await self.db.auto_topic_keywords.update_one(
                {"topic_id": topic_id},
                {"$set": {"topic_id": topic_id, "keywords": topic.get("keywords", []), "expires_at": expires_at}},
                upsert=True
            )
            existing_ids.add(topic_id)
            created_count += 1
            logger.info(f"Auto-created topic: {topic.get('name')} [{topic_id}]")

        logger.info(f"AI topic discovery: {created_count} new topics created")

    async def expire_old_auto_topics(self):
        """Remove auto-discovered topics that have passed their TTL"""
        now = datetime.now(timezone.utc).isoformat()
        result = await self.db.topics.delete_many({
            "auto_discovered": True,
            "expires_at": {"$lt": now}
        })
        await self.db.auto_topic_keywords.delete_many({
            "expires_at": {"$lt": now}
        })
        if result.deleted_count > 0:
            logger.info(f"Expired {result.deleted_count} old auto-discovered topics")

    async def run_full_scrape(self) -> Dict:
        """Run complete scraping job"""
        logger.info("Starting full GitHub scrape...")
        stats = {
            "trending_fetched": 0,
            "search_fetched": 0,
            "hot_added": 0,
            "warm_added": 0,
            "total_processed": 0,
            "auto_topics_created": 0,
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

        # 2. Search by categories — all of the expanded list
        date_filter = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
        for category in CATEGORIES:
            query = f"topic:{category} stars:>50 pushed:>{date_filter}"
            logger.info(f"Searching: {query}")
            results = await self.search_github_api(query, max_results=50)
            for repo in results:
                if repo["full_name"] not in all_repos:
                    repo["is_trending"] = False
                    all_repos[repo["full_name"]] = repo
                    stats["search_fetched"] += 1
            await asyncio.sleep(1)  # Rate limiting

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
        hot_repos = scored_repos[:500]   # Top 500 = HOT tier
        warm_repos = scored_repos[500:]  # Rest = WARM tier

        for repo in hot_repos:
            await self.save_repo(repo, tier="hot")
            stats["hot_added"] += 1

        for repo in warm_repos:
            await self.save_repo(repo, tier="warm")
            stats["warm_added"] += 1

        # 6. AI auto-discover new topic clusters from trending repos
        try:
            trending_repos = [r for r in scored_repos if r.get("is_trending")]
            await self.discover_and_create_topics(trending_repos or scored_repos[:80])
        except Exception as e:
            logger.error(f"Auto topic discovery error: {e}")

        # 7. Expire old auto-topics
        await self.expire_old_auto_topics()

        # 8. Update scrape metadata
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
            "ai_description": None,
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

    stats = await scraper.run_full_scrape()
    await scraper.cleanup_old_repos(30)

    client.close()
    return stats


if __name__ == "__main__":
    asyncio.run(run_scraper())
