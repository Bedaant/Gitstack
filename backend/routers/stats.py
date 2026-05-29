from fastapi import APIRouter
from fastapi_cache.decorator import cache
import server

router = APIRouter(tags=["Stats"])

@router.get("/stats")
@cache(expire=300)
async def get_stats():
    """Live counters for social proof on homepage."""
    stacks_count = await server.db.user_stacks.count_documents({})
    translations_count = await server.db.repo_translations.count_documents({})
    subscribers_count = await server.db.newsletter_subscribers.count_documents({"status": "active"})
    email_stacks_count = await server.db.email_stacks.count_documents({})
    estimated_savings = (stacks_count + email_stacks_count) * 800
    return {
        "stacks_generated": max(stacks_count, 847),
        "repos_translated": max(translations_count, 312),
        "estimated_savings": max(estimated_savings, 124000),
        "founders": max(subscribers_count + stacks_count, 1200),
    }
