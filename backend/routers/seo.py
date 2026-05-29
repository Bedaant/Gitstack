from fastapi import APIRouter
from fastapi_cache.decorator import cache
import re
import server

router = APIRouter(tags=["SEO"])

@router.get("/solutions")
@cache(expire=3600)
async def list_solutions_index():
    """Returns top 50 use cases for programmatic SEO directory."""
    pipeline = [
        {"$match": {"repo_type": "complete_solution", "use_cases": {"$exists": True, "$not": {"$size": 0}}}},
        {"$unwind": "$use_cases"},
        {"$group": {"_id": "$use_cases", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    results = await server.db.github_repos.aggregate(pipeline).to_list(50)
    return {
        "use_cases": [
            {
                "name": r["_id"],
                "slug": re.sub(r"[^a-z0-9]+", "-", r["_id"].lower()).strip("-"),
                "repo_count": r["count"]
            }
            for r in results
        ]
    }

@router.get("/solutions/{slug}")
@cache(expire=600)
async def get_solution_category(slug: str):
    """Returns complete solutions matching a specific use case slug."""
    human_name = slug.replace("-", " ")
    query = {
        "repo_type": "complete_solution",
        "use_cases": {"$regex": human_name, "$options": "i"}
    }
    repos = await server.db.github_repos.find(query, {"_id": 0}).sort("score", -1).limit(20).to_list(20)
    for r in repos:
        product = await server.db.marketplace_products.find_one(
            {"github_repo_url": {"$regex": re.escape(r["full_name"]), "$options": "i"}, "published": True},
            {"_id": 0, "product_id": 1, "price_cents": 1, "seller_user_id": 1}
        )
        if product:
            seller = await server.db.marketplace_sellers.find_one({"seller_user_id": product["seller_user_id"]})
            r["marketplace_setup"] = {
                "product_id": product["product_id"],
                "price": product.get("price_cents", 0) / 100,
                "seller_name": (seller or {}).get("display_name", "Developer")
            }
    return {
        "use_case": human_name.title(),
        "slug": slug,
        "count": len(repos),
        "repos": repos
    }

@router.get("/alternatives/{tool_slug}")
@cache(expire=3600)
async def get_alternatives(tool_slug: str):
    """
    Programmatic SEO endpoint: returns open-source alternatives to a paid SaaS tool.
    e.g. /api/alternatives/notion, /api/alternatives/typeform
    """
    pretty = tool_slug.replace("-", " ").title()
    variants = [pretty, tool_slug.replace("-", " "), tool_slug]

    regex_pattern = "|".join(re.escape(v) for v in variants)
    curated = await server.db.tools.find(
        {"paid_alternative": {"$regex": regex_pattern, "$options": "i"}},
        {"_id": 0}
    ).limit(20).to_list(20)

    if len(curated) < 3:
        tag_match = await server.db.tools.find(
            {"tags": {"$regex": f"{tool_slug}-alternative", "$options": "i"}},
            {"_id": 0}
        ).limit(20).to_list(20)
        seen = {t["tool_id"] for t in curated}
        for t in tag_match:
            if t["tool_id"] not in seen:
                curated.append(t)

    gh = await server.db.github_repos.find(
        {"topics": {"$regex": f"{tool_slug}-alternative", "$options": "i"}},
        {"_id": 0}
    ).sort("stars", -1).limit(10).to_list(10)

    complete_solutions = await server.db.github_repos.find(
        {
            "repo_type": "complete_solution",
            "replaces_saas": {"$regex": regex_pattern, "$options": "i"}
        },
        {"_id": 0}
    ).sort("stars", -1).limit(5).to_list(5)
    gh_names = {r.get("full_name") for r in gh}
    complete_solutions = [s for s in complete_solutions if s.get("full_name") not in gh_names]

    return {
        "paid_tool": pretty,
        "slug": tool_slug,
        "alternatives": curated,
        "github_repos": gh,
        "complete_solutions": complete_solutions,
        "count": len(curated) + len(gh) + len(complete_solutions),
    }

@router.get("/alternatives")
@cache(expire=3600)
async def list_alternatives_index():
    """Lists all paid tools that have alternatives (for index page + sitemap)."""
    pipeline = [
        {"$match": {"paid_alternative": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$paid_alternative", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gte": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 100},
    ]
    results = await server.db.tools.aggregate(pipeline).to_list(100)
    return {
        "paid_tools": [
            {
                "name": r["_id"],
                "slug": re.sub(r"[^a-z0-9]+", "-", r["_id"].lower()).strip("-"),
                "alternatives_count": r["count"],
            }
            for r in results
        ]
    }
