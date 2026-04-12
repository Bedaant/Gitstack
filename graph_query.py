import sqlite3, os

db = r'd:\Gitstack\Gitstack\.code-review-graph\graph.db'
conn = sqlite3.connect(db)
conn.row_factory = sqlite3.Row
BASE = r'D:\Gitstack\Gitstack' + os.sep

changed = [
    r'frontend\src\pages\RoastMyStack.js',
    r'frontend\src\pages\RepoTranslator.js',
    r'frontend\src\pages\ComparisonPage.js',
    r'frontend\src\pages\StackGenerator.js',
    r'frontend\src\pages\Dashboard.js',
    r'frontend\src\pages\ToolDetailPage.js',
    r'frontend\src\pages\TopicToolsPage.js',
    r'frontend\src\pages\GitHubRepoPage.js',
    r'frontend\src\pages\IdeaExists.js',
    r'frontend\src\pages\CollectionDetailPage.js',
    r'frontend\src\utils\localStacks.js',
]

# ── 1. FUNCTIONS IN CHANGED FILES ────────────────────────────────────────────
print("=" * 65)
print("1. FUNCTIONS IN CHANGED FILES (graph pre-edit snapshot)")
print("=" * 65)
for rel in changed:
    path = BASE + rel
    short = rel.split(os.sep)[-1]
    rows = conn.execute(
        "SELECT kind, name, line_start, line_end FROM nodes "
        "WHERE file_path=? AND kind!='File' ORDER BY line_start",
        (path,)
    ).fetchall()
    print(f"\n  {short}  ({len(rows)} nodes)")
    for r in rows:
        print(f"    [{r['kind']:10}] {r['name']:35} L{r['line_start']}-{r['line_end']}")

# ── 2. IMPORT GRAPH ──────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("2. IMPORT GRAPH — who imports each changed file")
print("=" * 65)
for rel in changed:
    short = rel.split(os.sep)[-1]
    base_name = short.replace('.js', '')
    importers = conn.execute(
        "SELECT DISTINCT file_path FROM edges "
        "WHERE kind='IMPORTS_FROM' AND target_qualified LIKE ? LIMIT 10",
        (f'%{base_name}%',)
    ).fetchall()
    if importers:
        print(f"\n  {short} imported by:")
        for imp in importers:
            p = (imp['file_path'] or '?').split(os.sep)[-1]
            print(f"    <- {p}")
    else:
        print(f"\n  {short}: no importers in graph")

# ── 3. RISK INDEX ─────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("3. RISK INDEX — high-risk nodes in changed files")
print("=" * 65)
for rel in changed:
    path = BASE + rel
    short = rel.split(os.sep)[-1]
    risks = conn.execute("""
        SELECT n.name, ri.risk_score, ri.caller_count, ri.test_coverage, ri.security_relevant
        FROM risk_index ri
        JOIN nodes n ON ri.node_id = n.id
        WHERE n.file_path = ? AND ri.risk_score > 0.25
        ORDER BY ri.risk_score DESC LIMIT 6
    """, (path,)).fetchall()
    if risks:
        print(f"\n  {short}:")
        for r in risks:
            print(f"    RISK={r['risk_score']:.2f}  callers={r['caller_count']}  "
                  f"test_cov={r['test_coverage']}  sec={r['security_relevant']}  [{r['name']}]")

# ── 4. COMMUNITIES ────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("4. ARCHITECTURAL COMMUNITIES")
print("=" * 65)
seen_communities = set()
for rel in changed:
    path = BASE + rel
    short = rel.split(os.sep)[-1]
    comm = conn.execute("""
        SELECT DISTINCT c.id, c.size, c.description, cs.purpose
        FROM nodes n
        JOIN communities c ON c.id = n.community_id
        LEFT JOIN community_summaries cs ON cs.community_id = c.id
        WHERE n.file_path = ? LIMIT 2
    """, (path,)).fetchall()
    for c in comm:
        cid = c['id']
        if cid not in seen_communities:
            seen_communities.add(cid)
            print(f"\n  Community #{cid} (size={c['size']}) — {short}")
            desc = c['purpose'] or c['description'] or ''
            if desc:
                print(f"    {desc[:130]}")

# ── 5. MISSING: ComparisonPage.js has 0 nodes — investigate ──────────────────
print("\n" + "=" * 65)
print("5. INVESTIGATION: ComparisonPage.js & localStacks.js — why 0 nodes?")
print("=" * 65)
for rel in [r'frontend\src\pages\ComparisonPage.js', r'frontend\src\utils\localStacks.js']:
    path = BASE + rel
    short = rel.split(os.sep)[-1]
    file_node = conn.execute(
        "SELECT id, name FROM nodes WHERE file_path=? AND kind='File'", (path,)
    ).fetchone()
    print(f"\n  {short}: File node = {'EXISTS' if file_node else 'MISSING (not indexed)'}")
    if not file_node:
        # Check if similar path exists
        like = conn.execute(
            "SELECT file_path FROM nodes WHERE kind='File' AND file_path LIKE ? LIMIT 3",
            (f'%{short}%',)
        ).fetchall()
        if like:
            print(f"    Found as: {like[0]['file_path']}")

# ── 6. TEST COVERAGE ─────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("6. TEST COVERAGE across changed files")
print("=" * 65)
tested_count = 0
for rel in changed:
    path = BASE + rel
    short = rel.split(os.sep)[-1]
    rows = conn.execute(
        "SELECT name, qualified_name FROM nodes WHERE file_path=? AND kind='Function'",
        (path,)
    ).fetchall()
    for r in rows:
        tests = conn.execute(
            "SELECT target_qualified FROM edges WHERE kind='TESTED_BY' AND source_qualified=?",
            (r['qualified_name'],)
        ).fetchall()
        if tests:
            tested_count += 1
            for t in tests:
                print(f"  COVERED: {r['name']} by {t['target_qualified'].split('.')[-1]}")

if tested_count == 0:
    total = conn.execute("SELECT COUNT(*) as c FROM edges WHERE kind='TESTED_BY'").fetchone()['c']
    print(f"  ZERO test coverage — no TESTED_BY edges on changed files")
    print(f"  (Whole codebase has {total} TESTED_BY edges total)")

# ── 7. HIGH-RISK SUMMARY ─────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("7. TOP RISK NODES ACROSS ALL CHANGED FILES")
print("=" * 65)
all_risks = conn.execute("""
    SELECT n.name, n.file_path, ri.risk_score, ri.caller_count,
           ri.test_coverage, ri.security_relevant
    FROM risk_index ri
    JOIN nodes n ON ri.node_id = n.id
    WHERE n.file_path LIKE ? AND ri.risk_score > 0.2
    ORDER BY ri.risk_score DESC LIMIT 15
""", (f'{BASE}frontend%',)).fetchall()

if all_risks:
    for r in all_risks:
        short = r['file_path'].split(os.sep)[-1]
        print(f"  {float(r['risk_score']):.2f}  {r['name']:35} ({short})  "
              f"callers={r['caller_count']}  cov={r['test_coverage']}  sec={r['security_relevant']}")
else:
    print("  No high-risk nodes found above threshold 0.2")

# ── 8. CALLS GRAPH: what our new handlers call ───────────────────────────────
print("\n" + "=" * 65)
print("8. OUTBOUND CALLS — what our new functions call")
print("=" * 65)
new_handlers = ['handleShare', 'handleSave', 'handleDelete', 'handleAddToStack',
                'handleRoast', 'handleGenerate', 'handleSearch', 'handleTranslate']
for fn in new_handlers:
    calls = conn.execute("""
        SELECT DISTINCT e.target_qualified, e.file_path
        FROM edges e
        JOIN nodes n ON n.qualified_name = e.source_qualified
        WHERE n.name = ? AND e.kind = 'CALLS' LIMIT 6
    """, (fn,)).fetchall()
    if calls:
        print(f"\n  {fn}() calls:")
        for c in calls:
            print(f"    -> {c['target_qualified'].split('.')[-1]}")

print("\n" + "=" * 65)
print("GRAPH REVIEW COMPLETE")
print("=" * 65)
conn.close()
