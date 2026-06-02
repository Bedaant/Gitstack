"""
AI Semantic Reranker — Send top candidates to LLM for final relevance scoring.
Blends heuristic scores with LLM judgment.
"""

import json
from typing import List, Dict, Any
from loguru import logger

from query_parser import QueryAnalysis


async def rerank_with_llm(
    candidates: List[Dict[str, Any]],
    query: str,
    analysis: QueryAnalysis,
    call_ai_fn
) -> List[Dict[str, Any]]:
    """
    Rerank candidates using LLM semantic judgment.
    Returns candidates sorted by blended score (60% heuristic + 40% LLM).
    """
    if len(candidates) <= 5:
        # Not enough candidates to justify LLM call
        for c in candidates:
            c["_final_score"] = c.get("_composite_score", 0)
        return candidates

    top_n = min(25, len(candidates))
    top_candidates = candidates[:top_n]

    prompt = _build_rerank_prompt(query, analysis, top_candidates)

    try:
        response = await call_ai_fn(prompt, json_response=True)
        llm_scores = _parse_llm_scores(response)
    except Exception as e:
        logger.warning(f"LLM reranking failed: {e}")
        # Fallback: use heuristic scores
        for c in candidates:
            c["_final_score"] = c.get("_composite_score", 0)
        return sorted(candidates, key=lambda x: x["_final_score"], reverse=True)

    # Blend scores
    for c in candidates:
        fn = c.get("full_name", "")
        heuristic = c.get("_composite_score", 0)
        llm_score = llm_scores.get(fn)

        if llm_score is not None:
            # Blend: 60% heuristic + 40% LLM (normalized to same scale)
            c["_final_score"] = (heuristic * 0.6) + (llm_score * 0.4)
            c["_llm_score"] = llm_score
        else:
            c["_final_score"] = heuristic

    return sorted(candidates, key=lambda x: x["_final_score"], reverse=True)


def _build_rerank_prompt(
    query: str,
    analysis: QueryAnalysis,
    candidates: List[Dict[str, Any]]
) -> str:
    prompt = f'''You are a search relevance expert for GitStack (gitstack.pro), a platform that helps founders find free open-source alternatives to paid SaaS tools.

Rank these repositories by relevance to the user's query.

Query: "{query}"
Intent: {analysis.intent}

Repositories:
'''
    for i, c in enumerate(candidates):
        desc = c.get("description", "")[:120]
        stars = c.get("stars", 0)
        repo_type = c.get("repo_type", "unknown")
        lang = c.get("language", "unknown")
        prompt += f'{i+1}. {c.get("full_name", c.get("name", "unknown"))}: {desc} (stars: {stars}, type: {repo_type}, lang: {lang})\n'

    prompt += '''
For each repository, score 0-100 based on:
1. Does it directly solve what the user is asking for? (0-40)
2. Is it a real, deployable tool (not a course, tutorial, or template)? (0-30)
3. Is it actively maintained and popular enough to trust? (0-30)

Return ONLY a JSON array:
[{"full_name": "owner/repo", "score": 85, "reason": "brief explanation"}, ...]
'''
    return prompt


def _parse_llm_scores(response: str) -> Dict[str, float]:
    """Extract full_name -> score mapping from LLM JSON response."""
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    if cleaned.startswith("json"):
        cleaned = cleaned[4:].strip()

    data = json.loads(cleaned)

    # Unwrap envelope if LLM wrapped response in {data: [...]} etc.
    if isinstance(data, dict):
        for key in ("result", "data", "response", "scores", "rankings"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    scores = {}
    for item in data:
        if isinstance(item, dict):
            fn = item.get("full_name", "")
            if fn:
                scores[fn] = float(item.get("score", 0))
    return scores
