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

    # Build searchable text with FIELD WEIGHTING
    # use_cases and replaces_saas are 3x more important than topics
    name = candidate.get("name", "")
    description = candidate.get("description", "")
    topics = _j(candidate.get("topics"))
    use_cases = _j(candidate.get("use_cases"))
    replaces_saas = _j(candidate.get("replaces_saas"))

    text = f"{name} {description} {topics} {use_cases} {use_cases} {use_cases} {replaces_saas} {replaces_saas} {replaces_saas}"
    text_lower = text.lower()

    # Also build a separate text for exact-field matching
    name_lower = name.lower()
    desc_lower = (description or "").lower()
    uc_lower = use_cases.lower()
    rs_lower = replaces_saas.lower()

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

    # === REPLACES_SAAS MATCH — KILLER SIGNAL ===
    if analysis.alternative_to:
        alt_lower = analysis.alternative_to.lower()
        # Direct match in replaces_saas array
        rs_list = candidate.get("replaces_saas") or []
        if rs_list and any(alt_lower == r.lower() for r in rs_list):
            score += 500  # Exact match = dominant boost
        elif alt_lower in rs_lower:
            score += 300  # Partial match in replaces_saas text
        elif alt_lower in desc_lower:
            score += 80   # Mentioned in description
        elif alt_lower in name_lower:
            score += 60   # Mentioned in name

        # Also boost if ANY of the specific_tools match replaces_saas
        for tool in analysis.specific_tools:
            tl = tool.lower()
            if any(tl == r.lower() for r in (rs_list if rs_list else [])):
                score += 200
            elif tl in rs_lower:
                score += 120

    # === EXACT NAME MATCH ===
    query_phrase = analysis.search_phrases[0] if analysis.search_phrases else ""
    if query_phrase and name_lower == query_phrase.lower():
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
        score *= (0.05 ** anti_count)  # Much stronger penalty

    # === REPO_TYPE PENALTIES / BOOSTS ===
    repo_type = candidate.get("repo_type", "") or ""
    query_repo_type = analysis.expected_repo_type or ""

    # Hard penalties for mismatched repo types
    if query_repo_type == "complete_solution":
        if repo_type in ("tutorial", "course", "learning"):
            score *= 0.001  # Nearly eliminate tutorials
        elif repo_type == "building_block":
            score *= 0.3    # Strongly penalize libraries
        elif repo_type == "complete_solution":
            score += 50     # Boost actual complete solutions
    elif query_repo_type == "building_block":
        if repo_type == "complete_solution":
            score *= 0.7
        elif repo_type == "building_block":
            score += 50

    # Legacy is_course / is_template flags
    if candidate.get("is_course"):
        score *= 0.01
    if candidate.get("is_template"):
        score *= 0.05

    # === METADATA MATCH ===
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
