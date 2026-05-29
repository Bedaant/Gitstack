"""
GitHub Scraper Service for GitStack
- Fetches trending repos from GitHub
- Smart filtering with quality rules
- Tiered storage (HOT/WARM/COLD)
- Runs every 6 hours
- AI-powered auto topic discovery
- AI repo classification (complete_solution vs building_block)
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def call_ai_scraper(prompt: str, json_response: bool = False) -> str:
    """NVIDIA NIM + Groq fallback for scraper (avoids circular import with server.py)."""
    last_error = None

    nvidia_key = os.environ.get("NVIDIA_NIM_API_KEY")
    if nvidia_key:
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {nvidia_key}", "Content-Type": "application/json"}
            messages = [
                {"role": "system", "content": "You are a developer trend analyst. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ]
            payload = {
                "model": "meta/llama-3.3-70b-instruct",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            last_error = e
            logger.warning(f"NVIDIA NIM scraper failed: {e}")

    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            messages = [
                {"role": "system", "content": "You are a developer trend analyst. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ]
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            last_error = e
            logger.error(f"Groq scraper fallback failed: {e}")

    raise Exception(f"All AI providers failed for scraper. Last error: {last_error}")


# GitHub API config
GITHUB_API = "https://api.github.com"
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")  # Optional, increases rate limit

# Quality rules
QUALITY_RULES = {
    "min_stars_trending": 50,       # Lowered: catch rising stars earlier
    "min_stars_search": 50,         # Lowered: catch more breadth in warm tier
    "min_contributors": 1,
    "last_commit_days": 730,        # Extended to 2 years for still-relevant repos
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

    # === Voice AI & Telephony ===
    "voice-agent", "ai-calling", "phone-agent", "sales-dialer",
    "outbound-calling", "inbound-calling", "twilio-alternative", "webrtc-server",
    "ivr", "call-center", "ai-phone", "voicebot", "sip-trunk", "pbx",
    "telephony", "voip", "realtime-voice", "speech-to-text", "text-to-speech",

    # === Deep Tooling Categories (Strictly Open Source / Alternatives) ===
    "voice-cloning", "elevenlabs-alternative",
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
LANGUAGES = ["", "python", "javascript", "typescript", "go", "rust", "java", "swift", "kotlin", "c", "cpp", "csharp", "ruby", "php"]

# Star-range splits for deeper API search coverage
STAR_RANGES = ["50..500", "500..2000", "2000..10000", "10000..100000"]

# Curated awesome-lists to mine for repo links
AWESOME_LISTS = [
    "sindresorhus/awesome",
    "awesome-selfhosted/awesome-selfhosted",
    "trimstray/the-book-of-secret-knowledge",
    "avelino/awesome-go",
    "vinta/awesome-python",
    "sorrycc/awesome-javascript",
    "dypsilon/frontend-dev-bookmarks",
    "enaqx/awesome-react",
    "uhub/awesome-rust",
    "agarrharr/awesome-cli-apps",
    "jondot/awesome-devenv",
    "veggiemonk/awesome-docker",
    "academic/awesome-datascience",
    "josephmisiti/awesome-machine-learning",
    "parro-it/awesome-micro-npm-packages",
    "webpro/awesome-dotfiles",
]

# New auto-discovered topic TTL (days)
AUTO_TOPIC_TTL_DAYS = 7

# Classification refresh interval (days) — only re-classify after this period
CLASSIFICATION_REFRESH_DAYS = 14

# Minimum stars for AI classification (saves Gemini API calls)
CLASSIFICATION_MIN_STARS = 100


class GitHubScraper:
    def __init__(self, db):
        self.db = db
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitStack-Scraper"
        }
        if GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {GITHUB_TOKEN}"
        # Shared async client with connection pooling for all GitHub API calls
        self._client = httpx.AsyncClient(
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            timeout=httpx.Timeout(30.0),
        )
        self._sem = asyncio.Semaphore(int(os.environ.get("SCRAPER_CONCURRENCY", 25)))

    async def close(self):
        await self._client.aclose()

    async def _github_get(self, url: str, params: Optional[Dict] = None, retries: int = 3) -> Optional[httpx.Response]:
        """GitHub API GET with exponential backoff on rate-limit / server errors."""
        for attempt in range(retries):
            try:
                resp = await self._client.get(url, headers=self.headers, params=params, timeout=30)
                if resp.status_code == 200:
                    return resp
                if resp.status_code in (403, 429):
                    sleep = 2 ** attempt
                    logger.warning(f"GitHub rate-limit hit, sleeping {sleep}s (attempt {attempt + 1})")
                    await asyncio.sleep(sleep)
                elif resp.status_code >= 500:
                    await asyncio.sleep(1)
                else:
                    return resp
            except Exception as e:
                logger.warning(f"GitHub GET error ({url}): {e}")
                await asyncio.sleep(1)
        return None

    async def batch_get_repo_details(self, full_names: List[str]) -> List[Dict]:
        """Fetch details for multiple repos in parallel with semaphore."""
        async def _fetch_one(full_name: str) -> Optional[Dict]:
            async with self._sem:
                return await self.get_repo_details(full_name)

        results = await asyncio.gather(*[_fetch_one(fn) for fn in full_names], return_exceptions=True)
        return [r for r in results if isinstance(r, dict)]

    async def _persist_scraper_state(self, stats: Dict):
        """Persist scraper run statistics for observability."""
        try:
            await self.db.scrape_metadata.update_one(
                {"key": "last_run"},
                {"$set": {
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "stats": stats,
                }},
                upsert=True,
            )
        except Exception as e:
            logger.warning(f"Failed to persist scraper state: {e}")

    async def scrape_trending(self, language: str = "", since: str = "daily") -> List[Dict]:
        """Scrape GitHub trending page (no API needed)"""
        url = f"https://github.com/trending/{language}?since={since}"
        repos = []

        try:
            response = await self._client.get(url, headers={"User-Agent": "GitStack"}, timeout=30)
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

    async def search_github_api(self, query: str, max_results: int = 300) -> List[Dict]:
        """Search GitHub via API with quality filters — now with pagination"""
        repos = []
        per_page = 100
        max_pages = min(max_results // per_page, 10)  # GitHub caps at 1000 total

        try:
            for page in range(1, max_pages + 1):
                url = f"{GITHUB_API}/search/repositories"
                params = {
                    "q": query,
                    "sort": "stars",
                    "order": "desc",
                    "per_page": per_page,
                    "page": page,
                }

                response = await self._github_get(url, params=params)
                if response is None or response.status_code != 200:
                    if response:
                        logger.error(f"GitHub API error: {response.status_code} for query: {query} page {page}")
                    break

                data = response.json()
                items = data.get("items", [])
                if not items:
                    break

                for item in items:
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

                await asyncio.sleep(0.5)  # Gentle rate-limit between pages

        except Exception as e:
            logger.error(f"Error searching GitHub: {e}")

        return repos

    async def get_repo_details(self, full_name: str) -> Optional[Dict]:
        """Get detailed info for a specific repo"""
        try:
            response = await self._github_get(f"{GITHUB_API}/repos/{full_name}")
            if response is None or response.status_code != 200:
                return None

            repo = response.json()

            contrib_response = await self._github_get(
                f"{GITHUB_API}/repos/{full_name}/contributors",
                params={"per_page": 1, "anon": "true"},
            )
            contributors = 0
            if contrib_response and contrib_response.status_code == 200:
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
            raw = await call_ai_scraper(prompt, json_response=True)
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

    async def mine_awesome_lists(self) -> List[Dict]:
        """Mine curated awesome-lists for GitHub repo links."""
        repos = []
        for awesome_repo in AWESOME_LISTS:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{GITHUB_API}/repos/{awesome_repo}/readme",
                        headers=self.headers, timeout=30
                    )
                    if response.status_code != 200:
                        continue
                    import base64
                    content = base64.b64decode(response.json().get("content", "")).decode("utf-8", errors="ignore")
                    # Extract GitHub repo links
                    import re as re_mod
                    links = re_mod.findall(r'https?://github\.com/([\w\-]+/[\w\-.]+)', content)
                    unique_links = list(set(links))[:50]  # Cap per awesome-list
                    for full_name in unique_links:
                        # Clean trailing characters
                        full_name = full_name.rstrip('.)')
                        if '/' not in full_name or full_name.count('/') != 1:
                            continue
                        repos.append({
                            "full_name": full_name,
                            "name": full_name.split("/")[-1],
                            "description": "",
                            "stars": 0,
                            "language": "Unknown",
                            "source": "awesome_list",
                            "is_trending": False,
                        })
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"Error mining {awesome_repo}: {e}")
        logger.info(f"Mined {len(repos)} repos from awesome-lists")
        return repos

    async def run_full_scrape(self) -> Dict:
        """Run complete scraping job — scaled for 15-20K repos"""
        logger.info("Starting full GitHub scrape (scaled)...")
        stats = {
            "trending_fetched": 0,
            "search_fetched": 0,
            "star_range_fetched": 0,
            "awesome_list_fetched": 0,
            "hot_added": 0,
            "warm_added": 0,
            "total_processed": 0,
            "auto_topics_created": 0,
            "repos_classified": 0,
        }

        all_repos = {}  # Dedupe by full_name

        # 1. Scrape trending for all languages and timeframes
        async def fetch_trending(lang, since):
            async with self._sem:
                return await self.scrape_trending(lang, since)

        trending_tasks = [
            fetch_trending(lang, since)
            for lang in LANGUAGES for since in ["daily", "weekly"]
        ]
        trending_results = await asyncio.gather(*trending_tasks, return_exceptions=True)
        for result in trending_results:
            if isinstance(result, list):
                for repo in result:
                    if repo["full_name"] not in all_repos:
                        repo["is_trending"] = True
                        all_repos[repo["full_name"]] = repo
                        stats["trending_fetched"] += 1

        # 2. Search by categories — parallel with semaphore
        date_filter = (datetime.now() - timedelta(days=730)).strftime("%Y-%m-%d")

        async def fetch_category(category):
            async with self._sem:
                query = f"topic:{category} stars:>50 pushed:>{date_filter}"
                results = await self.search_github_api(query, max_results=1000)
                await asyncio.sleep(0.3)
                return results

        cat_tasks = [fetch_category(cat) for cat in CATEGORIES]
        cat_results = await asyncio.gather(*cat_tasks, return_exceptions=True)
        for result in cat_results:
            if isinstance(result, list):
                for repo in result:
                    if repo["full_name"] not in all_repos:
                        repo["is_trending"] = False
                        all_repos[repo["full_name"]] = repo
                        stats["search_fetched"] += 1

        # 3. Star-range splits for deeper coverage
        top_categories = CATEGORIES[:30]  # Top 30 categories for range splits

        async def fetch_star_range(category, star_range):
            async with self._sem:
                query = f"topic:{category} stars:{star_range} pushed:>{date_filter}"
                results = await self.search_github_api(query, max_results=1000)
                await asyncio.sleep(0.3)
                return results

        range_tasks = [
            fetch_star_range(cat, sr)
            for cat in top_categories for sr in STAR_RANGES
        ]
        range_results = await asyncio.gather(*range_tasks, return_exceptions=True)
        for result in range_results:
            if isinstance(result, list):
                for repo in result:
                    if repo["full_name"] not in all_repos:
                        repo["is_trending"] = False
                        all_repos[repo["full_name"]] = repo
                        stats["star_range_fetched"] += 1

        # 4. Mine awesome-lists for repo links
        try:
            awesome_repos = await self.mine_awesome_lists()
            for repo in awesome_repos:
                if repo["full_name"] not in all_repos:
                    all_repos[repo["full_name"]] = repo
                    stats["awesome_list_fetched"] += 1
        except Exception as e:
            logger.error(f"Awesome-list mining error: {e}")

        # 5. Enrich awesome-list repos with API data (parallel)
        needs_enrichment = [
            fn for fn, r in all_repos.items()
            if r.get("source") == "awesome_list" and r.get("stars", 0) == 0
        ]

        async def enrich_repo(full_name):
            async with self._sem:
                details = await self.get_repo_details(full_name)
                await asyncio.sleep(0.3)
                return full_name, details

        # Enrich up to 200 awesome-list repos (rate limit aware)
        enrich_tasks = [enrich_repo(fn) for fn in needs_enrichment[:200]]
        enrich_results = await asyncio.gather(*enrich_tasks, return_exceptions=True)
        for result in enrich_results:
            if isinstance(result, tuple):
                fn, details = result
                if details and fn in all_repos:
                    all_repos[fn].update(details)

        # 6. Filter and score all repos
        scored_repos = []
        for repo in all_repos.values():
            if self.passes_quality_filter(repo, repo.get("is_trending", False)):
                repo["score"] = self.calculate_score(repo)
                scored_repos.append(repo)
                stats["total_processed"] += 1

        # 7. Sort by score
        scored_repos.sort(key=lambda x: x["score"], reverse=True)

        # 8. Save to database
        hot_repos = scored_repos[:2000]   # Top 2000 = HOT tier
        warm_repos = scored_repos[2000:]  # Rest = WARM tier

        for repo in hot_repos:
            await self.save_repo(repo, tier="hot")
            stats["hot_added"] += 1

        for repo in warm_repos:
            await self.save_repo(repo, tier="warm")
            stats["warm_added"] += 1

        # 9. AI auto-discover new topic clusters from trending repos
        try:
            trending_repos = [r for r in scored_repos if r.get("is_trending")]
            await self.discover_and_create_topics(trending_repos or scored_repos[:80])
        except Exception as e:
            logger.error(f"Auto topic discovery error: {e}")

        # 9.5 AI-classify repos as complete_solution vs building_block
        try:
            classified = await self.classify_repos_batch(scored_repos)
            stats["repos_classified"] = classified
        except Exception as e:
            logger.error(f"Repo classification error: {e}")
            stats["repos_classified"] = 0

        # 10. Expire old auto-topics
        await self.expire_old_auto_topics()

        # 10.5 Ensure indexes for Solution Finder
        await self.ensure_indexes()

        # 11. Update scrape metadata
        await self.db.scrape_metadata.update_one(
            {"_id": "last_scrape"},
            {"$set": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "stats": stats,
            }},
            upsert=True
        )

        logger.info(f"Scrape complete: {stats}")
        return stats

    def detect_docker_support(self, repo: Dict) -> bool:
        """Lightweight heuristic: does this repo likely support Docker?"""
        topics = [t.lower() for t in repo.get("topics", [])]
        desc = (repo.get("description") or "").lower()
        name = (repo.get("name") or "").lower()
        docker_signals = ["docker", "container", "docker-compose", "dockerfile", "kubernetes", "k8s", "helm"]
        return any(s in topics or s in desc or s in name for s in docker_signals)

    def calculate_health_score(self, repo: Dict) -> int:
        """Calculate a 0-100 health score for a repo."""
        score = 0
        pushed_at = repo.get("pushed_at")
        if pushed_at:
            try:
                pushed_date = datetime.fromisoformat(pushed_at.replace('Z', '+00:00'))
                days = (datetime.now(timezone.utc) - pushed_date).days
                if days <= 7: score += 30
                elif days <= 30: score += 25
                elif days <= 90: score += 15
                elif days <= 180: score += 8
            except Exception:
                pass
        stars = repo.get("stars", 0)
        if stars >= 5000: score += 25
        elif stars >= 1000: score += 20
        elif stars >= 500: score += 15
        elif stars >= 100: score += 10
        contributors = repo.get("contributors", 0)
        if contributors >= 50: score += 25
        elif contributors >= 10: score += 20
        elif contributors >= 3: score += 12
        elif contributors >= 1: score += 5
        if repo.get("license"): score += 10
        if not repo.get("archived", False): score += 10
        return min(score, 100)

    async def classify_repos_batch(self, repos: List[Dict]) -> int:
        """
        AI-classify repos as complete_solution or building_block.
        Runs in batches of 10 per Gemini call. Only classifies repos with
        200+ stars that haven't been classified in the last 14 days.
        Returns count of repos classified.
        """
        now = datetime.now(timezone.utc)
        refresh_cutoff = (now - timedelta(days=CLASSIFICATION_REFRESH_DAYS)).isoformat()

        # Find repos needing classification
        needs_classification = []
        for repo in repos:
            if repo.get("stars", 0) < CLASSIFICATION_MIN_STARS:
                continue
            # Check if already classified recently
            existing = await self.db.github_repos.find_one(
                {"full_name": repo["full_name"]},
                {"_id": 0, "classified_at": 1}
            )
            if existing and existing.get("classified_at") and existing["classified_at"] > refresh_cutoff:
                continue
            needs_classification.append(repo)

        if not needs_classification:
            logger.info("No repos need classification")
            return 0

        logger.info(f"Classifying {len(needs_classification)} repos in batches of 10...")
        classified_count = 0
        batch_size = 10


        for i in range(0, len(needs_classification), batch_size):
            batch = needs_classification[i:i + batch_size]
            batch_summaries = []
            for r in batch:
                topics_str = ", ".join(r.get("topics", [])[:8])
                batch_summaries.append(
                    f"- {r['full_name']}: {r.get('description', '')[:150]} "
                    f"[topics: {topics_str}] [stars: {r.get('stars', 0)}] "
                    f"[language: {r.get('language', 'Unknown')}]"
                )

            prompt = f"""Classify each GitHub repository below for a non-technical founder who wants to clone and run it.

For EACH repo, determine:
1. repo_type: 
   - "complete_solution" = the founder can git clone, follow a README, and have a working product WITHOUT writing integration code. This includes: full apps, SaaS templates, boilerplates with backend+frontend, agent frameworks with built-in UI, voice bot templates, CRM apps, dashboard starters, anything with `docker-compose up` or `npm start` that just works.
   - "building_block" = a library, SDK, or low-level tool that requires the founder to write code to use it (e.g. a Python package, a React component library, a WebRTC server without a UI).
   BE GENEROUS with complete_solution. If it has a UI, a backend, or clear setup scripts, it's a complete_solution even if it calls itself a "toolkit" or "framework".

2. use_cases: 2-5 specific business use cases (e.g. "AI voice calling", "SEO content generation", "LinkedIn outreach", "invoice management", "CRM", "sales dialer")
3. replaces_saas: 1-3 paid SaaS products it replaces (e.g. "Apollo.io", "HubSpot", "Twilio", "Vapi"). Use empty array if none.
4. has_docker: true/false — does it mention Docker, docker-compose, or containerization?
5. has_api: true/false — does it expose REST/GraphQL/WebSocket APIs?
6. has_ui: true/false — does it have a web dashboard, admin panel, or user interface?
7. complementary_tools: 1-3 types of tools that complement this (e.g. "analytics", "database", "auth", "email", "payments")

Repos to classify:
{chr(10).join(batch_summaries)}

Return ONLY a valid JSON array (no markdown) with one object per repo:
[{{{{
  "full_name": "owner/repo",
  "repo_type": "complete_solution",
  "use_cases": ["use case 1", "use case 2"],
  "replaces_saas": ["SaaS1"],
  "has_docker": true,
  "has_api": true,
  "has_ui": true,
  "complementary_tools": ["analytics", "database"]
}}}}]"""

            try:
                raw = await call_ai_scraper(prompt, json_response=True)
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
                classifications = json.loads(raw)

                for cls in classifications:
                    fn = cls.get("full_name", "")
                    if not fn:
                        continue
                    # Find the matching repo for docker heuristic fallback
                    matching = next((r for r in batch if r["full_name"] == fn), None)
                    docker_heuristic = self.detect_docker_support(matching) if matching else False

                    update_fields = {
                        "repo_type": cls.get("repo_type", "building_block"),
                        "use_cases": cls.get("use_cases", []),
                        "replaces_saas": cls.get("replaces_saas", []),
                        "has_docker": cls.get("has_docker", docker_heuristic),
                        "has_api": cls.get("has_api", False),
                        "has_ui": cls.get("has_ui", False),
                        "complementary_tools": cls.get("complementary_tools", []),
                        "health_score": self.calculate_health_score(matching) if matching else 0,
                        "classified_at": now.isoformat(),
                    }
                    await self.db.github_repos.update_one(
                        {"full_name": fn},
                        {"$set": update_fields}
                    )
                    classified_count += 1

                logger.info(f"Classified batch {i // batch_size + 1}: {len(classifications)} repos")
                await asyncio.sleep(1)  # Rate limit between batches

            except Exception as e:
                logger.error(f"Classification batch {i // batch_size + 1} failed: {e}")
                continue

        logger.info(f"Classification complete: {classified_count} repos classified")
        return classified_count

    async def ensure_indexes(self):
        """Create MongoDB indexes for Solution Finder queries."""
        try:
            await self.db.github_repos.create_index([("repo_type", 1), ("stars", -1)])
            await self.db.github_repos.create_index([("use_cases", 1)])
            await self.db.github_repos.create_index([("replaces_saas", 1)])
            await self.db.github_repos.create_index([("classified_at", 1)])
            # Upvotes collection
            await self.db.repo_upvotes.create_index(
                [("full_name", 1), ("user_id", 1)], unique=True
            )
            logger.info("Solution Finder indexes ensured")
        except Exception as e:
            logger.error(f"Index creation error: {e}")

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

        # Preserve existing classification fields (don't overwrite with None)
        await self.db.github_repos.update_one(
            {"full_name": repo["full_name"]},
            {"$set": doc, "$setOnInsert": {
                "repo_type": None,
                "use_cases": [],
                "replaces_saas": [],
                "has_docker": self.detect_docker_support(repo),
                "has_api": False,
                "has_ui": False,
                "complementary_tools": [],
                "health_score": 0,
                "classified_at": None,
                "upvotes": 0,
            }},
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
