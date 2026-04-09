"""
Smart Search Service for GitStack
- AI-powered query understanding
- Semantic search across repos
- Hybrid: curated DB + live GitHub API
"""

import os
import re
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.llm.chat import LlmChat, UserMessage
import httpx

logger = logging.getLogger(__name__)

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')


class SmartSearch:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def search(
        self,
        query: str,
        limit: int = 20,
        include_github_live: bool = True
    ) -> Dict:
        """
        Main search function - combines AI understanding, local DB, and live GitHub
        """
        # 1. AI understands the query
        parsed = await self._parse_query(query)
        
        # 2. Search our database first (fast)
        db_results = await self._search_database(parsed, limit=limit)
        
        # 3. If not enough results, search GitHub live
        github_results = []
        if include_github_live and len(db_results) < limit:
            github_results = await self._search_github_live(parsed, limit=limit - len(db_results))
        
        # 4. Merge and dedupe results
        all_results = self._merge_results(db_results, github_results)
        
        # 5. AI ranks and explains top results
        if all_results:
            all_results = await self._rank_and_explain(all_results[:limit], query)
        
        return {
            "query": query,
            "parsed_query": parsed,
            "results": all_results,
            "total_from_db": len(db_results),
            "total_from_github": len(github_results),
        }
    
    async def _parse_query(self, query: str) -> Dict:
        """Use AI to understand what the user is looking for"""
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"search_{hash(query) % 10000}",
                system_message="You parse user search queries for GitHub tools."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            prompt = f"""Parse this search query for GitHub tools: "{query}"

Return ONLY valid JSON (no markdown):
{{
  "intent": "build|find_alternative|solve_problem|learn",
  "keywords": ["keyword1", "keyword2"],
  "categories": ["saas", "ai", "automation", etc],
  "languages": ["python", "javascript", etc] or [],
  "alternative_to": "tool name if looking for alternative" or null,
  "github_search_query": "optimized GitHub search query",
  "similar_tools": ["tool1", "tool2"] if mentioned
}}"""
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            # Parse JSON from response
            import json
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Error parsing query: {e}")
            # Fallback to basic parsing
            return {
                "intent": "find",
                "keywords": query.lower().split(),
                "categories": [],
                "languages": [],
                "alternative_to": None,
                "github_search_query": query,
                "similar_tools": []
            }
    
    async def _search_database(self, parsed: Dict, limit: int = 20) -> List[Dict]:
        """Search our curated database"""
        results = []
        
        # Build MongoDB query
        query_conditions = []
        
        # Text search on name and description
        keywords = parsed.get("keywords", [])
        if keywords:
            text_regex = "|".join(re.escape(k) for k in keywords)
            query_conditions.append({
                "$or": [
                    {"name": {"$regex": text_regex, "$options": "i"}},
                    {"description": {"$regex": text_regex, "$options": "i"}},
                    {"topics": {"$in": keywords}}
                ]
            })
        
        # Category filter
        categories = parsed.get("categories", [])
        if categories:
            query_conditions.append({"topics": {"$in": categories}})
        
        # Language filter
        languages = parsed.get("languages", [])
        if languages:
            query_conditions.append({"language": {"$in": [l.capitalize() for l in languages]}})
        
        # Build final query
        mongo_query = {"$and": query_conditions} if query_conditions else {}
        
        # Search github_repos collection
        cursor = self.db.github_repos.find(
            mongo_query,
            {"_id": 0}
        ).sort("score", -1).limit(limit)
        
        async for doc in cursor:
            doc["source"] = "database"
            results.append(doc)
        
        # Also search curated tools collection
        cursor = self.db.tools.find(
            mongo_query if query_conditions else {},
            {"_id": 0}
        ).limit(limit - len(results))
        
        async for doc in cursor:
            doc["source"] = "curated"
            doc["full_name"] = doc.get("github_url", "").replace("https://github.com/", "")
            results.append(doc)
        
        return results
    
    async def _search_github_live(self, parsed: Dict, limit: int = 10) -> List[Dict]:
        """Search GitHub API for live results"""
        results = []
        
        github_query = parsed.get("github_search_query", "")
        if not github_query:
            return results
        
        # Add quality filters to query
        search_query = f"{github_query} stars:>100"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.github.com/search/repositories",
                    params={
                        "q": search_query,
                        "sort": "stars",
                        "order": "desc",
                        "per_page": limit
                    },
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "GitStack"
                    },
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        results.append({
                            "repo_id": item["full_name"].replace("/", "_").lower(),
                            "full_name": item["full_name"],
                            "name": item["name"],
                            "description": item.get("description") or "",
                            "stars": item["stargazers_count"],
                            "forks": item["forks_count"],
                            "language": item.get("language") or "Unknown",
                            "topics": item.get("topics", []),
                            "html_url": item["html_url"],
                            "source": "github_live"
                        })
        except Exception as e:
            logger.error(f"GitHub live search error: {e}")
        
        return results
    
    def _merge_results(self, db_results: List[Dict], github_results: List[Dict]) -> List[Dict]:
        """Merge and dedupe results, prioritizing curated"""
        seen = set()
        merged = []
        
        # Add DB results first (higher priority)
        for r in db_results:
            key = r.get("full_name") or r.get("name", "")
            if key and key not in seen:
                seen.add(key)
                merged.append(r)
        
        # Add GitHub results if not already present
        for r in github_results:
            key = r.get("full_name") or r.get("name", "")
            if key and key not in seen:
                seen.add(key)
                merged.append(r)
        
        return merged
    
    async def _rank_and_explain(self, results: List[Dict], original_query: str) -> List[Dict]:
        """AI ranks results and adds plain English explanations"""
        if not results:
            return results
        
        # For now, just sort by stars and add basic explanation
        # Full AI ranking can be expensive, so we do it selectively
        sorted_results = sorted(results, key=lambda x: x.get("stars", 0), reverse=True)
        
        for i, r in enumerate(sorted_results):
            r["rank"] = i + 1
            # Add quick explanation if not already present
            if not r.get("ai_description") and r.get("description"):
                r["quick_explanation"] = r["description"]
        
        return sorted_results
    
    async def translate_repo(self, full_name: str) -> Dict:
        """Get full AI translation for a specific repo"""
        # Check cache first
        cached = await self.db.repo_translations.find_one(
            {"full_name": full_name},
            {"_id": 0}
        )
        
        if cached:
            return cached
        
        # Fetch repo details from GitHub
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.github.com/repos/{full_name}",
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "GitStack"
                    },
                    timeout=15
                )
                
                if response.status_code != 200:
                    return {"error": "Repo not found"}
                
                repo = response.json()
                
                # Get README
                readme_response = await client.get(
                    f"https://api.github.com/repos/{full_name}/readme",
                    headers={
                        "Accept": "application/vnd.github.v3+json",
                        "User-Agent": "GitStack"
                    },
                    timeout=15
                )
                
                readme_content = ""
                if readme_response.status_code == 200:
                    import base64
                    readme_data = readme_response.json()
                    if readme_data.get("encoding") == "base64":
                        readme_content = base64.b64decode(readme_data.get("content", "")).decode("utf-8", errors="ignore")
                        readme_content = readme_content[:5000]  # Limit size
        
        except Exception as e:
            logger.error(f"Error fetching repo {full_name}: {e}")
            return {"error": str(e)}
        
        # AI translation
        try:
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"translate_{hash(full_name) % 10000}",
                system_message="You explain GitHub repos in simple terms for non-technical founders."
            ).with_model("gemini", "gemini-3-flash-preview")
            
            prompt = f"""Explain this GitHub repo for a non-technical founder:

Repo: {full_name}
Description: {repo.get('description', 'N/A')}
Stars: {repo.get('stargazers_count', 0)}
Language: {repo.get('language', 'Unknown')}

README excerpt:
{readme_content[:2000]}

Return in this exact format:

**What it does:** (1 simple sentence)

**Who it's for:** (describe ideal user)

**What you can build with it:**
- Example 1
- Example 2
- Example 3

**Difficulty:** Beginner/Intermediate/Advanced

**How to get started:**
1. Step 1
2. Step 2
3. Step 3

**Replaces (paid alternative):** Name ($X/mo) or "No direct alternative"

Keep it simple. No jargon."""
            
            translation = await chat.send_message(UserMessage(text=prompt))
            
            result = {
                "full_name": full_name,
                "name": repo.get("name"),
                "description": repo.get("description"),
                "stars": repo.get("stargazers_count"),
                "language": repo.get("language"),
                "html_url": repo.get("html_url"),
                "translation": translation,
                "translated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Cache for 7 days
            await self.db.repo_translations.update_one(
                {"full_name": full_name},
                {"$set": result},
                upsert=True
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error translating repo: {e}")
            return {"error": str(e)}
