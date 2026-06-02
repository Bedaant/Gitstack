"""
GitStack Search Engine — In-memory BM25 index over our repo database.
Rebuilt on startup and after scraper runs. Pure Python, no external services.
"""

import asyncio
import math
from typing import List, Dict, Any, Optional
from collections import defaultdict

import bm25s
import Stemmer
from loguru import logger


class GitStackSearchEngine:
    """BM25-powered search engine with atomic index rebuilds."""

    def __init__(self):
        self.retriever: Optional[bm25s.BM25] = None
        self.corpus: List[str] = []
        self.repo_map: Dict[int, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self.version = 0
        self.stemmer = Stemmer.Stemmer("english")
        self._built = False

    async def build_index(self, db):
        """Build index from MongoDB. Atomic swap when done. Thread-safe reads."""
        logger.info("Building search index from database...")

        # Fetch all repos + curated tools
        repos = await db.github_repos.find({}, {"_id": 0}).to_list(None)
        curated = await db.tools.find({}, {"_id": 0}).to_list(None)

        # Build new index in isolation
        new_engine = GitStackSearchEngine()
        new_engine._index_repos(repos, source="github")
        new_engine._index_repos(curated, source="curated")

        # Tokenize and build BM25 retriever
        if new_engine.corpus:
            tokens = bm25s.tokenize(
                new_engine.corpus,
                stopwords="en",
                stemmer=new_engine.stemmer
            )
            new_engine.retriever = bm25s.BM25(method="lucene")
            new_engine.retriever.index(tokens)
            new_engine._built = True

        # Atomic swap
        async with self._lock:
            self.corpus = new_engine.corpus
            self.repo_map = new_engine.repo_map
            self.retriever = new_engine.retriever
            self.version += 1
            self._built = new_engine._built

        logger.info(
            f"Search index v{self.version} built: {len(self.corpus)} docs "
            f"({len(repos)} github + {len(curated)} curated)"
        )

    def _index_repos(self, repos: List[Dict], source: str):
        for repo in repos:
            text = self._build_search_text(repo)
            self.corpus.append(text)
            idx = len(self.corpus) - 1
            self.repo_map[idx] = {**repo, "_source": source}

    @staticmethod
    def _build_search_text(repo: Dict) -> str:
        """Concatenate all searchable fields into one string."""
        def _j(val):
            if not val:
                return ""
            return " ".join(val)
        parts = [
            repo.get("name", ""),
            repo.get("description", ""),
            _j(repo.get("topics")),
            _j(repo.get("use_cases")),
            _j(repo.get("replaces_saas")),
            repo.get("language", ""),
        ]
        return " ".join(p for p in parts if p)

    def search(self, query: str, k: int = 50) -> List[Dict[str, Any]]:
        """BM25 search. Returns top-k repo documents with BM25 scores."""
        if not self._built or not self.retriever or not query.strip():
            return []

        corpus_size = len(self.corpus)
        if corpus_size == 0:
            return []
        k = min(k, corpus_size)

        query_tokens = bm25s.tokenize([query], stopwords="en", stemmer=self.stemmer)
        results, scores = self.retriever.retrieve(query_tokens, k=k)

        matches = []
        for idx, score in zip(results[0], scores[0]):
            idx = int(idx)
            if idx in self.repo_map:
                doc = {**self.repo_map[idx]}
                doc["_bm25_score"] = float(score)
                doc["_pillar"] = "bm25"
                matches.append(doc)
        return matches

    def multi_search(self, queries: List[str], k: int = 50) -> List[Dict[str, Any]]:
        """Run BM25 with multiple query formulations and merge results.
        
        Each query gets k/len(queries) slots to ensure diversity across
        different query formulations.
        """
        if not self._built or not self.retriever:
            return []

        corpus_size = len(self.corpus)
        if corpus_size == 0:
            return []

        # Deduplicate non-empty queries
        unique_queries = [q for q in dict.fromkeys(q.strip() for q in queries if q and q.strip())]
        if not unique_queries:
            return []

        per_query_k = max(1, min(k // len(unique_queries), corpus_size))
        seen = set()
        all_matches = []

        for q in unique_queries:
            try:
                query_tokens = bm25s.tokenize([q], stopwords="en", stemmer=self.stemmer)
                results, scores = self.retriever.retrieve(query_tokens, k=per_query_k)
                for idx, score in zip(results[0], scores[0]):
                    idx = int(idx)
                    if idx in seen:
                        continue
                    seen.add(idx)
                    if idx in self.repo_map:
                        doc = {**self.repo_map[idx]}
                        doc["_bm25_score"] = float(score)
                        doc["_pillar"] = "bm25"
                        all_matches.append(doc)
            except Exception:
                continue

        return all_matches

    def search_replaces_saas(self, tool_name: str) -> List[Dict[str, Any]]:
        """Find repos that explicitly list tool_name in their replaces_saas field."""
        if not tool_name:
            return []
        tn_lower = tool_name.lower()
        matches = []
        for idx, doc in self.repo_map.items():
            rs = doc.get("replaces_saas") or []
            if any(tn_lower == r.lower() for r in rs):
                match = {**doc, "_pillar": "alternative_exact"}
                match["_bm25_score"] = 999  # Dominant signal
                matches.append(match)
        return matches

    def get_by_name(self, names: List[str]) -> List[Dict[str, Any]]:
        """Fast exact lookup by name or full_name."""
        names_lower = {n.lower() for n in names}
        results = []
        for idx, doc in self.repo_map.items():
            if (
                doc.get("name", "").lower() in names_lower
                or doc.get("full_name", "").lower() in names_lower
            ):
                results.append({**doc, "_pillar": "exact_lookup"})
        return results

    def get_by_full_names(self, full_names: List[str]) -> List[Dict[str, Any]]:
        """Lookup by full_name only."""
        fn_lower = {fn.lower() for fn in full_names}
        results = []
        for idx, doc in self.repo_map.items():
            if doc.get("full_name", "").lower() in fn_lower:
                results.append({**doc, "_pillar": "exact_lookup"})
        return results

    def stats(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "documents": len(self.corpus),
            "built": self._built,
        }
