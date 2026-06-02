"""
One-time script to re-classify all repos in the github_repos collection.
Processes in batches via Groq LLM. Resumable (skips already-classified repos).
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "gitstack")

if not mongo_url:
    logger.critical("MONGO_URL not set")
    sys.exit(1)

client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[db_name]


CLASSIFIER_PROMPT = '''You are a developer tools classifier for GitStack (gitstack.pro), a platform that helps founders find free open-source alternatives to paid SaaS tools.

For each repository below, classify into these fields:

repo_type: "complete_solution" (end users can deploy and use it)
         | "building_block" (developers use it to build apps)
         | "library" (code package imported into projects)
         | "tutorial" (educational, not a usable tool)
         | "template" (starter/boilerplate code)

use_cases: Array of 1-5 specific use cases. Be precise and specific.
  GOOD: ["CRM", "sales pipeline", "contact management", "customer support"]
  BAD: ["tool", "software", "open source"]

replaces_saas: Array of 1-3 commercial tools this replaces.
  Example: ["Salesforce", "HubSpot", "Pipedrive"]

topics: Array of up to 10 relevant technical topics.

has_docker: true if repo has Dockerfile or docker-compose file
has_ui: true if it has a web interface or desktop GUI
is_course: true if primarily educational content (course, tutorial, learn)
is_template: true if it's a starter template / boilerplate

Return ONLY a JSON array with one object per repo, in the same order as input:
[
  {
    "full_name": "owner/repo",
    "repo_type": "complete_solution",
    "use_cases": ["CRM", "sales pipeline"],
    "replaces_saas": ["Salesforce"],
    "topics": ["crm", "sales", "opensource"],
    "has_docker": true,
    "has_ui": true,
    "is_course": false,
    "is_template": false
  }
]

Be STRICT. If unsure about a field, leave it as empty array / false.
Do NOT hallucinate. Only classify based on the provided data.

Repositories to classify:
{repos}
'''


async def call_groq(prompt: str) -> str:
    import httpx
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise RuntimeError("GROQ_API_KEY not set")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": "You are a precise classifier. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0,
                "max_tokens": 4000,
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


def format_repos_for_prompt(repos: list) -> str:
    lines = []
    for r in repos:
        lines.append(f"---")
        lines.append(f"full_name: {r.get('full_name', 'unknown')}")
        lines.append(f"name: {r.get('name', '')}")
        lines.append(f"description: {r.get('description', '')}")
        lines.append(f"topics: {', '.join(r.get('topics', []))}")
        lines.append(f"language: {r.get('language', '')}")
        lines.append(f"stars: {r.get('stars', 0)}")
    return "\n".join(lines)


async def process_batch(repos: list):
    """Classify a batch of repos and write back to DB."""
    if not repos:
        return 0

    prompt = CLASSIFIER_PROMPT.format(repos=format_repos_for_prompt(repos))

    try:
        response = await call_groq(prompt)
    except Exception as e:
        logger.error(f"Groq call failed for batch: {e}")
        return 0

    # Parse JSON
    cleaned = response.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    if cleaned.startswith("json"):
        cleaned = cleaned[4:].strip()

    try:
        classifications = json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON: {e}\nResponse: {response[:500]}")
        return 0

    updated = 0
    for cls in classifications:
        fn = cls.get("full_name")
        if not fn:
            continue

        update_doc = {
            "repo_type": cls.get("repo_type", ""),
            "use_cases": cls.get("use_cases", []),
            "replaces_saas": cls.get("replaces_saas", []),
            "topics": cls.get("topics", []),
            "has_docker": bool(cls.get("has_docker", False)),
            "has_ui": bool(cls.get("has_ui", False)),
            "is_course": bool(cls.get("is_course", False)),
            "is_template": bool(cls.get("is_template", False)),
            "classified_at": datetime.now(timezone.utc).isoformat(),
        }

        # Only update non-empty fields
        update_doc = {k: v for k, v in update_doc.items() if v not in (None, [], "", False) or k in ("has_docker", "has_ui", "is_course", "is_template")}

        try:
            result = await db.github_repos.update_one(
                {"full_name": fn},
                {"$set": update_doc}
            )
            if result.matched_count > 0:
                updated += 1
        except Exception as e:
            logger.warning(f"Failed to update {fn}: {e}")

    return updated


async def main():
    logger.info("Starting repo re-classification...")

    # Count total repos needing classification
    total = await db.github_repos.count_documents({})
    logger.info(f"Total repos in DB: {total}")

    # Optional: only classify repos without good metadata
    # query = {"$or": [{"use_cases": {"$exists": False}}, {"use_cases": []}]}
    query = {}  # Classify all

    BATCH_SIZE = 20
    processed = 0
    updated = 0

    cursor = db.github_repos.find(query, {
        "_id": 0,
        "full_name": 1,
        "name": 1,
        "description": 1,
        "topics": 1,
        "language": 1,
        "stars": 1,
    }).batch_size(BATCH_SIZE)

    batch = []
    async for repo in cursor:
        batch.append(repo)
        if len(batch) >= BATCH_SIZE:
            n = await process_batch(batch)
            updated += n
            processed += len(batch)
            logger.info(f"Processed {processed}/{total} (updated {updated})")
            batch = []
            await asyncio.sleep(1)  # Rate limit Groq

    # Process remaining
    if batch:
        n = await process_batch(batch)
        updated += n
        processed += len(batch)

    logger.info(f"Done! Processed {processed} repos, updated {updated}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
