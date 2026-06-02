"""
Integration tests for the new search engine.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from search_engine import GitStackSearchEngine
from query_parser import QueryAnalysis
from scoring import compute_composite_score
from diversity import inject_diversity
from search_utils import normalize_repo


# Dummy repo data
DUMMY_REPOS = [
    {
        "full_name": "langroid/langroid",
        "name": "langroid",
        "description": "Moldable Multi-Agent LLM Orchestration Framework",
        "stars": 4500,
        "topics": ["llm", "agent", "rag", "multi-agent"],
        "use_cases": ["LLM orchestration", "agent framework"],
        "replaces_saas": ["OpenAI Assistants"],
        "repo_type": "building_block",
        "has_docker": False,
        "has_ui": False,
        "health_score": 85,
        "language": "Python",
        "last_push_days": 15,
    },
    {
        "full_name": "microsoft/LLMs-from-scratch",
        "name": "LLMs-from-scratch",
        "description": "Learn to build LLMs from scratch",
        "stars": 25000,
        "topics": ["llm", "education", "tutorial"],
        "use_cases": ["education", "learning"],
        "replaces_saas": [],
        "repo_type": "tutorial",
        "has_docker": False,
        "has_ui": False,
        "health_score": 70,
        "language": "Python",
        "last_push_days": 45,
        "is_course": True,
    },
    {
        "full_name": "n8n-io/n8n",
        "name": "n8n",
        "description": "Workflow automation tool — alternative to Zapier",
        "stars": 42000,
        "topics": ["automation", "workflow", "n8n"],
        "use_cases": ["workflow automation", " Zapier alternative"],
        "replaces_saas": ["Zapier", "Make"],
        "repo_type": "complete_solution",
        "has_docker": True,
        "has_ui": True,
        "health_score": 95,
        "language": "TypeScript",
        "last_push_days": 5,
    },
    {
        "full_name": "frappe/erpnext",
        "name": "erpnext",
        "description": "Open source ERP and CRM",
        "stars": 18000,
        "topics": ["erp", "crm", "accounting"],
        "use_cases": ["CRM", "ERP", "accounting"],
        "replaces_saas": ["Salesforce", "SAP"],
        "repo_type": "complete_solution",
        "has_docker": True,
        "has_ui": True,
        "health_score": 90,
        "language": "Python",
        "last_push_days": 10,
    },
]


class DummyCollection:
    """Mock collection for testing."""
    def __init__(self, data):
        self.data = data
    def find(self, *args, **kwargs):
        return self
    async def to_list(self, length):
        return self.data

class DummyDB:
    """Mock DB for testing."""
    github_repos = DummyCollection(DUMMY_REPOS)
    tools = DummyCollection([])


async def test_index_build():
    """Test that the index builds and searches correctly."""
    engine = GitStackSearchEngine()
    db = DummyDB()
    await engine.build_index(db)
    
    stats = engine.stats()
    assert stats["documents"] == 4, f"Expected 4 docs, got {stats['documents']}"
    assert stats["built"] is True
    print("OK: Index builds correctly")


async def test_bm25_search():
    """Test BM25 search returns relevant results."""
    engine = GitStackSearchEngine()
    db = DummyDB()
    await engine.build_index(db)
    
    results = engine.search("CRM", k=3)
    assert len(results) > 0, "Expected some results for 'CRM'"
    
    # ERPNext should be in results (it has CRM in use_cases)
    names = [r["name"] for r in results]
    assert "erpnext" in names, f"Expected erpnext in results, got {names}"
    print(f"OK: BM25 search works: {names}")


async def test_exact_lookup():
    """Test exact name lookup."""
    engine = GitStackSearchEngine()
    db = DummyDB()
    await engine.build_index(db)
    
    results = engine.get_by_name(["n8n"])
    assert len(results) == 1
    assert results[0]["name"] == "n8n"
    print("OK: Exact lookup works")


async def test_scoring_anti_keyword():
    """Test that courses get penalized."""
    analysis = QueryAnalysis(
        intent="LLM orchestration",
        core_features=["llm orchestration"],
        search_phrases=["llm orchestration"],
        anti_keywords=["course", "tutorial", "learn", "from-scratch"],
    )
    
    # Langroid should score high
    langroid_score = compute_composite_score(DUMMY_REPOS[0], analysis, {})
    # Course should score very low
    course_score = compute_composite_score(DUMMY_REPOS[1], analysis, {})
    
    assert langroid_score > course_score, \
        f"Langroid ({langroid_score}) should score higher than course ({course_score})"
    assert course_score < 100, \
        f"Course ({course_score}) should be heavily penalized"
    print(f"OK: Anti-keyword penalty works: langroid={langroid_score:.1f}, course={course_score:.1f}")


async def test_scoring_repo_type_match():
    """Test repo type matching boosts score."""
    analysis_complete = QueryAnalysis(
        intent="CRM",
        core_features=["CRM"],
        search_phrases=["CRM"],
        expected_repo_type="complete_solution",
    )
    
    erpnext = DUMMY_REPOS[3]
    langroid = DUMMY_REPOS[0]
    
    erpnext_score = compute_composite_score(erpnext, analysis_complete, {})
    langroid_score = compute_composite_score(langroid, analysis_complete, {})
    
    # ERPNext is complete_solution, langroid is building_block
    assert erpnext_score > langroid_score, \
        f"ERPNext ({erpnext_score}) should score higher than langroid ({langroid_score}) for complete_solution query"
    print(f"OK: Repo type boost works: erpnext={erpnext_score:.1f}, langroid={langroid_score:.1f}")


async def test_diversity():
    """Test diversity injection prevents category collapse."""
    candidates = [
        {"_composite_score": 100, "use_cases": ["CRM"], "name": "crm1"},
        {"_composite_score": 95, "use_cases": ["CRM"], "name": "crm2"},
        {"_composite_score": 90, "use_cases": ["CRM"], "name": "crm3"},
        {"_composite_score": 85, "use_cases": ["CRM"], "name": "crm4"},
        {"_composite_score": 80, "use_cases": ["automation"], "name": "auto1"},
    ]
    
    diverse = inject_diversity(candidates, max_per_category=2)
    crm_count = sum(1 for c in diverse if c["use_cases"][0] == "CRM")
    
    assert crm_count <= 2, f"Expected max 2 CRMs, got {crm_count}"
    assert len(diverse) == 3, f"Expected 3 results, got {len(diverse)}"
    print(f"OK: Diversity injection works: {crm_count} CRMs in {len(diverse)} results")


async def test_normalize_repo():
    """Test repo normalization produces consistent schema."""
    normalized = normalize_repo(DUMMY_REPOS[0])
    required_keys = ["name", "full_name", "description", "stars", "language", "topics", "source"]
    for key in required_keys:
        assert key in normalized, f"Missing key: {key}"
    print("OK: Repo normalization works")


async def run_all_tests():
    print("Running search engine tests...\n")
    await test_index_build()
    await test_bm25_search()
    await test_exact_lookup()
    await test_scoring_anti_keyword()
    await test_scoring_repo_type_match()
    await test_diversity()
    await test_normalize_repo()
    print("\nAll tests passed!")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
