"""
Local test for search pipeline without MongoDB or server.
"""
import asyncio
import sys

# Minimal dummy DB
dummy_db = None

# Dummy AI
dummy_analysis = None

def dummy_ai(prompt, **kwargs):
    return '{"intent":"test","core_features":["test"],"search_phrases":["test"],"synonyms":{},"anti_keywords":["course"],"specific_tools":[],"alternative_to":null,"expected_repo_type":null,"preferred_language":null,"self_hosted":false,"exclude_languages":[],"comparison_mode":false,"github_query":"test"}'

# Dummy cache
async def dummy_cache_get(key):
    return None

async def dummy_cache_set(key, value, ttl=900):
    pass

# Setup
from query_parser import QueryAnalyzer
analyzer = QueryAnalyzer(dummy_ai, dummy_cache_get, dummy_cache_set)

from search_engine import GitStackSearchEngine
engine = GitStackSearchEngine()

# Build tiny index
test_repos = [
    {
        "name": "tool1",
        "full_name": "owner/tool1",
        "description": "A test tool",
        "stars": 100,
        "language": "Python",
        "topics": ["test", "automation"],
        "use_cases": ["workflow"],
        "replaces_saas": ["Zapier"],
        "repo_type": "complete_solution",
        "has_docker": True,
    },
    {
        "name": "tool2",
        "full_name": "owner/tool2",
        "description": "Another tool",
        "stars": 50,
        "language": "JavaScript",
        "topics": ["crm"],
        "use_cases": ["CRM"],
        "replaces_saas": None,
        "repo_type": "complete_solution",
        "has_docker": False,
    }
]

engine._index_repos(test_repos, source="github")
import bm25s, Stemmer
stemmer = Stemmer.Stemmer("english")
tokens = bm25s.tokenize(engine.corpus, stopwords="en", stemmer=stemmer)
engine.retriever = bm25s.BM25(method="lucene")
engine.retriever.index(tokens)
engine._built = True
print(f"Index built: {engine.stats()}")

# Now test queries
queries = [
    "crm",
    "open source alternative to Zapier",
    "email marketing like Mailchimp",
    "self-hosted project management",
    "invoice tool for freelancers",
    "password manager for teams",
    "video conferencing like Zoom",
]

async def test_search(query):
    try:
        analysis = await analyzer.analyze(query)
        print(f"\n=== Testing: {query} ===")
        print(f"  Parsed: {analysis.intent}")
        
        # Test BM25
        bm25_results = engine.search(query, k=min(50, len(engine.corpus)))
        print(f"  BM25: {len(bm25_results)} results")
        
        # Test exact
        exact = engine.get_by_name(["tool1"])
        print(f"  Exact: {len(exact)} results")
        
        # Test alternative
        alt_results = []
        if analysis.alternative_to:
            alt = analysis.alternative_to.lower()
            for idx, doc in engine.repo_map.items():
                rs = doc.get("replaces_saas") or []
                uc = doc.get("use_cases") or []
                text = f"{' '.join(rs)} {' '.join(uc)}"
                if alt in text.lower():
                    alt_results.append(doc)
        print(f"  Alt: {len(alt_results)} results")
        
        # Test diversity
        from diversity import inject_diversity
        all_candidates = bm25_results + exact + [{**r, "_pillar": "alt"} for r in alt_results]
        # dedup
        seen = set()
        unique = []
        for c in all_candidates:
            fn = c.get("full_name", c.get("name", ""))
            if fn and fn not in seen:
                seen.add(fn)
                unique.append(c)
        
        # scoring
        from scoring import compute_composite_score
        click_data = {}
        for c in unique:
            c["_composite_score"] = compute_composite_score(c, analysis, click_data)
        
        diverse = inject_diversity(unique, max_per_category=3, max_results=25)
        print(f"  Diverse: {len(diverse)} results")
        
        # normalize
        from search_utils import normalize_repo
        normalized = [normalize_repo(r) for r in diverse]
        print(f"  Normalized: {len(normalized)} results")
        for r in normalized[:3]:
            print(f"    - {r['full_name']} (score: {r['_score']})")
        
        print("  OK")
        return True
    except Exception as e:
        print(f"  CRASH: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    results = []
    for q in queries:
        results.append(await test_search(q))
    
    print(f"\n=== SUMMARY ===")
    print(f"Passed: {sum(results)}/{len(results)}")
    if all(results):
        print("ALL TESTS PASSED")
        sys.exit(0)
    else:
        print("SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
