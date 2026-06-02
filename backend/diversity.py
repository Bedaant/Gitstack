"""
Diversity injection — prevent result collapse into one category.
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
    Takes top-scoring candidates but limits how many from each category.
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
        # Determine category: use_cases > topics > language > uncategorized
        use_cases = candidate.get("use_cases") or []
        topics = candidate.get("topics") or []
        categories = use_cases or topics
        cat = categories[0] if categories else candidate.get("language", "uncategorized")
        cat = str(cat).lower()

        if category_counts[cat] < max_per_category:
            diverse_results.append(candidate)
            category_counts[cat] += 1

        if len(diverse_results) >= max_results:
            break

    return diverse_results
