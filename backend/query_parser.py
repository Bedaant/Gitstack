"""
AI Query Parser — Natural language → structured search intent.
Uses one LLM call, cached for 1 hour.
"""

import hashlib
import json
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from loguru import logger


class QueryAnalysis(BaseModel):
    intent: str = ""
    core_features: List[str] = Field(default_factory=list)
    search_phrases: List[str] = Field(default_factory=list)
    synonyms: Dict[str, List[str]] = Field(default_factory=dict)
    anti_keywords: List[str] = Field(default_factory=lambda: ["course", "tutorial", "learn", "from-scratch"])
    specific_tools: List[str] = Field(default_factory=list)
    alternative_to: Optional[str] = None
    expected_repo_type: Optional[str] = None
    preferred_language: Optional[str] = None
    self_hosted: bool = False
    exclude_languages: List[str] = Field(default_factory=list)
    comparison_mode: bool = False
    github_query: str = ""


class QueryAnalyzer:
    """Parses natural language queries into structured search intent."""

    CACHE_TTL = 3600  # 1 hour

    def __init__(self, call_ai_fn, cache_get_fn, cache_set_fn):
        self.call_ai = call_ai_fn
        self.cache_get = cache_get_fn
        self.cache_set = cache_set_fn

    async def analyze(self, query: str) -> QueryAnalysis:
        if not query or not query.strip():
            return QueryAnalysis()

        normalized = query.lower().strip()[:200]
        cache_key = f"query:{hashlib.sha256(normalized.encode()).hexdigest()}"

        # Check cache
        try:
            cached = await self.cache_get(cache_key)
            if cached:
                return QueryAnalysis(**json.loads(cached))
        except Exception as e:
            logger.debug(f"Query cache read error: {e}")

        # LLM call
        try:
            prompt = self._build_prompt(normalized)
            response = await self.call_ai(prompt, json_response=True, temperature=0)
            analysis = self._parse_response(response)
        except Exception as e:
            logger.error(f"Query analysis LLM failed: {e}")
            # Fallback: basic analysis
            analysis = QueryAnalysis(
                intent=normalized,
                core_features=[normalized],
                search_phrases=[normalized],
                github_query=normalized,
            )

        # Cache result
        try:
            await self.cache_set(cache_key, analysis.model_dump_json(), ttl=self.CACHE_TTL)
        except Exception as e:
            logger.debug(f"Query cache write error: {e}")

        return analysis

    def _build_prompt(self, query: str) -> str:
        return f'''You are the query parser for GitStack (gitstack.pro), a platform that helps non-technical founders find free open-source alternatives to paid SaaS tools.

Parse this search query: "{query}"

Return ONLY valid JSON (no markdown, no explanation):
{{
  "intent": "what the user wants to do/build",
  "core_features": ["feature1", "feature2"],
  "search_phrases": ["exact phrases from query"],
  "synonyms": {{"word": ["synonym1", "synonym2"]}},
  "anti_keywords": ["course", "tutorial", "learn", "from-scratch"],
  "specific_tools": ["langroid", "n8n"],
  "alternative_to": null,
  "expected_repo_type": "complete_solution",
  "preferred_language": null,
  "self_hosted": false,
  "exclude_languages": [],
  "comparison_mode": false,
  "github_query": "optimized github api search query"
}}

Rules:
- intent: Be specific about what the user wants (e.g., "LLM orchestration framework" not just "search")
- core_features: Extract key capabilities the tool must have
- search_phrases: Multi-word phrases from the query (for exact phrase matching)
- synonyms: Map domain terms to common alternatives (e.g., "harness" → ["framework", "orchestrator"])
- specific_tools: If user names a known open-source tool, include it
- alternative_to: If query says "alternative to X" or "like X" or "instead of X", extract X
- expected_repo_type: "complete_solution" (end-users deploy) or "building_block" (developers use) or "library"
- self_hosted: true if query mentions "self-hosted", "local", "on-premise", "docker"
- github_query: Optimize for GitHub API search. Use in:name, in:description, stars:>50, language:xxx
- comparison_mode: true if query contains "vs", "versus", "compare", "or", "better than"
'''

    def _parse_response(self, response: str) -> QueryAnalysis:
        """Clean and parse LLM JSON response."""
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

        data = json.loads(cleaned)

        # Normalize fields
        return QueryAnalysis(
            intent=data.get("intent", ""),
            core_features=_to_list(data.get("core_features", [])),
            search_phrases=_to_list(data.get("search_phrases", [])),
            synonyms=data.get("synonyms", {}),
            anti_keywords=_to_list(data.get("anti_keywords", ["course", "tutorial", "learn"])),
            specific_tools=_to_list(data.get("specific_tools", [])),
            alternative_to=data.get("alternative_to"),
            expected_repo_type=data.get("expected_repo_type"),
            preferred_language=data.get("preferred_language"),
            self_hosted=bool(data.get("self_hosted", False)),
            exclude_languages=_to_list(data.get("exclude_languages", [])),
            comparison_mode=bool(data.get("comparison_mode", False)),
            github_query=data.get("github_query", ""),
        )


def _to_list(val):
    """Normalize to list."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        return [val]
    return []
