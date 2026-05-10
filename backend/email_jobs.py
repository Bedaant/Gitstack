"""GitStack email jobs — Daily Drop, Weekly Stack, reminders, onboarding.

All curation and send logic lives here.
Scheduling is handled by Render Cron or APScheduler.
"""

import os
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from loguru import logger

from utils.email import send_email
from email_templates import render_daily_drop

DB_NAME = os.environ.get("DB_NAME", "gitstack")
SITE_URL = os.environ.get("FRONTEND_URL", "https://gitstack.pro")
EMAIL_TOKEN_SECRET = os.environ.get("EMAIL_TOKEN_SECRET", os.environ.get("SMTP_PASSWORD", "dev-secret-change-me"))

import jwt as pyjwt

def _generate_email_token(email: str) -> str:
    """Generate a JWT token for email-based actions."""
    payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, EMAIL_TOKEN_SECRET, algorithm="HS256")


# ═══════════════════════════════════════════════════════════════════
# Curation Engine
# ═══════════════════════════════════════════════════════════════════

def _build_repo_url(full_name: str) -> Optional[str]:
    """Build a canonical GitStack repo URL from full_name (owner/repo).
    Returns None if full_name is invalid (would cause 404)."""
    if not full_name or "/" not in full_name:
        return None
    parts = full_name.split("/")
    if len(parts) != 2:
        return None
    owner, repo = parts[0], parts[1]
    if not owner or not repo:
        return None
    return f"{SITE_URL}/r/{owner}/{repo}"


def _build_tool_url(tool_id: str) -> Optional[str]:
    """Build a canonical GitStack tool URL from tool_id.
    Returns None if tool_id is empty (would cause 404)."""
    if not tool_id or not str(tool_id).strip():
        return None
    return f"{SITE_URL}/tools/{tool_id}"


async def _verify_repo_exists(db: AsyncIOMotorDatabase, full_name: str) -> bool:
    """Double-check that a repo still exists in our database before linking to it."""
    if not full_name:
        return False
    count = await db.github_repos.count_documents({"full_name": full_name})
    return count > 0


async def get_repo_of_the_day(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
    """Fetch today's featured repo. Validates link before returning."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = await db.repo_of_the_day.find_one({"date": today})
    if not doc:
        logger.warning("Daily Drop: no repo_of_the_day for today")
        return None

    repo = doc.get("repo", {})
    full_name = repo.get("full_name", "")

    # Validate we can build a working URL
    url = _build_repo_url(full_name)
    if not url:
        logger.warning(f"Daily Drop: repo_of_the_day has invalid full_name: {full_name}")
        return None

    # Extra safety: verify repo still exists in github_repos
    exists = await _verify_repo_exists(db, full_name)
    if not exists:
        logger.warning(f"Daily Drop: repo_of_the_day repo {full_name} not found in github_repos")
        return None

    return {
        "name": repo.get("name", full_name.split("/")[-1]).replace("-", " ").title(),
        "tagline": repo.get("ai_summary") or repo.get("description") or "A curated open-source tool for founders.",
        "replaces": _find_replacement(repo.get("topics", [])),
        "replaces_price_monthly": _find_replacement_price(repo.get("topics", [])),
        "stars": repo.get("stars", 0),
        "trend": _format_trend(repo.get("weekly_star_growth", 0)),
        "category": _first_topic(repo.get("topics", [])),
        "url": url,
        "icon_emoji": "🌟",
    }


async def get_trending_pick(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
    """Pick one HOT trending repo with high founder value. Validates link."""
    repo = await db.github_repos.find_one(
        {"tier": "hot", "stars": {"$gte": 100}},
        sort=[("score", -1)]
    )
    if not repo:
        logger.warning("Daily Drop: no hot repos found")
        return None

    full_name = repo.get("full_name", "")
    url = _build_repo_url(full_name)
    if not url:
        logger.warning(f"Daily Drop: trending repo has invalid full_name: {full_name}")
        return None

    return {
        "name": repo.get("name", "Trending Tool").replace("-", " ").title(),
        "tagline": repo.get("ai_summary") or repo.get("description") or "Trending open-source tool.",
        "replaces": _find_replacement(repo.get("topics", [])),
        "replaces_price_monthly": _find_replacement_price(repo.get("topics", [])),
        "stars": repo.get("stars", 0),
        "trend": _format_trend(repo.get("weekly_star_growth", 0)),
        "category": _first_topic(repo.get("topics", [])),
        "url": url,
        "icon_emoji": "🔥",
    }


async def get_curated_pick(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
    """Pick one hand-curated tool that replaces expensive SaaS. Validates link."""
    tool = await db.tools.find_one(
        {"paid_alternative": {"$exists": True, "$ne": None}},
        sort=[("setup_time_minutes", 1)]  # Easiest first
    )
    if not tool:
        logger.warning("Daily Drop: no curated tools with paid_alternative found")
        return None

    tool_id = tool.get("tool_id", "")
    url = _build_tool_url(tool_id)
    if not url:
        logger.warning(f"Daily Drop: curated tool has empty tool_id")
        return None

    price = tool.get("paid_alternative_price_monthly", 0)
    paid_name = tool.get("paid_alternative", "Expensive SaaS")
    replaces_str = f"{paid_name} ${price}/mo" if price else paid_name

    return {
        "name": tool.get("name", "Curated Tool"),
        "tagline": (tool.get("what_you_can_build") or ["A tool for founders."])[0],
        "replaces": replaces_str,
        "replaces_price_monthly": price,
        "stars": tool.get("github_stars", 0),
        "trend": None,
        "category": tool.get("category", "Open Source"),
        "url": url,
        "icon_emoji": "💡",
    }


async def _get_fallback_repo(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
    """Get any valid repo from github_repos as a fallback."""
    repo = await db.github_repos.find_one(
        {"stars": {"$gte": 50}},
        sort=[("stars", -1)]
    )
    if not repo:
        return None
    full_name = repo.get("full_name", "")
    url = _build_repo_url(full_name)
    if not url:
        return None
    return {
        "name": repo.get("name", "Featured Tool").replace("-", " ").title(),
        "tagline": repo.get("ai_summary") or repo.get("description") or "A popular open-source tool.",
        "replaces": _find_replacement(repo.get("topics", [])),
        "replaces_price_monthly": _find_replacement_price(repo.get("topics", [])),
        "stars": repo.get("stars", 0),
        "trend": _format_trend(repo.get("weekly_star_growth", 0)),
        "category": _first_topic(repo.get("topics", [])),
        "url": url,
        "icon_emoji": "🛠️",
    }


async def _get_fallback_tool(db: AsyncIOMotorDatabase) -> Optional[Dict[str, Any]]:
    """Get any valid curated tool as a fallback."""
    tool = await db.tools.find_one(
        {"tool_id": {"$exists": True, "$ne": None}},
        sort=[("github_stars", -1)]
    )
    if not tool:
        return None
    tool_id = tool.get("tool_id", "")
    url = _build_tool_url(tool_id)
    if not url:
        return None
    return {
        "name": tool.get("name", "Featured Tool"),
        "tagline": (tool.get("what_you_can_build") or ["A useful open-source tool."])[0],
        "replaces": tool.get("paid_alternative", "Expensive SaaS"),
        "replaces_price_monthly": tool.get("paid_alternative_price_monthly", 0),
        "stars": tool.get("github_stars", 0),
        "trend": None,
        "category": tool.get("category", "Open Source"),
        "url": url,
        "icon_emoji": "🛠️",
    }


async def get_daily_drop_content(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    """Curate the 3 tools for today's Daily Drop.

    Order:
    1. Repo of the Day (validated + verified)
    2. One HOT trending repo (validated)
    3. One curated tool with paid alternative (validated)

    Fallbacks: if any slot is empty, we pull a backup repo or tool
    so the email never goes out with broken links.
    """
    tools = []

    # Slot 1: Repo of the Day
    rod = await get_repo_of_the_day(db)
    if rod:
        tools.append(rod)
    else:
        fallback = await _get_fallback_repo(db)
        if fallback:
            logger.info("Daily Drop: using fallback repo for slot 1")
            tools.append(fallback)

    # Slot 2: Trending
    trending = await get_trending_pick(db)
    if trending:
        tools.append(trending)
    else:
        fallback = await _get_fallback_repo(db)
        if fallback and fallback["url"] not in {t["url"] for t in tools}:
            logger.info("Daily Drop: using fallback repo for slot 2")
            tools.append(fallback)

    # Slot 3: Curated
    curated = await get_curated_pick(db)
    if curated:
        tools.append(curated)
    else:
        fallback = await _get_fallback_tool(db)
        if fallback and fallback["url"] not in {t["url"] for t in tools}:
            logger.info("Daily Drop: using fallback tool for slot 3")
            tools.append(fallback)

    if len(tools) < 3:
        logger.warning(f"Daily Drop only found {len(tools)} valid tools after fallbacks.")

    return tools[:3]


# ═══════════════════════════════════════════════════════════════════
# Send Jobs
# ═══════════════════════════════════════════════════════════════════

async def send_daily_drop(db: AsyncIOMotorDatabase, test_email: str = None):
    """Send the Daily Drop to all active subscribers.

    Args:
        db: MongoDB database instance.
        test_email: If provided, send only to this address (for testing).
    """
    tools = await get_daily_drop_content(db)
    if not tools:
        logger.warning("Daily Drop: no tools found. Skipping send.")
        return

    html = render_daily_drop("there", tools, SITE_URL)
    subject = _craft_subject(tools)

    # Generate sender token for unsubscribe/preferences links in the template
    # We generate one generic token for the "there" version; per-user tokens below
    sender_token = _generate_email_token("newsletter@gitstack.pro") if not test_email else None

    if test_email:
        recipients = [{"email": test_email, "name": "Test User"}]
    else:
        cursor = db.newsletter_subscribers.find({"status": "active"})
        recipients = await cursor.to_list(length=None)

    sent = 0
    failed = 0

    for rec in recipients:
        email = rec.get("email")
        name = rec.get("name") or rec.get("email", "").split("@")[0]
        user_token = _generate_email_token(email)
        user_html = render_daily_drop(name, tools, SITE_URL, unsubscribe_token=user_token, preferences_token=user_token)

        try:
            await send_email(
                to=[email],
                subject=subject,
                body=user_html,
                sender="drop",
            )
            sent += 1

            # Update last_sent_at
            await db.newsletter_subscribers.update_one(
                {"email": email},
                {"$set": {"last_sent_at": datetime.now(timezone.utc).isoformat()}}
            )

            # Log send
            await db.email_logs.insert_one({
                "email_type": "daily_drop",
                "recipient_email": email,
                "subject": subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "sent",
            })

        except Exception as e:
            failed += 1
            logger.error(f"Daily Drop failed for {email}: {e}")
            await db.email_logs.insert_one({
                "email_type": "daily_drop",
                "recipient_email": email,
                "subject": subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "failed",
                "error": str(e),
            })

    logger.info(f"Daily Drop complete: {sent} sent, {failed} failed")


# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def _craft_subject(tools: List[Dict]) -> str:
    """Rotate subject lines for variety and click-through."""
    if not tools:
        return "Your Daily Drop is here"

    first = tools[0]
    name = first.get("name", "")
    replaces = first.get("replaces", "")
    category = first.get("category", "")

    # Pick based on day of month for rotation
    day = datetime.now().day
    templates = [
        f"Your Daily Drop: Stop paying for {replaces.split('$')[0].strip() if replaces else category}",
        f"3 {category or 'open-source'} tools that save founders money",
        f"Daily Drop: {name} + 2 more tools you can't miss",
        f"Build faster, spend less — {datetime.now().strftime('%B %d')}",
        f"Your Daily Drop: {name} is trending 🔥",
    ]
    return templates[day % len(templates)]


def _find_replacement(topics: List[str]) -> Optional[str]:
    """Map topics to known paid alternatives."""
    mapping = {
        "cms": "Contentful $489/mo",
        "newsletter": "Mailchimp $65/mo",
        "analytics": "Mixpanel $249/mo",
        "authentication": "Auth0 $150/mo",
        "payments": "Stripe (free, but saves dev time)",
        "database": "MongoDB Atlas $57/mo",
        "hosting": "Vercel Pro $20/mo",
        "email": "SendGrid $90/mo",
        "chat": "Intercom $74/mo",
        "search": "Algolia $29/mo",
        "forms": "Typeform $99/mo",
        "scheduling": "Calendly $12/mo",
        "crm": "HubSpot $45/mo",
    }
    for t in topics:
        t_lower = t.lower()
        if t_lower in mapping:
            return mapping[t_lower]
    return None


def _find_replacement_price(topics: List[str]) -> int:
    """Extract monthly price from replacement mapping."""
    rep = _find_replacement(topics)
    if not rep:
        return 0
    try:
        # Extract number before /mo
        import re
        match = re.search(r'\$(\d+)', rep)
        return int(match.group(1)) if match else 0
    except Exception:
        return 0


def _format_trend(weekly_growth: int) -> Optional[str]:
    """Format star growth into a human-readable trend."""
    if not weekly_growth or weekly_growth <= 0:
        return None
    if weekly_growth >= 1000:
        return f"+{weekly_growth:,} this week"
    return None


def _first_topic(topics: List[str]) -> str:
    """Return the first topic as a display category."""
    if not topics:
        return "Open Source"
    t = topics[0]
    return t.replace("-", " ").title()


# ═══════════════════════════════════════════════════════════════════
# CLI Entry Point (for Render Cron or manual runs)
# ═══════════════════════════════════════════════════════════════════

async def main():
    """Run the Daily Drop from command line."""
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client[DB_NAME]

    test_email = os.environ.get("DAILY_DROP_TEST_EMAIL")
    await send_daily_drop(db, test_email=test_email)

    client.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
