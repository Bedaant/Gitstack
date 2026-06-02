"""
Signal-based composite scoring for search candidates.
Combines BM25 scores, metadata matches, popularity, recency, and click feedback.
"""

import math
from typing import Dict, Any, List, Optional
from query_parser import QueryAnalysis


def compute_composite_score(
    candidate: Dict[str, Any],
    analysis: QueryAnalysis,
    click_data: Dict[str, Dict[str, Any]]
) -> float:
    """Compute composite relevance score. Higher = more relevant."""
    score = 0.0

    def _j(val):
        if not val:
            return ""
        return " ".join(val)
    # Build searchable text
    text = f"{candidate.get('name', '')} {candidate.get('description', '')} "
    text += f"{_j(candidate.get('topics'))} "
    text += f"{_j(candidate.get('use_cases'))}"
    text_lower = text.lower()

    # === SOURCE BONUSES ===
    pillar = candidate.get("_pillar", "unknown")
    if "curated" in pillar:
        score += 150
    if "exact_lookup" in pillar:
        score += 120
    if "alternative" in pillar:
        score += 80
    if "bm25" in pillar:
        bm25_score = candidate.get("_bm25_score", 0)
        score += bm25_score * 10
    if "github_live" in pillar:
        score += 40

    # === EXACT NAME MATCH ===
    query_phrase = analysis.search_phrases[0] if analysis.search_phrases else ""
    if query_phrase and candidate.get("name", "").lower() == query_phrase.lower():
        score += 200

    # === PHRASE MATCHES (AND semantics) ===
    feature_matches = 0
    for feature in analysis.core_features:
        f_lower = feature.lower()
        if f_lower in text_lower:
            score += 20 * max(len(feature.split()), 1)
            feature_matches += 1
    if feature_matches > 0 and feature_matches == len(analysis.core_features):
        score *= 1.5  # All features matched

    # === SYNONYM MATCHES ===
    for word, syns in analysis.synonyms.items():
        for syn in syns:
            if syn.lower() in text_lower:
                score += 12

    # === ANTI-KEYWORD PENALTY ===
    anti_count = sum(
        1 for anti in analysis.anti_keywords
        if anti.lower() in text_lower
    )
    if anti_count > 0:
        score *= (0.1 ** anti_count)
    if candidate.get("is_course"):
        score *= 0.01
    if candidate.get("is_template"):
        score *= 0.05

    # === METADATA MATCH ===
    if analysis.expected_repo_type and candidate.get("repo_type") == analysis.expected_repo_type:
        score += 30
    if analysis.self_hosted:
        if candidate.get("has_docker"):
            score += 20
        if candidate.get("has_ui"):
            score += 15
    if analysis.preferred_language:
        if candidate.get("language", "").lower() == analysis.preferred_language.lower():
            score += 15
    for excluded in analysis.exclude_languages:
        if candidate.get("language", "").lower() == excluded.lower():
            score *= 0.1

    # === POPULARITY ===
    stars = candidate.get("stars", 0) or 0
    if isinstance(stars, str):
        stars = int(stars.replace(",", ""))
    score += min(math.log10(max(stars, 1)) * 8, 40)

    # === RECENCY / STALENESS ===
    days = candidate.get("last_push_days")
    if days is None:
        # Fallback: compute from last_pushed string if available
        days = _compute_days_since_push(candidate.get("last_pushed"))
    if days is None:
        days = 365

    if days < 30:
        score += 15
    elif days < 90:
        score += 10
    elif days < 180:
        score += 5
    elif days < 365:
        score += 0
    else:
        score -= 20
    if days > 730:
        score -= 30

    # === HOT NEW REPO BOOST ===
    if days < 30 and stars > 100:
        score += 25

    # === HEALTH SCORE ===
    health = candidate.get("health_score", 50) or 50
    score += health / 5

    # === CLICK FEEDBACK ===
    full_name = candidate.get("full_name", "")
    if full_name and full_name in click_data:
        multiplier = click_data[full_name].get("multiplier", 1.0)
        score *= multiplier

    return score


def _compute_days_since_push(last_pushed: Any) -> Optional[int]:
    """Compute days since last push from ISO timestamp string."""
    if not last_pushed:
        return None
    try:
        from datetime import datetime, timezone
        if isinstance(last_pushed, str):
            pushed = datetime.fromisoformat(last_pushed.replace("Z", "+00:00"))
        else:
            pushed = last_pushed
        return (datetime.now(timezone.utc) - pushed).days
    except Exception:
        return None
