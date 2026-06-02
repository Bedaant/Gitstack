"""
Diversity injection — prevent result collapse into one category.
Uses repo_type as primary diversity dimension, then use_cases/topics.
"""

from typing import List, Dict, Any
from collections import defaultdict


def inject_diversity(
    candidates: List[Dict[str, Any]],
    max_per_category: int = 3,
    max_results: int = 25
) -> List[Dict[str, Any]]:
    """
    Re-rank candidates to ensure diversity across categories.
    Prioritizes repo_type diversity first, then use_case/topic diversity.
    """
    # Sort by composite score descending
    sorted_candidates = sorted(
        candidates,
        key=lambda x: x.get("_composite_score", 0),
        reverse=True
    )

    category_counts = defaultdict(int)
    diverse_results = []

    for candidate in sorted_candidates:
        # Primary category: repo_type (complete_solution, building_block, etc.)
        # Secondary: use_cases > topics > language > uncategorized
        repo_type = candidate.get("repo_type") or "unknown"
        use_cases = candidate.get("use_cases") or []
        topics = candidate.get("topics") or []
        secondary = use_cases or topics
        secondary_cat = secondary[0] if secondary else candidate.get("language", "uncategorized")

        # Composite category key: repo_type + secondary
        cat = f"{repo_type}:{str(secondary_cat).lower()}"

        if category_counts[cat] < max_per_category:
            diverse_results.append(candidate)
            category_counts[cat] += 1

        if len(diverse_results) >= max_results:
            break

    return diverse_results
