#!/usr/bin/env python3
"""
Bulk classify top unclassified repos in github_repos.
Targets repos with the most stars first (these are what users see).

Usage:
    cd backend && python scripts/classify_top_repos.py --limit 300

Requires GROQ_API_KEY or NVIDIA_NIM_API_KEY env var.
"""
import os
import sys
import asyncio
import json
import argparse
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import httpx

load_dotenv()

async def _call_ai_script(prompt: str, json_response: bool = False) -> str:
    """Call Groq or NVIDIA NIM for repo classification script."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You classify GitHub repos. Return only valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 4096
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  Groq failed: {e}")

    nvidia_key = os.environ.get("NVIDIA_NIM_API_KEY")
    if nvidia_key:
        try:
            url = "https://integrate.api.nvidia.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {nvidia_key}", "Content-Type": "application/json"}
            payload = {
                "model": "meta/llama-3.3-70b-instruct",
                "messages": [
                    {"role": "system", "content": "You classify GitHub repos. Return only valid JSON arrays."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 4096
            }
            if json_response:
                payload["response_format"] = {"type": "json_object"}
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"  NVIDIA NIM failed: {e}")

    raise Exception("All AI providers failed for classification script")

# Config
CLASSIFICATION_MIN_STARS = 50  # Lowered: even mid-size repos deserve labels
BATCH_SIZE = 10


def detect_docker_support(repo: dict) -> bool:
    """Heuristic: check if repo mentions Docker in description or topics."""
    text = f"{repo.get('description', '')} {' '.join(repo.get('topics', []))}".lower()
    return any(k in text for k in ["docker", "container", "docker-compose", "kubernetes", "k8s"])


def calculate_health_score(repo: dict) -> int:
    """Simple health score 0-100."""
    score = 0
    stars = repo.get("stars", 0)
    forks = repo.get("forks", 0)
    contributors = repo.get("contributors", 0)

    if stars > 1000: score += 30
    elif stars > 500: score += 25
    elif stars > 100: score += 20
    elif stars > 50: score += 15
    else: score += 10

    if forks > 100: score += 20
    elif forks > 50: score += 15
    elif forks > 10: score += 10
    else: score += 5

    if contributors > 20: score += 20
    elif contributors > 5: score += 15
    else: score += 10

    if repo.get("license"): score += 10
    if not repo.get("archived", False): score += 10
    return min(score, 100)


async def classify_batch(batch: list, db) -> int:
    """Classify one batch of repos using AI."""
    batch_summaries = []
    for r in batch:
        topics_str = ", ".join(r.get("topics", [])[:8])
        batch_summaries.append(
            f"- {r['full_name']}: {r.get('description', '')[:150]} "
            f"[topics: {topics_str}] [stars: {r.get('stars', 0)}] "
            f"[language: {r.get('language', 'Unknown')}]"
        )

    prompt = f"""Classify each GitHub repository below for a non-technical founder who wants to clone and run it.

For EACH repo, determine:
1. repo_type:
   - "complete_solution" = the founder can git clone, follow a README, and have a working product WITHOUT writing integration code. This includes: full apps, SaaS templates, boilerplates with backend+frontend, agent frameworks with built-in UI, voice bot templates, CRM apps, dashboard starters, anything with `docker-compose up` or `npm start` that just works.
   - "building_block" = a library, SDK, or low-level tool that requires the founder to write code to use it (e.g. a Python package, a React component library, a WebRTC server without a UI).
   BE GENEROUS with complete_solution. If it has a UI, a backend, or clear setup scripts, it's a complete_solution even if it calls itself a "toolkit" or "framework".

2. use_cases: 2-5 specific business use cases (e.g. "AI voice calling", "SEO content generation", "LinkedIn outreach", "invoice management", "CRM", "sales dialer")
3. replaces_saas: 1-3 paid SaaS products it replaces (e.g. "Apollo.io", "HubSpot", "Twilio", "Vapi"). Use empty array if none.
4. has_docker: true/false — does it mention Docker, docker-compose, or containerization?
5. has_api: true/false — does it expose REST/GraphQL/WebSocket APIs?
6. has_ui: true/false — does it have a web dashboard, admin panel, or user interface?
7. complementary_tools: 1-3 types of tools that complement this (e.g. "analytics", "database", "auth", "email", "payments")

Repos to classify:
{chr(10).join(batch_summaries)}

Return ONLY a valid JSON array (no markdown) with one object per repo:
[{{
  "full_name": "owner/repo",
  "repo_type": "complete_solution",
  "use_cases": ["use case 1", "use case 2"],
  "replaces_saas": ["SaaS1"],
  "has_docker": true,
  "has_api": true,
  "has_ui": true,
  "complementary_tools": ["analytics", "database"]
}}]"""

    try:
        raw = await _call_ai_script(prompt, json_response=True)
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        classifications = json.loads(raw)

        now = datetime.now(timezone.utc).isoformat()
        classified = 0

        for cls in classifications:
            fn = cls.get("full_name", "")
            if not fn:
                continue

            # Find matching repo for heuristics
            matching = next((r for r in batch if r["full_name"] == fn), None)
            docker_heuristic = detect_docker_support(matching) if matching else False

            update_fields = {
                "repo_type": cls.get("repo_type", "building_block"),
                "use_cases": cls.get("use_cases", []),
                "replaces_saas": cls.get("replaces_saas", []),
                "has_docker": cls.get("has_docker", docker_heuristic),
                "has_api": cls.get("has_api", False),
                "has_ui": cls.get("has_ui", False),
                "complementary_tools": cls.get("complementary_tools", []),
                "health_score": calculate_health_score(matching) if matching else 0,
                "classified_at": now,
            }

            await db.github_repos.update_one(
                {"full_name": fn},
                {"$set": update_fields}
            )
            classified += 1

        return classified

    except Exception as e:
        print(f"  WARNING: Batch failed: {e}")
        return 0


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=300, help="Max repos to classify")
    parser.add_argument("--stars", type=int, default=50, help="Min stars threshold")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017/gitstack")
    db_name = os.environ.get("DB_NAME", "gitstack")
    groq_key = os.environ.get("GROQ_API_KEY")
    nvidia_key = os.environ.get("NVIDIA_NIM_API_KEY")

    if not groq_key and not nvidia_key:
        print("❌ GROQ_API_KEY or NVIDIA_NIM_API_KEY not set")
        sys.exit(1)

    client = AsyncIOMotorClient(mongo_url, maxPoolSize=10)
    db = client[db_name]
    # Count current state
    total = await db.github_repos.count_documents({})
    unclassified = await db.github_repos.count_documents({"repo_type": None})
    print(f"Stats: Total repos: {total} | Unclassified: {unclassified}")

    # Fetch top unclassified repos by stars
    # Note: Atlas M0 has count limitations, so we use find+sort and filter in Python
    cursor = db.github_repos.find(
        {"repo_type": None},
        {"_id": 0}
    ).sort("stars", -1).limit(args.limit * 2)

    all_repos = await cursor.to_list(args.limit * 2)
    repos = [r for r in all_repos if r.get("stars", 0) >= args.stars][:args.limit]
    print(f"Target: Will classify top {len(repos)} unclassified repos (stars >= {args.stars})")

    if not repos:
        print("OK: Nothing to classify")
        client.close()
        return

    # Process in batches
    total_classified = 0
    for i in range(0, len(repos), BATCH_SIZE):
        batch = repos[i:i + BATCH_SIZE]
        print(f"\nBatch {i // BATCH_SIZE + 1}/{(len(repos) + BATCH_SIZE - 1) // BATCH_SIZE} ({len(batch)} repos)")

        classified = await classify_batch(batch, db)
        total_classified += classified
        print(f"   Classified {classified}/{len(batch)}")

        # Rate limit: sleep between batches
        if i + BATCH_SIZE < len(repos):
            await asyncio.sleep(1.5)

    print(f"\nDone! Total classified: {total_classified}")

    # Show new state
    complete = await db.github_repos.count_documents({"repo_type": "complete_solution"})
    building = await db.github_repos.count_documents({"repo_type": "building_block"})
    unclassified_after = await db.github_repos.count_documents({"repo_type": None})
    print(f"Stats: complete_solution={complete}, building_block={building}, unclassified={unclassified_after}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
