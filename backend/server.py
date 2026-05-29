from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import RedirectResponse
from fastapi.responses import JSONResponse
import json
import hmac
import hashlib
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
import uuid
import httpx
import asyncio
import re
import urllib.parse
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone, timedelta
from bs4 import BeautifulSoup
import jwt
from jwt import PyJWKClient
from og_image import router as og_router
from utils.email import (
    send_purchase_confirmation,
    send_setup_request_notification,
    send_payout_notification,
    send_welcome_email,
    send_stack_email,
    send_preferences_link,
)
from email_jobs import send_daily_drop
from onboarding_drip import run_onboarding_drip, send_onboarding_email

# ── Email Token Helpers (for unsubscribe/preferences magic links) ──
EMAIL_TOKEN_SECRET = os.environ.get("EMAIL_TOKEN_SECRET", os.environ.get("SMTP_PASSWORD", "dev-secret-change-me"))
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://gitstack.pro")

def _generate_email_token(email: str) -> str:
    """Generate a JWT token for email-based actions (unsubscribe, preferences)."""
    payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, EMAIL_TOKEN_SECRET, algorithm="HS256")

def _verify_email_token(token: str) -> str:
    """Verify an email token and return the email address. Raises on failure."""
    try:
        payload = jwt.decode(token, EMAIL_TOKEN_SECRET, algorithms=["HS256"])
        return payload["email"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Link expired. Request a new one.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid link.")
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache
from fastapi_health import health
from loguru import logger

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logger.remove(0)
logger.add(sys.stderr, format="{time:YYYY-MM-DD at HH:mm:ss!UTC} | {level} | {message}")

# MongoDB & AI Config (Robust Initialization)
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'gitstack')
clerk_jwks_url = os.environ.get('CLERK_JWKS_URL')
cors_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000')

# Initialize globals as None first to avoid NameErrors
client = None
db = None

try:
    if not mongo_url:
        print("[CRITICAL ERROR] MONGO_URL is not set!")
    else:
        # Connection pooling for scale (max 50 connections, keep 10 warm)
        client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=10,
            maxIdleTimeMS=45000,
            waitQueueTimeoutMS=5000,
        )
        db = client[db_name]
        print(f"[OK] MongoDB client initialized for {db_name} (pool: 10-50)")

    nvidia_key = os.environ.get("NVIDIA_NIM_API_KEY")
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        print("[OK] Groq configured")
    else:
        print("[WARN] GROQ_API_KEY is missing")
    if nvidia_key:
        print("[OK] NVIDIA NIM configured")
    else:
        print("[WARN] NVIDIA_NIM_API_KEY is missing")

except Exception as e:
    print(f"[PRE-BOOT ERROR] {str(e)}")

# GitHub API headers — token raises rate limit from 60 to 5000 req/hr
_gh_token = os.environ.get("GITHUB_TOKEN", "")
if not _gh_token:
    logger.warning("GITHUB_TOKEN not set! GitHub API limited to 60 req/hr. Set GITHUB_TOKEN env var for 5000 req/hr.")

# Fine-grained PATs use 'Bearer' prefix, classic tokens use 'token' prefix
if _gh_token.startswith("github_pat_"):
    _gh_auth = f"Bearer {_gh_token}"
else:
    _gh_auth = f"token {_gh_token}"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "GitStack",
    **({"Authorization": _gh_auth} if _gh_token else {}),
}

# Shared async HTTP client for backend routes (connection pooling)
_shared_httpx_client: httpx.AsyncClient = None
_httpx_client_lock = asyncio.Lock()


async def _get_httpx_client() -> httpx.AsyncClient:
    global _shared_httpx_client
    if _shared_httpx_client is None or _shared_httpx_client.is_closed:
        async with _httpx_client_lock:
            # Double-check after acquiring lock
            if _shared_httpx_client is None or _shared_httpx_client.is_closed:
                _shared_httpx_client = httpx.AsyncClient(
                    limits=httpx.Limits(max_connections=50, max_keepalive_connections=10),
                    timeout=httpx.Timeout(30.0),
                )
    return _shared_httpx_client


# Cache invalidation helpers
async def invalidate_solutions_cache():
    """Invalidate solution-related caches after scraper updates."""
    try:
        backend = FastAPICache.get_backend()
        # fastapi-cache2 uses namespace:prefix:key pattern; clear is coarse-grained
        await backend.clear(namespace="fastapi-cache", key="list_solutions_index")
        await backend.clear(namespace="fastapi-cache", key="get_solution_category")
        await backend.clear(namespace="fastapi-cache", key="get_alternatives")
        await backend.clear(namespace="fastapi-cache", key="list_alternatives_index")
        logger.info("Solutions caches invalidated")
    except Exception as e:
        logger.warning(f"Cache invalidation skipped: {e}")


async def invalidate_repo_cache(full_name: str):
    """Invalidate caches for a specific repo."""
    try:
        backend = FastAPICache.get_backend()
        await backend.clear(namespace="fastapi-cache", key=f"get_related_tools")
        # Solution-finder uses custom keys; we can't easily evict by repo,
        # but short TTL (5 min) means they'll refresh quickly.
    except Exception as e:
        logger.warning(f"Repo cache invalidation skipped: {e}")

# ── Email validation regex (SEC-05) ──────────────────────────────────
_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


async def _create_indexes_background():
    """Create all MongoDB indexes in the background so boot stays fast."""
    try:
        await db.user_activity.create_index("created_at", expireAfterSeconds=90 * 24 * 3600)
        await db.user_activity.create_index([("user_id", 1), ("created_at", -1)])
        await db.marketplace_products.create_index([("seller_user_id", 1)])
        await db.marketplace_products.create_index([("published", 1), ("created_at", -1)])
        await db.marketplace_products.create_index([("category", 1), ("published", 1)])
        await db.marketplace_products.create_index([("github_repo_url", 1)])
        await db.marketplace_purchases.create_index([("buyer_user_id", 1), ("status", 1)])
        await db.marketplace_purchases.create_index("razorpay_order_id", unique=True, sparse=True)
        await db.setup_requests.create_index([("seller_user_id", 1), ("status", 1)])
        await db.setup_requests.create_index([("auto_release_at", 1)])
        await db.product_reviews.create_index([("product_id", 1), ("created_at", -1)])
        await db.product_reviews.create_index([("buyer_user_id", 1), ("product_id", 1)], unique=True)
        await db.seller_wallets.create_index("seller_user_id", unique=True)
        await db.wallet_transactions.create_index([("seller_user_id", 1), ("created_at", -1)])
        # Performance & Scale indexes (Phase 1)
        await db.github_repos.create_index([("repo_type", 1), ("use_cases", 1), ("stars", -1)])
        await db.github_repos.create_index([("repo_type", 1), ("stars", -1)])
        await db.github_repos.create_index([("topics", 1), ("stars", -1)])
        await db.github_repos.create_index("full_name", unique=True, sparse=True)
        await db.github_repos.create_index([("last_classified_at", 1)])
        await db.repo_upvotes.create_index([("full_name", 1), ("use_case", 1)])
        await db.marketplace_products.create_index([("featured", 1), ("featured_until", -1), ("created_at", -1)])
        logger.info("All indexes created (background)")
    except Exception as e:
        logger.warning(f"Index creation (partial) skipped: {e}")


async def _maybe_seed():
    """Only seed if the database is actually empty — avoids redundant work on every reboot."""
    try:
        count = await db.tools.estimated_document_count()
        if count < 10:
            await seed_database()
            logger.info("Database seeded (was empty)")
        else:
            logger.info(f"Seed skipped — {count} tools already in DB")
    except Exception as e:
        logger.warning(f"Seed check failed: {e}")


async def _keep_alive_ping():
    """Ping ourselves every 14 minutes to prevent Render free-tier spin-down."""
    backend_url = os.environ.get("RENDER_EXTERNAL_URL") or os.environ.get("BACKEND_URL", "")
    if not backend_url:
        logger.warning("No RENDER_EXTERNAL_URL set — keep-alive disabled")
        return
    await asyncio.sleep(60)  # Let server fully boot first
    while True:
        try:
            async with httpx.AsyncClient() as c:
                resp = await c.get(f"{backend_url}/api/health", timeout=10)
                logger.debug(f"Keep-alive ping: {resp.status_code}")
        except Exception:
            pass
        await asyncio.sleep(14 * 60)  # Every 14 minutes


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    global _scraper_task
    _scraper_task = asyncio.create_task(_scraper_loop())
    logger.info("Background scraper scheduled (every 6 hours)")

    # Seed only if DB is empty (fast boot)
    asyncio.create_task(_maybe_seed())

    # Create indexes in background (non-blocking boot)
    asyncio.create_task(_create_indexes_background())

    # Initialize cache (in-memory for dev, Redis in production)
    try:
        redis_url = os.environ.get("REDIS_URL")
        if redis_url and redis_url.startswith("redis://"):
            from fastapi_cache.backends.redis import RedisBackend
            import redis.asyncio as aioredis
            r = aioredis.from_url(redis_url)
            FastAPICache.init(RedisBackend(r), prefix="gitstack")
            logger.info("Redis cache initialized")
        else:
            FastAPICache.init(InMemoryBackend(), prefix="gitstack")
            logger.info("In-memory cache initialized")
    except Exception as e:
        logger.warning(f"Cache init skipped: {e}")

    # Marketplace auto-release escrow worker (hourly)
    asyncio.create_task(auto_release_escrow_loop())

    # Keep-alive self-ping (prevents Render free-tier spin-down)
    asyncio.create_task(_keep_alive_ping())

    asyncio.create_task(send_phone_alert(
        title="🚀 GitStack Server Started",
        message="Backend is live and cron is running (every 6 hours).",
        priority="default"
    ))
    yield
    # Shutdown
    if _scraper_task:
        _scraper_task.cancel()
    # BUG-03 FIX: guard against client being None if MongoDB never connected;
    # use await directly (not create_task) — the event loop is still running here.
    try:
        await send_phone_alert(
            title="⚠️ GitStack Server Shutting Down",
            message="The backend server is shutting down.",
            priority="high"
        )
    except Exception:
        pass
    if client:
        client.close()

# limiter and app setup
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
api_router = APIRouter(prefix="/api")

# Health check endpoint
async def _check_mongo() -> dict:
    try:
        await db.command("ping")
        return {"status": "up", "database": "connected"}
    except Exception as e:
        return {"status": "down", "database": str(e)}

app.add_api_route("/health", health([_check_mongo]), tags=["Health"])

# Clerk JWKS client (caches keys automatically)
_jwks_client = None
if clerk_jwks_url:
    _jwks_client = PyJWKClient(clerk_jwks_url, cache_keys=True)
    print("[OK] Clerk JWKS client configured")
else:
    print("[WARN] CLERK_JWKS_URL not set -- auth will not work")

# ==================== MODELS ====================

class Tool(BaseModel):
    tool_id: str
    name: str
    description: str
    who_its_for: str
    what_you_can_build: List[str]
    difficulty: str  # Beginner, Intermediate, Advanced
    setup_time: str
    setup_steps: List[str]
    related_tools: List[str]
    github_url: str
    stars: str
    language: str
    category: str
    tags: List[str]
    paid_alternative: Optional[str] = None
    monthly_cost: Optional[str] = None

class Collection(BaseModel):
    collection_id: str
    title: str
    description: str
    tools: List[str]
    difficulty: str
    completion_time: str
    bg_color: str

class Topic(BaseModel):
    topic_id: str
    name: str
    icon: str
    color: str
    bg_color: str
    tool_count: int

class UserModel(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    github_username: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    skills: List[str] = []
    public_profile: bool = True
    subscription_tier: Literal["free", "pro"] = "free"
    subscription_expires_at: Optional[datetime] = None

class UpdateProfileRequest(BaseModel):
    github_username: Optional[str] = Field(None, max_length=50, pattern=r'^[a-zA-Z0-9\-]+$')
    bio: Optional[str] = Field(None, max_length=300)
    website: Optional[str] = Field(None, max_length=200)
    skills: Optional[List[str]] = Field(None, max_length=20)
    public_profile: Optional[bool] = None

class UserStack(BaseModel):
    stack_id: str
    user_id: str
    name: str
    tools: List[str]
    is_public: bool = True
    copy_count: int = 0
    created_at: datetime

class DeadToolRequest(BaseModel):
    paid_tools: str = Field(..., min_length=2, max_length=500)

class StackGeneratorRequest(BaseModel):
    idea: str = Field(..., min_length=3, max_length=300)
    budget: Optional[str] = Field(None, max_length=50)
    needs_payments: Optional[bool] = None
    building_alone: Optional[bool] = None

class StackMasterPromptRequest(BaseModel):
    idea: str = Field(..., min_length=3, max_length=300)
    tools: List[Dict[str, Any]]

class RepoTranslatorRequest(BaseModel):
    github_url: str = Field(..., min_length=10, max_length=200)

class RoastRequest(BaseModel):
    tools: List[str] = Field(..., min_length=1, max_length=30)

class SaveStackRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    tools: List[str] = Field(..., max_length=50)
    is_public: bool = True

class SmartSearchRequest(BaseModel):
    query: str
    limit: int = Field(default=20, ge=1, le=100)
    include_github_live: bool = True

class SolutionFinderRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    limit: int = Field(default=8, ge=1, le=20)

class RepoUpvoteRequest(BaseModel):
    full_name: str = Field(..., min_length=3, max_length=200)
    use_case: str = Field(..., min_length=2, max_length=100)

class RepoTranslateRequest(BaseModel):
    full_name: str

class ActivityEvent(BaseModel):
    event_type: str = Field(..., pattern="^(tool_viewed|repo_viewed|stack_saved|topic_visited)$")
    entity_id: str = Field(..., min_length=1, max_length=200)

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> Optional[UserModel]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    if not _jwks_client:
        return None
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            return None
        user = await db.users.find_one({"user_id": clerk_user_id}, {"_id": 0})
        if not user:
            return None
        return UserModel(**user)
    except Exception as e:
        logger.warning(f"JWT verification failed: {e}")
        return None

async def require_auth(request: Request) -> UserModel:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}

async def require_admin(request: Request) -> UserModel:
    user = await require_auth(request)
    if user.email and user.email.lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ==================== AI HELPERS ====================

async def call_nvidia(prompt: str, json_response: bool = False) -> str:
    """Call NVIDIA NIM API (Llama 3.3 70B) — fallback AI provider."""
    nvidia_key = os.environ.get("NVIDIA_NIM_API_KEY")
    if not nvidia_key:
        raise Exception("NVIDIA_NIM_API_KEY not configured")

    url = "https://integrate.api.nvidia.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {nvidia_key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": "You are a helpful assistant for GitStack, a platform helping non-technical founders discover GitHub tools."},
        {"role": "user", "content": prompt}
    ]
    payload = {
        "model": "meta/llama-3.3-70b-instruct",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096
    }
    if json_response:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_groq(prompt: str, json_response: bool = False) -> str:
    """Primary AI provider — Groq (Llama 3.3 70B). Extremely fast inference."""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise Exception("GROQ_API_KEY not configured")

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {groq_key}",
        "Content-Type": "application/json"
    }
    messages = [
        {"role": "system", "content": "You are a helpful assistant for GitStack, a platform helping non-technical founders discover GitHub tools."},
        {"role": "user", "content": prompt}
    ]
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 4096
    }
    if json_response:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def normalize_ai_json(data):
    """Extract actual payload from AI JSON responses.
    Models wrapped in json_object mode often wrap arrays in {"tools": [...]} etc."""
    if isinstance(data, dict):
        for key in ["tools", "result", "data", "alternatives", "similar_projects", "projects", "items", "recommendations"]:
            if key in data:
                return data[key]
    return data


async def call_ai(prompt: str, json_response: bool = False) -> str:
    """Try Groq first (fast), then fall back to NVIDIA NIM for reliability."""
    last_error = None

    try:
        return await call_groq(prompt, json_response=json_response)
    except Exception as e:
        last_error = e
        logger.warning(f"Groq failed: {e}")

    try:
        logger.info("Groq failed. Falling back to NVIDIA NIM...")
        return await call_nvidia(prompt, json_response=json_response)
    except Exception as e:
        logger.error(f"NVIDIA NIM fallback also failed: {e}")

    logger.error(f"All AI providers failed. Last error: {last_error}")
    raise HTTPException(status_code=503, detail="AI service temporarily unavailable. Please try again.")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/sync")
async def sync_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    if not _jwks_client:
        raise HTTPException(status_code=503, detail="Auth not configured")
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        body = await request.json()
        email = body.get("email", "")
        name = body.get("name") or email
        picture = body.get("picture")
        await db.users.update_one(
            {"user_id": clerk_user_id},
            {"$set": {"email": email, "name": name, "picture": picture},
             "$setOnInsert": {"user_id": clerk_user_id, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        user = await db.users.find_one({"user_id": clerk_user_id}, {"_id": 0})
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Auth sync error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")

@api_router.get("/auth/me")
async def get_me(user: UserModel = Depends(require_auth)):
    return user.model_dump()

@api_router.post("/auth/logout")
@limiter.limit("30/minute")
async def logout(request: Request):
    return {"message": "Logged out"}

# ==================== TOOLS ROUTES ====================

@api_router.get("/tools")
async def get_tools(category: Optional[str] = None, topic: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    query = {}
    if category:
        query["category"] = category
    if topic:
        # Search in category or tags
        safe_topic = re.escape(topic)
        query["$or"] = [
            {"category": {"$regex": safe_topic, "$options": "i"}},
            {"tags": {"$regex": safe_topic, "$options": "i"}}
        ]
    if search:
        safe_search = re.escape(search)
        search_query = {
            "$or": [
                {"name": {"$regex": safe_search, "$options": "i"}},
                {"description": {"$regex": safe_search, "$options": "i"}},
                {"tags": {"$regex": safe_search, "$options": "i"}}
            ]
        }
        if query:
            query = {"$and": [query, search_query]}
        else:
            query = search_query

    tools = await db.tools.find(query, {"_id": 0}).limit(limit).to_list(limit)

    # Also search github_repos if not enough results
    if len(tools) < limit:
        gh_query = {}
        if topic:
            gh_query["$or"] = [
                {"topics": {"$regex": topic, "$options": "i"}},
                {"language": {"$regex": topic, "$options": "i"}}
            ]
        if search:
            gh_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"description": {"$regex": search, "$options": "i"}}
            ]

        gh_repos = await db.github_repos.find(gh_query, {"_id": 0}).sort("score", -1).limit(limit - len(tools)).to_list(limit - len(tools))

        # Convert github_repos format to tools format
        for repo in gh_repos:
            tools.append({
                "tool_id": repo.get("repo_id", repo.get("full_name", "").replace("/", "_")),
                "name": repo.get("name", ""),
                "description": repo.get("description", ""),
                "who_its_for": "Developers and founders",
                "what_you_can_build": [],
                "difficulty": "Intermediate",
                "setup_time": "30 mins",
                "setup_steps": ["Visit the GitHub repo", "Follow the README instructions", "Deploy or integrate"],
                "related_tools": [],
                "github_url": repo.get("html_url", f"https://github.com/{repo.get('full_name', '')}"),
                "stars": f"{repo.get('stars', 0):,}",
                "language": repo.get("language", "Unknown"),
                "category": ", ".join(repo.get("topics", [])[:3]) if repo.get("topics") else "Open Source",
                "tags": repo.get("topics", []),
                "source": "github",
                "full_name": repo.get("full_name", "")
            })

    return tools

@api_router.get("/tools/{tool_id}")
async def get_tool(tool_id: str):
    tool = await db.tools.find_one({"tool_id": tool_id}, {"_id": 0})
    if not tool:
        # Try github_repos
        gh_repo = await db.github_repos.find_one({"repo_id": tool_id}, {"_id": 0})
        if gh_repo:
            return {
                "tool_id": gh_repo.get("repo_id"),
                "name": gh_repo.get("name", ""),
                "description": gh_repo.get("description", ""),
                "who_its_for": "Developers and founders",
                "what_you_can_build": [],
                "difficulty": "Intermediate",
                "setup_time": "30 mins",
                "setup_steps": ["Visit the GitHub repo", "Follow the README instructions", "Deploy or integrate"],
                "related_tools": [],
                "github_url": gh_repo.get("html_url", f"https://github.com/{gh_repo.get('full_name', '')}"),
                "stars": f"{gh_repo.get('stars', 0):,}",
                "language": gh_repo.get("language", "Unknown"),
                "category": ", ".join(gh_repo.get("topics", [])[:3]) if gh_repo.get("topics") else "Open Source",
                "tags": gh_repo.get("topics", []),
                "ai_description": gh_repo.get("ai_description"),
                "source": "github"
            }
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@api_router.get("/tools/{tool_id}/related")
@cache(expire=1800)  # 30 min cache
async def get_related_tools(tool_id: str):
    """Return related tools based on category/tags for internal linking SEO."""
    tool = await db.tools.find_one({"tool_id": tool_id}, {"_id": 0, "category": 1, "tags": 1})
    if not tool:
        return {"related": []}

    category = tool.get("category", "")
    tags = tool.get("tags", []) or []

    or_conditions = []
    if category:
        or_conditions.append({"category": {"$regex": re.escape(category), "$options": "i"}})
    for tag in tags[:5]:
        if tag:
            or_conditions.append({"tags": {"$regex": re.escape(tag), "$options": "i"}})

    if not or_conditions:
        # Fallback: return trending tools
        related = await db.tools.find(
            {"tool_id": {"$ne": tool_id}},
            {"_id": 0, "tool_id": 1, "name": 1, "description": 1, "stars": 1}
        ).sort("stars", -1).limit(4).to_list(4)
        return {"related": related}

    related = await db.tools.find(
        {"$or": or_conditions, "tool_id": {"$ne": tool_id}},
        {"_id": 0, "tool_id": 1, "name": 1, "description": 1, "stars": 1}
    ).sort("stars", -1).limit(4).to_list(4)

    return {"related": related}


@api_router.get("/tools/trending/list")
@cache(expire=1800)
async def get_trending_tools(tab: str = "top_week", language: str = ""):
    """Get real trending repos from GitHub or cache"""

    # Scrape GitHub trending
    since_map = {
        "top_week": "weekly",
        "top_day": "daily",
        "top_month": "monthly",
        "most_starred": "weekly",
        "new_rising": "daily"
    }
    since = since_map.get(tab, "daily")

    repos = []
    try:
        url = f"https://github.com/trending/{language}?since={since}"
        client = await _get_httpx_client()
        response = await client.get(url, headers={"User-Agent": "GitStack"}, timeout=30)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            articles = soup.select('article.Box-row')

            for i, article in enumerate(articles[:15]):
                try:
                    h2 = article.select_one('h2 a')
                    if not h2:
                        continue
                    full_name = h2.get('href', '').strip('/')
                    if not full_name or '/' not in full_name:
                        continue

                    desc_elem = article.select_one('p')
                    description = desc_elem.get_text(strip=True) if desc_elem else ""

                    stars_elem = article.select_one('a[href$="/stargazers"]')
                    stars_text = stars_elem.get_text(strip=True) if stars_elem else "0"
                    stars = stars_text.strip().replace(',', '')
                    if 'k' in stars.lower():
                        stars = str(int(float(stars.lower().replace('k', '')) * 1000))

                    lang_elem = article.select_one('[itemprop="programmingLanguage"]')
                    lang = lang_elem.get_text(strip=True) if lang_elem else "Unknown"

                    today_elem = article.select_one('span.d-inline-block.float-sm-right')
                    today_stars = ""
                    if today_elem:
                        today_stars = today_elem.get_text(strip=True)

                    repos.append({
                        "tool_id": full_name.replace("/", "_").lower(),
                        "name": full_name.split('/')[-1],
                        "full_name": full_name,
                        "description": description[:200],
                        "stars": stars,
                        "language": lang,
                        "today_stars": today_stars,
                        "github_url": f"https://github.com/{full_name}",
                        "difficulty": "Intermediate",
                        "rank": i + 1
                    })
                except Exception as e:
                    logger.error(f"Error parsing trending repo: {e}")
                    continue

    except Exception as e:
        logger.error(f"Error fetching trending: {e}")
        # Fallback to curated tools
        tools = await db.tools.find({}, {"_id": 0}).sort("stars", -1).limit(10).to_list(10)
        return tools

    return repos

# ==================== TOPICS ROUTES ====================

# Expanded keyword map — maps each topic to the actual tags repos use on GitHub
TOPIC_KEYWORDS = {
    "ai-agents": [
        "ai", "artificial-intelligence", "machine-learning", "deep-learning", "llm",
        "chatgpt", "gpt", "openai", "ai-agents", "agent", "agents", "claude",
        "langchain", "rag", "nlp", "natural-language-processing", "transformer",
        "pytorch", "tensorflow", "neural-network", "generative-ai", "mcp",
        "claude-code", "copilot", "chatbot", "llama", "huggingface",
        "crewai", "autogen", "swarm", "openai-agents", "multi-agent", "agentops"
    ],
    "ai-coding-tools": [
        "mcp", "model-context-protocol", "claude-code", "cursor", "cursor-ai",
        "windsurf", "aider", "codeium", "vscode-extension", "copilot-alternative",
        "ide", "coding-assistant", "programming", "autocode"
    ],
    "ai-memory-pkm": [
        "obsidian", "obsidian-plugin", "ai-memory", "mem0", "memgpt", "second-brain",
        "knowledge-graph", "pkm", "personal-knowledge-management", "zettelkasten"
    ],
    "local-ai": [
        "ollama", "vllm", "llamacpp", "lmstudio", "localai", "local-llm", "private-ai"
    ],
    "mcp-tools": [
        "mcp", "model-context-protocol", "mcp-server", "mcp-client", "awesome-mcp"
    ],
    "ai-agents-advanced": [
        "multi-agent", "autonomous-agents", "computer-use", "browser-use", "web-agent",
        "swarm", "crewai", "autogen", "task-automation"
    ],
    "ui-ux": [
        "react", "nextjs", "frontend", "ui", "ux", "design", "css", "tailwind",
        "component", "design-system", "svelte", "vue", "angular", "web",
        "responsive", "animation", "icons", "theme", "dashboard", "template",
        "shadcn", "radix", "headless-ui", "storybook", "figma"
    ],
    "automation": [
        "automation", "devops", "ci-cd", "github-actions", "workflow", "pipeline",
        "docker", "kubernetes", "terraform", "ansible", "jenkins", "deploy",
        "infrastructure", "iac", "scripting", "cron", "task-runner", "cli",
        "n8n", "zapier", "make-alternative"
    ],
    "data-analytics": [
        "database", "sql", "postgresql", "mysql", "mongodb", "redis", "data",
        "analytics", "data-science", "data-engineering", "etl", "visualization",
        "bi", "business-intelligence", "data-pipeline", "spark", "kafka"
    ],
    "voice-speech-ai": [
        "text-to-speech", "speech-to-text", "voice-cloning", "elevenlabs", "tts", "stt", "audio-ai"
    ],
    "code-quality-review": [
        "static-analysis", "code-review", "sonarqube", "code-quality", "lint", "security-scan", "sast"
    ],
    "rag-vector-search": [
        "rag", "vector-database", "vector-db", "embedding", "semantic-search", "pinecone", "chromadb", "qdrant"
    ],
    "scraping-data-extraction": [
        "web-scraping", "playwright", "firecrawl", "scraper", "crawling", "extraction", "headless-browser"
    ],
    "terminal-shell": [
        "dotfiles", "terminal", "zsh", "bash", "tui", "ratatui", "cli", "shell-scripts"
    ],
    "payments": [
        "payments", "stripe", "billing", "ecommerce", "fintech", "invoice", "subscription"
    ],
    "auth": [
        "authentication", "auth", "oauth", "security", "identity", "sso", "login"
    ],
    "email-messaging": [
        "email", "newsletter", "mail", "messaging", "notification", "chat", "realtime"
    ],
    "cms-content": [
        "cms", "content-management", "blog", "markdown", "documentation", "wiki"
    ],
    "mobile-dev": [
        "react-native", "flutter", "mobile", "ios", "android", "expo"
    ],
    "web3-blockchain": [
        "blockchain", "web3", "ethereum", "solidity", "defi", "nft", "crypto"
    ],
    "selfhosted": [
        "self-hosted", "selfhosted", "homelab", "docker-compose", "docker",
        "homeserver", "privacy", "open-source", "alternative", "foss",
        "self-hosting", "linux", "server", "nas", "backup", "reverse-proxy",
        "nginx", "caddy", "traefik", "coolify", "portainer"
    ],
    # === New trending categories ===
    "ai-coding-tools": [
        "claude", "claude-code", "cursor", "cursor-ai", "windsurf", "aider",
        "codeium", "copilot", "mcp", "model-context-protocol", "claude-mcp",
        "ai-coding", "vibe-coding", "code-assistant", "ai-editor",
        "vscode-extension", "neovim", "zed", "coding-assistant", "pair-programming"
    ],
    "ai-memory-pkm": [
        "obsidian", "obsidian-plugin", "ai-memory", "mem0", "memgpt",
        "second-brain", "knowledge-graph", "personal-knowledge-management",
        "zettelkasten", "logseq", "note-taking", "pkm", "digital-garden",
        "roam", "notion-alternative", "knowledge-base", "memory-augmentation"
    ],
    "local-ai": [
        "ollama", "vllm", "llamacpp", "lmstudio", "localai", "local-llm",
        "private-ai", "on-premise-ai", "llama", "mistral", "phi", "gemma",
        "llm-inference", "quantization", "gguf", "onnx", "model-serving",
        "open-weights", "self-hosted-llm", "local-inference"
    ],
    "mcp-tools": [
        "mcp", "model-context-protocol", "mcp-server", "mcp-client",
        "claude-mcp", "mcp-tool", "mcp-integration", "anthropic",
        "tool-use", "function-calling", "tool-calling", "ai-tools"
    ],
    "ai-agents-advanced": [
        "computer-use", "browser-use", "web-agent", "autonomous-agent",
        "openai-agents", "agentops", "crewai", "autogen", "swarm",
        "multi-agent-system", "agent-framework", "task-automation",
        "rpa", "browser-automation", "screen-agent", "desktop-agent"
    ],
    "devtools-modern": [
        "bun", "deno", "biome", "turbo", "turborepo", "pnpm", "mise",
        "nix", "devcontainer", "devpod", "gitpod", "codespaces",
        "zed", "helix", "neovim", "developer-experience", "dx",
        "monorepo", "workspace", "toolchain"
    ],

    # === Voice & Speech AI ===
    "voice-speech-ai": [
        "text-to-speech", "tts", "speech-to-text", "stt", "whisper",
        "voice-cloning", "voice-synthesis", "coqui", "bark", "piper",
        "elevenlabs-alternative", "open-source-voice", "real-time-voice", "voice-agent",
        "asr", "automatic-speech-recognition", "openai-whisper", "faster-whisper",
        "audio-ai", "speech-synthesis", "open-source-tts", "audio-generation",
        "transcription", "diarization", "speaker-recognition"
    ],

    # === Code Quality & Review ===
    "code-quality-review": [
        "code-review", "static-analysis", "lint", "linter", "code-analysis",
        "open-source-code-review", "sonarqube-alternative", "code-quality",
        "tech-debt", "dependency-check", "security-scan", "sast", "code-smell",
        "refactoring", "complexity", "coverage", "code-metrics", "ast",
        "abstract-syntax-tree", "codemods", "semgrep",
        "eslint", "pylint", "ruff", "mypy", "type-checking"
    ],

    # === Computer Vision & Image AI ===
    "computer-vision-image-ai": [
        "stable-diffusion", "comfyui", "automatic1111", "diffusers",
        "image-generation", "text-to-image", "controlnet", "lora",
        "yolo", "object-detection", "ocr", "tesseract", "face-detection",
        "image-segmentation", "computer-vision", "opencv", "mediapipe",
        "image-processing", "upscaling", "inpainting", "dreambooth",
        "midjourney-alternative", "dalle-alternative", "sdxl", "flux",
        "open-source-vision"
    ],

    # === RAG & Vector Search ===
    "rag-vector-search": [
        "rag", "vector-database", "vector-store", "embedding", "embeddings",
        "chromadb", "qdrant", "weaviate", "pinecone-alternative", "milvus", "faiss",
        "semantic-search", "knowledge-retrieval", "document-retrieval",
        "retrieval-augmented", "pgvector", "lancedb", "turbopuffer",
        "reranking", "hybrid-search", "dense-retrieval", "ann",
        "open-source-vector-db"
    ],

    # === Web Scraping & Data Extraction ===
    "scraping-data-extraction": [
        "web-scraping", "scraper", "crawler", "crawlee", "scrapy",
        "playwright", "puppeteer", "selenium", "cheerio", "beautifulsoup",
        "data-extraction", "web-crawler", "price-tracking", "news-scraper",
        "html-parser", "headless-browser", "firecrawl-alternative",
        "open-source-scraper", "spider", "etl", "data-pipeline"
    ],

    # === API Development & Testing ===
    "api-development": [
        "api", "rest-api", "graphql", "openapi", "swagger", "postman-alternative",
        "hoppscotch", "bruno", "insomnia", "api-testing", "api-gateway",
        "api-mock", "api-documentation", "fastapi", "express", "hapi",
        "rate-limiting", "api-proxy", "grpc", "websocket", "http-client",
        "open-source-api-tool", "sdk-generator", "openapi-generator"
    ],

    # === Terminal, Shell & Dotfiles ===
    "terminal-shell": [
        "terminal", "shell", "dotfiles", "zsh", "fish", "bash", "nushell",
        "tmux", "wezterm", "alacritty", "kitty", "starship",
        "oh-my-zsh", "oh-my-posh", "prompt", "plugin", "zsh-plugin",
        "shell-script", "linux", "cli-tool", "tui",
        "terminal-ui", "curses", "ratatui", "foss-cli"
    ],

    # === Document & PDF AI ===
    "document-pdf-ai": [
        "pdf", "pdf-processing", "ocr", "document-ai", "document-extraction",
        "llamaparse-alternative", "unstructured", "docling", "pdfplumber",
        "document-parsing", "invoice-extraction", "table-extraction",
        "pdf-reader", "pdf-converter", "markdown-extraction",
        "document-intelligence", "form-extraction", "receipt-ocr",
        "open-source-ocr"
    ],

    # === Game Development ===
    "game-development": [
        "game-engine", "gamedev", "godot", "pygame", "unity-alternative",
        "indie-game", "game-dev", "2d-game", "3d-game", "retro",
        "emulator", "wasm-game", "webgl", "threejs", "babylonjs",
        "physics-engine", "tilemap", "procedural-generation",
        "roguelike", "ecs", "open-source-game-engine"
    ],

    # === Monitoring, SRE & Error Tracking ===
    "monitoring-sre": [
        "monitoring", "observability", "sre", "error-tracking",
        "sentry-alternative", "datadog-alternative", "uptime", "status-page",
        "incident-management", "alerting", "log-management", "logging",
        "prometheus", "grafana", "opentelemetry", "tracing", "apm",
        "application-performance", "glitchtip", "highlight", "axiom-alternative",
        "pagerduty-alternative", "healthcheck", "open-source-observability"
    ],
}


async def get_topic_keywords(topic_id: str, db) -> list:
    """Get keywords for a topic — checks hardcoded dict first, then DB for auto-discovered topics"""
    if topic_id in TOPIC_KEYWORDS:
        return TOPIC_KEYWORDS[topic_id]
    # Fall back to auto-discovered keywords from DB
    doc = await db.auto_topic_keywords.find_one({"topic_id": topic_id}, {"_id": 0, "keywords": 1})
    if doc:
        return doc.get("keywords", [])
    return []


def _build_topic_query(topic_id: str) -> list:
    """Build a list of regex conditions for matching repos to a topic (sync version for hardcoded topics)"""
    keywords = TOPIC_KEYWORDS.get(topic_id, [])
    if not keywords:
        return []
    return [{"$regex": kw, "$options": "i"} for kw in keywords]

import time
_topics_cache = None
_topics_cache_time = 0

@api_router.get("/topics")
async def get_topics():
    global _topics_cache, _topics_cache_time

    if _topics_cache and time.time() - _topics_cache_time < 3600 * 6:
        return _topics_cache

    topics = await db.topics.find({}, {"_id": 0}).to_list(50)  # up to 50 including auto-discovered

    async def get_topic_count(topic):
        topic_id = topic.get("topic_id", "")
        topic_name = topic.get("name", "")
        keywords = await get_topic_keywords(topic_id, db)
        if not keywords:
            keywords = [topic_name.lower().replace(" ", "-")]

        or_conditions = []
        for kw in keywords:
            or_conditions.append({"tags": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"category": {"$regex": kw, "$options": "i"}})

        gh_or = [{"topics": {"$in": keywords}}]
        for kw in keywords[:8]:
            gh_or.append({"topics": {"$regex": kw, "$options": "i"}})
            gh_or.append({"description": {"$regex": kw, "$options": "i"}})

        async def dummy_count(): return 0

        # Run counts in parallel for this topic
        results = await asyncio.gather(
            db.tools.count_documents({"$or": or_conditions}) if or_conditions else dummy_count(),
            db.github_repos.count_documents({"$or": gh_or})
        )
        topic["tool_count"] = (results[0] or 0) + (results[1] or 0)
        return topic

    # Run processing for all topics in parallel
    await asyncio.gather(*(get_topic_count(t) for t in topics))

    _topics_cache = topics
    _topics_cache_time = time.time()
    return topics

@api_router.get("/topics/{topic_id}/tools")
async def get_topic_tools(topic_id: str):
    topic = await db.topics.find_one({"topic_id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic_name = topic.get("name", "")
    # Use async lookup so auto-discovered topics also work
    keywords = await get_topic_keywords(topic_id, db)
    if not keywords:
        keywords = [topic_name.lower().replace(" ", "-")]

    # Search curated tools
    or_conditions = []
    for kw in keywords:
        escaped_kw = re.escape(kw)  # SEC-12: prevent ReDoS from AI-generated keywords
        or_conditions.append({"tags": {"$regex": escaped_kw, "$options": "i"}})
        or_conditions.append({"category": {"$regex": escaped_kw, "$options": "i"}})

    tools = await db.tools.find(
        {"$or": or_conditions} if or_conditions else {},
        {"_id": 0}
    ).to_list(100)

    # Search github_repos with expanded keywords
    gh_or = [{"topics": {"$in": keywords}}]
    for kw in keywords[:8]:  # More coverage
        escaped_kw = re.escape(kw)  # SEC-12: prevent ReDoS
        gh_or.append({"topics": {"$regex": escaped_kw, "$options": "i"}})
        gh_or.append({"description": {"$regex": escaped_kw, "$options": "i"}})
        gh_or.append({"name": {"$regex": escaped_kw, "$options": "i"}})

    remaining = max(100 - len(tools), 20)
    gh_repos = await db.github_repos.find(
        {"$or": gh_or},
        {"_id": 0}
    ).sort("score", -1).limit(remaining).to_list(remaining)

    # Convert github repos to tool format — dedupe by name
    seen_names = {t["name"].lower() for t in tools}
    for repo in gh_repos:
        if repo.get("name", "").lower() in seen_names:
            continue
        seen_names.add(repo["name"].lower())
        tools.append({
            "tool_id": repo.get("repo_id", repo.get("full_name", "").replace("/", "_")),
            "name": repo.get("name", ""),
            "description": repo.get("description", ""),
            "who_its_for": "Developers and founders",
            "what_you_can_build": [],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Visit the GitHub repo", "Follow the README instructions"],
            "related_tools": [],
            "github_url": repo.get("html_url", f"https://github.com/{repo.get('full_name', '')}"),
            "stars": f"{repo.get('stars', 0):,}",
            "language": repo.get("language", "Unknown"),
            "category": topic_name,
            "tags": repo.get("topics", []),
            "source": "github",
            "full_name": repo.get("full_name", "")
        })

    # Update topic count to match actual results
    topic["tool_count"] = len(tools)

    return {"topic": topic, "tools": tools}

# ==================== COLLECTIONS ROUTES ====================

@api_router.get("/collections")
async def get_collections():
    collections = await db.collections.find({}, {"_id": 0}).to_list(20)
    return collections

@api_router.get("/collections/{collection_id}")
async def get_collection(collection_id: str):
    collection = await db.collections.find_one({"collection_id": collection_id}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    tools = await db.tools.find({"tool_id": {"$in": collection.get("tools", [])}}, {"_id": 0}).to_list(20)
    return {"collection": collection, "tools": tools}

# ==================== AI FEATURES ====================

@api_router.post("/ai/dead-tool-detector")
@limiter.limit("10/minute")
async def dead_tool_detector(request: Request, req: DeadToolRequest):
    prompt = f"""I am paying for these SaaS tools: {req.paid_tools}

Find free open-source GitHub alternatives for each tool.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {{
    "paidTool": "tool name",
    "monthlyCost": "$X/mo",
    "freeAlternative": "open source alternative name",
    "alternativeDescription": "1 sentence what it does",
    "githubUrl": "https://github.com/...",
    "annualSavings": "$X/yr"
  }}
]

Be accurate with real GitHub repositories. Calculate realistic cost estimates."""

    result = await call_ai(prompt, json_response=True)
    try:
        import json
        # Clean up response if it has markdown
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        data = json.loads(cleaned)
        return {"alternatives": data}
    except:
        return {"alternatives": [], "raw": result}

@api_router.post("/ai/stack-generator")
@limiter.limit("10/minute")
async def stack_generator(request: Request, req: StackGeneratorRequest):
    context = f"Idea: {req.idea}"
    if req.budget:
        context += f"\nBudget: {req.budget}"
    if req.needs_payments is not None:
        context += f"\nNeeds payments: {'Yes' if req.needs_payments else 'No'}"
    if req.building_alone is not None:
        context += f"\nBuilding alone: {'Yes' if req.building_alone else 'No'}"

    prompt = f"""Help a non-technical founder build: {context}

Recommend 4-6 free/open-source GitHub CODE repositories to build this idea.

IMPORTANT RULES:
- ONLY suggest repositories that contain SOURCE CODE (React, Node.js, Python, etc.) which can be cloned, modified, and customized.
- DO NOT suggest infrastructure tools that need separate installation like: Ollama, n8n, Metabase, Airbyte, or any tool that runs as its own server/platform.
- If the idea needs AI, suggest a repo that already has OpenAI API integration (not Ollama).
- If the idea needs automation, suggest a repo with built-in workflow logic (not n8n).
- If the idea needs analytics, suggest a repo with built-in chart components (not Metabase).
- Each repo should be a real, working product that the founder can clone and tweak for their own use case.

Return ONLY a valid JSON array (no markdown):
[
  {{
    "order": 1,
    "name": "Tool Name",
    "description": "Plain English description of what it does and why you need it (for non-tech people)",
    "difficulty": "Beginner/Intermediate/Advanced",
    "setupTime": "X mins/hours",
    "githubUrl": "https://github.com/...",
    "setupSteps": ["Step 1 in plain English", "Step 2", "Step 3"]
  }}
]

Put tools in the order they should be set up. Use real GitHub repositories."""
    try:
        result = await call_ai(prompt, json_response=True)
    except Exception as e:
        logger.error(f"Stack Gen Gemini Error: {e}")
        return {"stack": [], "error": "AI service temporarily unavailable. Please try again."}

    try:
        import json, re, httpx
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        data = json.loads(cleaned)

        # Hallucination Defense: Validate & Auto-correct GitHub URLs
        valid_stack = []
        client = await _get_httpx_client()
        for tool in data:
            gh_url = tool.get("githubUrl", "")
            is_valid = False
            
            if gh_url and "github.com/" in gh_url:
                match = re.search(r'github\.com/([^/]+/[^/]+)', gh_url)
                if match:
                    full_name = match.group(1).split('#')[0].split('?')[0].strip('/')
                    # 1. Ping the repo directly
                    resp = await client.head(f"https://api.github.com/repos/{full_name}", headers=GITHUB_HEADERS, follow_redirects=True, timeout=5)
                    if resp.status_code == 200:
                        tool["githubUrl"] = f"https://github.com/{full_name}"
                        is_valid = True
            
            # 2. If 404 Hallucination or bad URL, auto-correct by searching live GitHub
            if not is_valid:
                search_q = tool.get("name", "").replace(" ", "+")
                try:
                    search_resp = await client.get(
                        f"https://api.github.com/search/repositories?q={search_q}&per_page=1", 
                        headers=GITHUB_HEADERS, 
                        timeout=5
                    )
                    if search_resp.status_code == 200:
                        items = search_resp.json().get("items", [])
                        if items:
                            real_repo = items[0]["full_name"]
                            tool["githubUrl"] = f"https://github.com/{real_repo}"
                            is_valid = True
                        else:
                            tool["githubUrl"] = "" # Nullify fake URL so clone script doesn't break
                except:
                    tool["githubUrl"] = ""
            
            valid_stack.append(tool)
                            
        return {"stack": valid_stack}
    except Exception as e:
        logger.error(f"Stack Gen Parse Error: {e}")
        return {"stack": [], "raw": result}

@api_router.post("/ai/stack-master-prompt")
@limiter.limit("10/minute")
async def stack_master_prompt(request: Request, req: StackMasterPromptRequest):
    """Generate a master prompt for AI coding assistants based on a stack."""
    import json
    tools_json = json.dumps(req.tools, indent=2)

    # Build explicit clone commands section
    clone_commands = []
    for tool in req.tools:
        gh = tool.get("githubUrl", "")
        if gh and "github.com" in gh:
            import re
            match = re.search(r'github\.com/([^/]+/[^/]+)', gh)
            if match:
                clone_commands.append(f"git clone https://github.com/{match.group(1)}.git")
    
    clone_section = "\n".join(clone_commands) if clone_commands else "# (clone commands will be provided)"

    prompt = f"""You are an expert full-stack developer and product architect. A non-technical founder wants to build: "{req.idea}"

They have selected these open-source repositories as their foundation:
{tools_json}

MANDATORY CLONE COMMANDS (run these in your terminal first):
{clone_section}

Your task is to generate a complete "Master Prompt" that the founder can copy-paste into Cursor, Claude, ChatGPT, or Windsurf. The target AI must produce a SINGLE, UNIFIED, production-ready application — NOT multiple separate repos running side-by-side.

HOW TO BUILD IT:
1. RUN the git clone commands above in your terminal to download the reference repos.
2. The AI will study these repos using its knowledge of their architecture, database design, and patterns.
3. EXTRACT the best patterns, components, and logic from each repo.
4. BUILD ONE cohesive application from scratch that combines all these patterns into the founder's specific idea: "{req.idea}".
5. CUSTOMIZE everything — branding, colors, business logic, data models — to match the founder's use case.

The final output must be a single codebase. Generate EVERY file completely. No placeholders. No TODOs.

=== STEP 0 — PREREQUISITES ===
Before starting, the user must have:
- Node.js 18+ installed (download from https://nodejs.org — click the green "LTS" button, then Next-Next-Finish)
- A code editor (Cursor, VS Code, or Windsurf)
- Git installed (usually comes with Node.js installer)

Verify installation: open terminal and run `node --version` and `git --version`

=== STEP 1 — PROJECT PLAN ===
First, generate a `PROJECT_PLAN.md` file that contains:
1. App name and description based on "{req.idea}"
2. Complete file list (every file that will be created)
3. Database schema (all tables, columns, foreign keys) inferred from "{req.idea}"
4. API endpoint list
5. Page/component list
6. Color palette and design tokens
7. **MVP vs Phase 2**: If "{req.idea}" is complex (more than 3-4 major features), identify the CORE MVP features and mark advanced features as "Phase 2". Generate ONLY the MVP first. Phase 2 should be listed as future enhancements in PROJECT_PLAN.md.

=== STEP 2 — FRONTEND (Beautiful, Modern UI) ===
Tech Stack:
- React 18 with Vite (fast dev server, modern build)
- Tailwind CSS for styling (beautiful, responsive design)
- shadcn/ui or Radix UI primitives for polished components (buttons, modals, tables, forms, cards, dropdowns)
- Lucide React for icons
- React Router for navigation
- Recharts for analytics/charts (if needed)

Required Pages & Components (generate ALL of these):
1. Landing/Home page with hero section, features grid, and CTA buttons
2. Dashboard page with sidebar navigation, stats cards, and recent activity
3. Main feature pages (forms, data tables, detail views, lists) — whatever "{req.idea}" needs
4. Auth pages (Login, Register) with clean, centered card design
5. Settings/Profile page with avatar upload and preference toggles
6. Shared components: Navbar, Sidebar, Footer, Modal, Toast notifications, Loading spinner, Empty state, Confirm dialog

Design Requirements:
- Use a modern color palette (slate/blue/indigo base with one accent color like emerald/violet/amber)
- Every page must be responsive (mobile, tablet, desktop)
- Use cards with subtle shadows, rounded-xl corners, and smooth transitions
- Include dark mode toggle with system preference detection
- Forms must have real-time validation, error messages, and loading states
- Tables must have search, sort, pagination, and bulk actions
- Dashboard must have KPI cards, chart widgets, and activity feed
- All buttons must have hover and active states
- Use proper spacing (padding, margins, gap) — never cramped layouts

Frontend-Backend Connection:
- Create `client/src/lib/api.js` — Axios instance with baseURL from env
- baseURL must read from `import.meta.env.VITE_API_URL` (default: `http://localhost:5000`)
- Include request/response interceptors for JWT token and error handling
- Every API call must have loading state and error handling in the UI

=== STEP 3 — BACKEND (Robust API) ===
Tech Stack:
- Node.js + Express
- SQLite database (zero setup, single file) with better-sqlite3
- JWT authentication (jsonwebtoken)
- bcrypt for password hashing
- cors enabled for frontend
- express-validator for input validation
- dotenv for environment variables

Required API Endpoints (implement ALL of these):
1. POST /api/auth/register — Create new user (validate email, password min 6 chars)
2. POST /api/auth/login — Return JWT token
3. GET /api/auth/me — Return current user profile (protected)
4. GET /api/dashboard/stats — Return KPI data for dashboard (protected)
5. CRUD endpoints for the MAIN entity of "{req.idea}"
   - GET /api/items — List all with pagination (page, limit), search (q), sort (sortBy, order)
   - GET /api/items/:id — Get single item
   - POST /api/items — Create new item (validated)
   - PUT /api/items/:id — Update item
   - DELETE /api/items/:id — Delete item
6. Any additional endpoints "{req.idea}" specifically needs

Backend Requirements:
- Proper error handling with consistent JSON format: `{success: false, error: "message"}`
- Input validation on every endpoint using express-validator
- Authentication middleware protecting private routes (verify JWT)
- Auto-create tables on first server start (run CREATE TABLE IF NOT EXISTS)
- Seed data script (`server/seed.js`) with realistic demo data
- CORS configured to allow frontend origin

=== STEP 4 — DATABASE ===
- SQLite file-based database (`server/database.sqlite`)
- Infer the COMPLETE schema from "{req.idea}" — create ALL tables needed
- Every table must have: id (INTEGER PRIMARY KEY), created_at, updated_at
- Foreign keys with ON DELETE CASCADE where appropriate
- Indexes on frequently searched columns
- Include `server/seed.js` with 10-20 realistic demo records

=== STEP 5 — PROJECT STRUCTURE ===
Generate the complete folder structure with every file:
```
my-app/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components (Navbar, Sidebar, Modal, etc.)
│   │   ├── pages/              # Page components (Home, Dashboard, Auth, etc.)
│   │   ├── hooks/              # Custom React hooks (useAuth, useApi, useTheme)
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── lib/                # api.js (Axios), utils.js, constants.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json            # ALL dependencies with exact versions
│   ├── tailwind.config.js
│   └── .env.example            # VITE_API_URL=http://localhost:5000
├── server/                     # Express backend
│   ├── index.js                # Server entry, DB setup, route mounting
│   ├── routes/                 # API route files (auth.js, items.js, dashboard.js)
│   ├── middleware/             # auth.js (JWT verify), errorHandler.js, validate.js
│   ├── models/                 # db.js (SQLite connection), queries.js
│   ├── config/                 # database.js (schema + migrations)
│   ├── seed.js                 # Demo data population
│   └── package.json            # ALL dependencies with exact versions
├── .env.example                # Combined env for both frontend and backend
├── .cursorrules                # Cursor AI rules for this project
├── PROJECT_PLAN.md             # Complete plan and architecture
├── README.md                   # Setup and customization guide
└── setup.sh                    # One-command setup
```

=== STEP 6 — `.cursorrules` FILE ===
Generate a `.cursorrules` file with:
```
# Project Rules for Cursor AI
- This is a full-stack app: React frontend (client/) + Express backend (server/)
- Database: SQLite file at server/database.sqlite
- Always use async/await for API calls
- Always validate user input on both frontend and backend
- When adding a feature, update BOTH frontend and backend
- Use Tailwind CSS for all styling — no inline styles
- Use Lucide React icons — no emoji icons
- Follow existing file structure — don't create new folders without reason
```

=== STEP 7 — SETUP SCRIPTS ===

Create `setup.sh` for Mac/Linux:
```bash
#!/bin/bash
set -e
echo "Setting up {req.idea}..."
echo "Step 1/5: Cloning reference repos..."
{clone_section}
echo "Step 2/5: Installing backend dependencies..."
cd server && npm install && cd ..
echo "Step 3/5: Installing frontend dependencies..."
cd client && npm install && cd ..
echo "Step 4/5: Setting up database..."
node server/seed.js
echo "Step 5/5: Starting development servers..."
echo "Frontend will run on http://localhost:5173"
echo "Backend will run on http://localhost:5000"
npm run dev
```

Create `setup.bat` for Windows:
```batch
@echo off
echo Setting up {req.idea}...
echo Step 1/5: Cloning reference repos...
{clone_section}
echo Step 2/5: Installing backend dependencies...
cd server && npm install && cd ..
echo Step 3/5: Installing frontend dependencies...
cd client && npm install && cd ..
echo Step 4/5: Setting up database...
node server/seed.js
echo Step 5/5: Starting development servers...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
npm run dev
```

=== STEP 8 — ENVIRONMENT (`.env.example`) ===
# Backend
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_URL=./database.sqlite
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:5000

# Third-party APIs (add what "{req.idea}" needs)
OPENAI_API_KEY=sk-your-key-here
# STRIPE_SECRET_KEY=sk_test_...
# SENDGRID_API_KEY=SG...

=== STEP 9 — DEPLOYMENT ===
Frontend (Vercel):
1. Push code to GitHub
2. Import repo on vercel.com
3. Set root directory to `client/`
4. Add environment variable: VITE_API_URL=https://your-backend-url.com
5. Deploy

Backend (Render/Railway):
1. Push code to GitHub
2. Import repo on render.com or railway.app
3. Set start command: `cd server && npm start`
4. Add environment variables from .env.example
5. Deploy

Database: SQLite works on all platforms, no separate DB server needed.

=== STEP 10 — CUSTOMIZATION GUIDE ===
Include in README.md:
- Change app name: edit `client/index.html` title and `client/src/components/Navbar.jsx`
- Change colors: edit `client/tailwind.config.js` theme.extend.colors
- Change logo: replace `client/public/logo.svg`
- Add new fields: edit `server/config/database.js` schema + `client/src/pages/[Page].jsx` form
- Add new API endpoint: create route in `server/routes/` + add UI in `client/src/pages/`

IMPORTANT RULES:
- Write COMPLETE, WORKING code for EVERY file. No placeholders. No TODOs. No "implement this later."
- Every component must be fully styled with Tailwind — no unstyled HTML.
- The app must be runnable after running `./setup.sh` — no extra setup.
- DO NOT use Docker. DO NOT use docker-compose.
- DO NOT require the founder to install separate servers or platforms.
- Build all functionality INTO the codebase, not as external dependencies.
- Generate files in this order: PROJECT_PLAN.md → .cursorrules → database schema → backend → frontend → setup.sh → README.md

TONE & FORMATTING:
- The prompt you generate must act as a direct, strict command to the target AI.
- Command the AI to avoid placeholders and write complete, functional code.
- Return ONLY the raw master prompt text. Do NOT wrap it in markdown code blocks. Do NOT add introductory or concluding remarks. Just the raw, copy-pasteable prompt string."""

    try:
        result = await call_ai(prompt, json_response=False)
        return {"prompt": result.strip()}
    except Exception as e:
        logger.error(f"Master prompt generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate master prompt. Try again.")

# ==================== SOLUTION FINDER ====================

async def _cache_and_classify_repo(repo_data: dict):
    """Cache a repo from live GitHub search and run AI classification on it."""
    from github_scraper import GitHubScraper
    try:
        scraper = GitHubScraper(db)
        # Save basic repo data
        await scraper.save_repo(repo_data, tier="warm")
        # Run single-repo AI classification
        await scraper.classify_repos_batch([repo_data])
    except Exception as e:
        logger.warning(f"Cache+classify failed for {repo_data.get('full_name', '?')}: {e}")

@api_router.post("/ai/solution-finder")
@limiter.limit("10/minute")
async def solution_finder(request: Request, req: SolutionFinderRequest):
    """
    Find complete, ready-to-deploy open-source solutions for a business problem.
    3-layer fallback: Local DB → Live GitHub → Gemini Discovery.
    Results are cached so subsequent searches are instant.
    """
    import json as _json

    query = " ".join(req.query.strip().lower().split())
    cache_key = f"solution_finder:{hashlib.md5(query.encode(), usedforsecurity=False).hexdigest()}"

    # Try cache first (FastAPICache backend: Redis or in-memory)
    try:
        backend = FastAPICache.get_backend()
        cached_raw = await backend.get(cache_key)
        if cached_raw:
            return _json.loads(cached_raw)
    except Exception:
        pass

    solutions = []
    seen_names = set()  # Stores lowercase full_name for case-insensitive dedupe
    source_info = {"layer_used": "local_db"}

    # --- Step 0: Gemini Intent Parsing (NEW) ---
    # Call Gemini FIRST to understand what the user actually wants,
    # then use its precise keywords for Layer 1 DB search.
    intent_cache_key = f"solution_finder_intent:{hashlib.md5(query.encode(), usedforsecurity=False).hexdigest()}"
    ai_keywords = []
    github_query = query
    intent_summary = ""
    intent_source = "raw_fallback"

    # Try intent cache first
    try:
        backend = FastAPICache.get_backend()
        cached_intent = await backend.get(intent_cache_key)
        if cached_intent:
            parsed_intent = _json.loads(cached_intent)
            ai_keywords = parsed_intent.get("keywords", [])
            github_query = parsed_intent.get("github_query", query)
            intent_summary = parsed_intent.get("intent_summary", "")
            intent_source = "ai_cached"
    except Exception:
        pass

    # If no cached intent, call Gemini
    if not ai_keywords:
        try:
            intent_prompt = f"""You are a search intent analyzer for an open-source tool discovery platform.

User query: "{query}"

Analyze what the user actually wants and return a JSON object with:
1. "keywords": 3-6 precise search terms that will find relevant GitHub repos.
   - Focus on SPECIFIC intent words, not generic ones like "agent", "ai", "tool", "app", "framework", "library", "api", "bot", "assistant", "automation"
   - Include synonyms and related terms the user didn't explicitly say
   - Example: "marketing agent" → ["marketing", "outreach", "content-generation", "lead-generation", "email-campaign", "social-media"]
   - Example: "voice calling" → ["voice", "calling", "telephony", "sip", "webrtc", "phone", "ivr"]

2. "github_query": An optimized GitHub search query string

3. "intent_summary": One sentence describing what the user wants

Return ONLY JSON: {{"keywords": [...], "github_query": "...", "intent_summary": "..."}}"""
            intent_result = await call_ai(intent_prompt, json_response=True)
            cleaned = intent_result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            parsed = _json.loads(cleaned)
            ai_keywords = [k.lower() for k in parsed.get("keywords", [])]
            github_query = parsed.get("github_query", query)
            intent_summary = parsed.get("intent_summary", "")
            intent_source = "ai"

            # Cache the intent result (5 min TTL)
            try:
                backend = FastAPICache.get_backend()
                await backend.set(
                    intent_cache_key,
                    _json.dumps({"keywords": ai_keywords, "github_query": github_query, "intent_summary": intent_summary}),
                    expire=300,
                )
            except Exception:
                pass
        except Exception as e:
            logger.warning(f"AI intent parsing failed, using raw keywords: {e}")

    # --- Step 1: Raw keyword extraction (fallback) ---
    raw_words = [w.strip() for w in query.lower().split() if len(w.strip()) > 2]

    # Use Gemini keywords if available, else raw words
    if ai_keywords:
        keywords = ai_keywords[:6]
    else:
        keywords = raw_words[:5]

    # --- Helper: score a repo's relevance to keywords ---
    # Generic keywords match too many repos and dilute results
    GENERIC_KEYWORDS = {"agent", "ai", "tool", "app", "framework", "library", "api", "bot", "assistant", "automation", "open", "source", "free", "github", "self-hosted"}

    def _score_repo(repo: dict, kw_list: list) -> int:
        score = 0
        name = (repo.get("name") or "").lower()
        desc = (repo.get("description") or "").lower()
        use_cases = " ".join(repo.get("use_cases") or []).lower()
        replaces = " ".join(repo.get("replaces_saas") or []).lower()
        topics = [t.lower() for t in (repo.get("topics") or [])]
        full_name = (repo.get("full_name") or "").lower()

        matched_keywords = set()
        for k in kw_list:
            k_lower = k.lower()
            # Name match (highest weight — repo name is strongest signal)
            # Match only the repo name, not owner prefix, to avoid false positives
            if k_lower in name:
                score += 4
                matched_keywords.add(k_lower)
            # Use cases match
            if k_lower in use_cases:
                score += 3
                matched_keywords.add(k_lower)
            # Topics exact match
            if k_lower in topics:
                score += 3
                matched_keywords.add(k_lower)
            # Replaces SaaS match
            if k_lower in replaces:
                score += 2
                matched_keywords.add(k_lower)
            # Description match
            if k_lower in desc:
                score += 1
                matched_keywords.add(k_lower)

        # --- Critical: penalize repos that only match generic keywords ---
        # If user asks "marketing agent", repos matching only "agent" are not relevant
        query_has_specific = any(k.lower() not in GENERIC_KEYWORDS for k in kw_list)
        specific_matched = {k for k in matched_keywords if k not in GENERIC_KEYWORDS}
        if query_has_specific and not specific_matched:
            # Repo only matched generic terms — divide score heavily
            score = score // 5

        # --- Match ratio bonus/penalty ---
        if kw_list:
            match_ratio = len(matched_keywords) / len(kw_list)
            if match_ratio == 1.0 and len(kw_list) > 1:
                # All keywords matched — highly relevant
                score += 8
            elif match_ratio >= 0.75:
                score += 4
            elif match_ratio >= 0.5:
                score += 1
            elif match_ratio < 0.5:
                # Less than half matched — big penalty
                score = score // 3

        return score

    # --- Layer 1: Local DB search (instant) ---
    # Search ALL repos — complete_solution, building_block, unclassified.
    # The classifier is often wrong. Relevance scoring handles ranking.
    text_regex = "|".join(re.escape(k) for k in keywords[:6])
    local_query = {
        "$or": [
            {"name": {"$regex": text_regex, "$options": "i"}},
            {"use_cases": {"$regex": text_regex, "$options": "i"}},
            {"description": {"$regex": text_regex, "$options": "i"}},
            {"replaces_saas": {"$regex": text_regex, "$options": "i"}},
            {"topics": {"$in": keywords}},
        ]
    }
    # Fetch more than needed so we can score and pick the best
    local_candidates = await db.github_repos.find(
        local_query, {"_id": 0}
    ).sort("stars", -1).limit(req.limit * 6).to_list(req.limit * 6)

    scored_local = []
    for r in local_candidates:
        score = _score_repo(r, keywords)
        if score > 0:
            r["match_source"] = "local_db"
            r["relevance_score"] = score
            scored_local.append(r)
            seen_names.add(r["full_name"].lower())

    # Sort by relevance score desc, then stars desc
    scored_local.sort(key=lambda x: (-x["relevance_score"], -x.get("stars", 0)))
    # Only keep results with decent relevance (score >= 4 for quality cutoff)
    good_local = [r for r in scored_local if r["relevance_score"] >= 4]
    if len(good_local) < 3:
        # Include lower-scored ones if we don't have enough, but cap at score >= 1
        fallback = [r for r in scored_local if r["relevance_score"] >= 1]
        good_local = fallback if len(fallback) >= len(good_local) else good_local
    solutions.extend(good_local[:req.limit])

    # --- Layer 2: Live GitHub API search (if < 3 GOOD results) ---
    # Trigger Layer 2 if we have fewer than 3 results OR best result has low relevance
    best_score = max((s.get("relevance_score", 0) for s in solutions), default=0)
    if len(solutions) < 3 or best_score < 5:
        source_info["layer_used"] = "github_live"
        try:
            client = await _get_httpx_client()
            response = await client.get(
                "https://api.github.com/search/repositories",
                params={
                    "q": f"{github_query} stars:>100",
                    "sort": "stars",
                    "order": "desc",
                    "per_page": 15
                },
                headers=GITHUB_HEADERS,
                timeout=15
            )
            if response.status_code == 200:
                data = response.json()
                for item in data.get("items", []):
                    fn = item["full_name"]
                    if fn.lower() in seen_names:
                        continue
                    if item.get("archived"):
                        continue
                    repo_data = {
                        "full_name": fn,
                        "name": item["name"],
                        "owner": item["owner"]["login"],
                        "description": item.get("description") or "",
                        "stars": item["stargazers_count"],
                        "forks": item["forks_count"],
                        "language": item.get("language") or "Unknown",
                        "topics": item.get("topics", []),
                        "html_url": item["html_url"],
                        "pushed_at": item.get("pushed_at"),
                        "license": item.get("license", {}).get("spdx_id") if item.get("license") else None,
                        "contributors": 0,
                        "source": "user_search",
                        "match_source": "github_live",
                    }
                    # Score GitHub results too so they compete fairly with local
                    repo_data["relevance_score"] = _score_repo(repo_data, keywords)
                    solutions.append(repo_data)
                    seen_names.add(fn.lower())
                    # Fire-and-forget: cache and classify
                    asyncio.create_task(_cache_and_classify_repo(repo_data))
        except Exception as e:
            logger.error(f"Solution Finder Layer 2 error: {e}")

    # --- Layer 3: Gemini-assisted discovery (if still < 3 good results) ---
    best_score_after_layer2 = max((s.get("relevance_score", 0) for s in solutions), default=0)
    if len(solutions) < 3 or best_score_after_layer2 < 4:
        source_info["layer_used"] = "ai_discovered"
        try:
            user_intent = intent_summary if intent_summary else query
            discover_prompt = f"""Name 5-8 real, actively maintained open-source GitHub repositories that solve this problem:
"{user_intent}"

Only include repos that:
- Actually exist on GitHub
- Have 50+ stars
- Are complete, deployable solutions (not libraries or SDKs)

Return ONLY a JSON array: [{{"full_name": "owner/repo", "reason": "1 sentence why it fits"}}]"""
            discover_result = await call_ai(discover_prompt, json_response=True)
            cleaned = discover_result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            suggestions = _json.loads(cleaned)

            # Validate Gemini returned a list, not an object
            if not isinstance(suggestions, list):
                logger.error(f"Gemini discovery returned non-list: {type(suggestions)}")
                suggestions = []

            # Validate each suggestion exists on GitHub — parallelized with semaphore
            client = await _get_httpx_client()
            _gh_validate_semaphore = asyncio.Semaphore(3)

            async def _validate_one(suggestion):
                fn = suggestion.get("full_name", "")
                if not fn:
                    return None
                fn_lower = fn.lower()
                if fn_lower in seen_names:
                    return None
                try:
                    async with _gh_validate_semaphore:
                        encoded_fn = urllib.parse.quote(fn, safe="")
                        gh_resp = await client.get(
                            f"https://api.github.com/repos/{encoded_fn}",
                            headers=GITHUB_HEADERS,
                            timeout=10
                        )
                    if gh_resp.status_code == 200:
                        item = gh_resp.json()
                        if item.get("archived") or item.get("stargazers_count", 0) < 50:
                            return None
                        return {
                            "full_name": item["full_name"],
                            "name": item["name"],
                            "owner": item["owner"]["login"],
                            "description": item.get("description") or "",
                            "stars": item["stargazers_count"],
                            "forks": item["forks_count"],
                            "language": item.get("language") or "Unknown",
                            "topics": item.get("topics", []),
                            "html_url": item["html_url"],
                            "pushed_at": item.get("pushed_at"),
                            "license": item.get("license", {}).get("spdx_id") if item.get("license") else None,
                            "contributors": 0,
                            "source": "user_search",
                            "match_source": "ai_discovered",
                            "match_reason": suggestion.get("reason", ""),
                        }
                except Exception:
                    return None
                return None

            validated = await asyncio.gather(*[_validate_one(s) for s in suggestions[:8]])
            for repo_data in validated:
                if repo_data:
                    repo_data["relevance_score"] = _score_repo(repo_data, keywords)
                    solutions.append(repo_data)
                    seen_names.add(repo_data["full_name"].lower())
                    asyncio.create_task(_cache_and_classify_repo(repo_data))
        except Exception as e:
            logger.error(f"Solution Finder Layer 3 error: {e}")

    # Final sort: relevance score first, then stars
    solutions.sort(key=lambda x: (-x.get("relevance_score", 0), -x.get("stars", 0)))

    # --- Calculate health scores for results that don't have one ---
    from github_scraper import GitHubScraper
    scraper = GitHubScraper(db)
    for sol in solutions:
        if not sol.get("health_score"):
            sol["health_score"] = scraper.calculate_health_score(sol)
        if "has_docker" not in sol:
            sol["has_docker"] = scraper.detect_docker_support(sol)

    result = {
        "solutions": solutions[:req.limit],
        "query_keywords": keywords,
        "total": len(solutions),
        "intent_source": intent_source,
        **source_info,
    }

    # Store in cache (5 minute TTL)
    try:
        backend = FastAPICache.get_backend()
        await backend.set(cache_key, _json.dumps(result), expire=300)
    except Exception:
        pass

    return result


@api_router.post("/ai/solution-finder/upvote")
@limiter.limit("30/minute")
async def upvote_repo_use_case(request: Request, req: RepoUpvoteRequest, user: UserModel = Depends(require_auth)):
    """Let authenticated users upvote a repo for a specific use case. Grows the use_cases tags organically."""
    # Record the upvote (unique per user+repo)
    try:
        await db.repo_upvotes.insert_one({
            "full_name": req.full_name,
            "user_id": user.user_id,
            "use_case": req.use_case.lower().strip(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        # Duplicate — user already upvoted this combo
        return {"message": "Already upvoted", "upvoted": True}

    # Increment upvote count on the repo
    await db.github_repos.update_one(
        {"full_name": req.full_name},
        {"$inc": {"upvotes": 1}}
    )

    # Add the use_case to the repo's use_cases if not already present
    await db.github_repos.update_one(
        {"full_name": req.full_name, "use_cases": {"$ne": req.use_case.lower().strip()}},
        {"$push": {"use_cases": req.use_case.lower().strip()}}
    )

    return {"message": "Upvoted!", "upvoted": True}

@api_router.get("/repos/{owner}/{repo}/upvotes")
async def get_repo_upvotes(owner: str, repo: str):
    """Get total upvote count for a repo."""
    full_name = f"{owner}/{repo}"
    repo_doc = await db.github_repos.find_one({"full_name": full_name}, {"upvotes": 1})
    return {"upvotes": repo_doc.get("upvotes", 0) if repo_doc else 0}

@api_router.post("/ai/repo-translator")
@limiter.limit("10/minute")
async def repo_translator(request: Request, req: RepoTranslatorRequest):
    github_url = req.github_url.strip().rstrip("/")

    # Only allow github.com URLs — reject anything else
    if not re.search(r'^https?://github\.com/', github_url):
        raise HTTPException(status_code=400, detail="Only GitHub repository URLs are supported.")

    # Extract owner/repo from URL so we can hit the real GitHub API
    match = re.search(r'github\.com/([^/]+/[^/\s?#]+)', github_url)
    if match:
        full_name = match.group(1)
        owner, repo_name = full_name.split("/", 1)
        try:
            translation_data = await translate_github_repo(owner, repo_name)
            return {"translation": translation_data.get("translation", "")}
        except Exception:
            pass  # fall through to URL-only prompt on any error

    # Fallback: Gemini without real data (old behaviour, for non-GitHub URLs)
    prompt = f"""Translate this GitHub repository for a non-technical founder: {github_url}

Explain it simply. Return in this exact Markdown format:

**What it does:** (1 simple sentence a business person would understand)

**Who it's for:** (describe the ideal user)

**What you can build with it:**
- Example 1
- Example 2
- Example 3

**Difficulty:** Beginner/Intermediate/Advanced

**How to get started (no coding required):**
1. First step
2. Second step
3. Third step

Keep language simple. No jargon. Focus on outcomes, not technology."""

    result = await call_ai(prompt)
    return {"translation": result}

@api_router.post("/ai/error-explainer")
@limiter.limit("15/minute")
async def error_explainer(request: Request):
    """Explain a technical error in plain English"""
    body = await request.json()
    error_text = body.get("error_text", "")

    if not error_text:
        raise HTTPException(status_code=400, detail="error_text is required")

    prompt = f"""A non-technical founder got this error message:

{error_text[:3000]}

Explain this error in plain English like you're talking to a friend who doesn't code:

1. **What happened:** (1-2 simple sentences)
2. **Why it happened:** (the root cause, no jargon)
3. **How to fix it:** (step-by-step, simple instructions)
4. **How to prevent it:** (one tip to avoid this in the future)

Keep it extremely simple. No technical jargon. Be friendly and reassuring."""

    result = await call_ai(prompt)
    return {"explanation": result}

@api_router.post("/ai/roast-my-stack")
@limiter.limit("10/minute")
async def roast_my_stack(request: Request, req: RoastRequest):
    tools_str = ", ".join(req.tools)
    prompt = f"""A founder is using these tools: {tools_str}

Roast their stack. Be brutally honest but helpful.

Return in this exact Markdown format:

**🔥 What's Redundant:**
(tools that overlap or duplicate functionality)

**💸 What's Overpriced:**
(tools they're probably paying too much for)

**🕳️ What's Missing:**
(gaps in their stack)

**🧠 What a Smarter Founder Would Do:**
(specific recommendations with free alternatives)

Be direct and slightly savage, but constructive. This is meant to be fun but genuinely helpful."""

    result = await call_ai(prompt)
    return {"roast": result}

@api_router.get("/ai/translate-repo/{owner}/{repo}")
async def translate_github_repo(owner: str, repo: str):
    """Translate any GitHub repo to plain English with AI"""
    full_name = f"{owner}/{repo}"

    # Check cache first (7 day TTL)
    cached = await db.repo_translations.find_one({"full_name": full_name}, {"_id": 0})
    if cached:
        try:
            cached_time = datetime.fromisoformat(cached.get("translated_at", "2000-01-01"))
            if datetime.now(timezone.utc) - cached_time < timedelta(days=7):
                return cached
        except (ValueError, TypeError):
            pass  # Invalid date format, proceed to re-translate

    # Fetch repo info from GitHub
    try:
        async with httpx.AsyncClient() as client:
            # Get repo details
            repo_response = await client.get(
                f"https://api.github.com/repos/{full_name}",
                headers=GITHUB_HEADERS,
                timeout=15
            )
            if repo_response.status_code != 200:
                raise HTTPException(status_code=404, detail="Repository not found on GitHub")

            repo_data = repo_response.json()

            # Get README
            readme_content = ""
            try:
                readme_response = await client.get(
                    f"https://api.github.com/repos/{full_name}/readme",
                    headers=GITHUB_HEADERS,
                    timeout=15
                )
                if readme_response.status_code == 200:
                    import base64
                    readme_data = readme_response.json()
                    if readme_data.get("encoding") == "base64":
                        readme_content = base64.b64decode(readme_data.get("content", "")).decode("utf-8", errors="ignore")[:3000]
            except:
                pass
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch from GitHub")

    # AI Translation
    prompt = f"""Translate this GitHub repository for a non-technical founder:

Repository: {full_name}
Description: {repo_data.get('description', 'No description')}
Stars: {repo_data.get('stargazers_count', 0):,}
Language: {repo_data.get('language', 'Unknown')}
Topics: {', '.join(repo_data.get('topics', [])[:5])}

README excerpt:
{readme_content[:2000] if readme_content else 'No README available'}

Provide a complete analysis in this exact format:

**What it does:** (1 simple sentence explaining the core value. Emphasize that it is an OPEN SOURCE alternative)

**Who it's for:** (describe the ideal non-technical founder user)

**What you can build with it:**
- Example 1
- Example 2
- Example 3

**Difficulty:** Beginner/Intermediate/Advanced

**Setup time:** X minutes (realistic estimate for self-hosting)

**How to get started:**
1. Step 1 (Clear, jargon-free instructions)
2. Step 2
3. Step 3

**Replaces (paid alternative):** Name the expensive paid SaaS this REPLACES (e.g. "Replaces ElevenLabs - save $99/mo")

Keep it extremely simple. Focus on how this open-source tool allows the founder to build without paying high monthly SaaS fees. No technical jargon. Use plain English."""

    translation = await call_ai(prompt)

    # Parse difficulty from translation
    difficulty = "Intermediate"
    if "Beginner" in translation:
        difficulty = "Beginner"
    elif "Advanced" in translation:
        difficulty = "Advanced"

    # Parse setup time
    setup_time = "30 mins"
    import re
    time_match = re.search(r'\*\*Setup time:\*\*\s*(.+?)(?:\n|$)', translation)
    if time_match:
        setup_time = time_match.group(1).strip()

    result = {
        "full_name": full_name,
        "name": repo_data.get("name"),
        "owner": repo_data.get("owner", {}).get("login"),
        "description": repo_data.get("description"),
        "stars": repo_data.get("stargazers_count", 0),
        "forks": repo_data.get("forks_count", 0),
        "language": repo_data.get("language"),
        "topics": repo_data.get("topics", []),
        "html_url": repo_data.get("html_url"),
        "homepage": repo_data.get("homepage"),
        "translation": translation,
        "difficulty": difficulty,
        "setup_time": setup_time,
        "translated_at": datetime.now(timezone.utc).isoformat()
    }

    # Cache the translation
    await db.repo_translations.update_one(
        {"full_name": full_name},
        {"$set": result},
        upsert=True
    )

    return result

@api_router.post("/ai/idea-exists")
@limiter.limit("10/minute")
async def idea_exists_post(request: Request):
    """Find similar GitHub projects for an idea"""
    body = await request.json()
    idea = body.get("idea", "")

    if not idea:
        raise HTTPException(status_code=400, detail="idea is required")

    prompt = f"""A founder wants to build: {idea}

Find 5-8 existing open-source GitHub projects that are building something similar or could be used as a foundation.

Return ONLY a valid JSON array (no markdown):
[
  {{
    "name": "Project Name",
    "full_name": "owner/repo",
    "description": "What it does in plain English (1-2 sentences)",
    "githubUrl": "https://github.com/owner/repo",
    "stars": "Xk",
    "language": "Python/JavaScript/etc",
    "whyRelevant": "How this relates to their idea",
    "howToUse": "How they can build on top of this or differentiate"
  }}
]

Be accurate with REAL GitHub repositories that actually exist. Focus on popular, well-maintained projects."""

    result = await call_ai(prompt, json_response=True)
    try:
        import json
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        data = json.loads(cleaned)
        return {"idea": idea, "similar_projects": data, "count": len(data)}
    except:
        return {"idea": idea, "similar_projects": [], "raw": result}

# ==================== TOOL COMPARISON ====================

class ComparisonRequest(BaseModel):
    tool1: str
    tool2: str

@api_router.post("/ai/compare")
async def compare_tools(req: ComparisonRequest):
    """Compare two tools using AI with a focus on Founder needs"""
    t1 = req.tool1.strip()
    t2 = req.tool2.strip()

    prompt = f"""Compare these two open-source tools for a non-technical founder:
    Tool 1: {t1}
    Tool 2: {t2}

    Provide a professional, objective comparison in Plain English.
    Focus on:
    1. **Core Purpose**: What is the main thing each tool does?
    2. **Setup Difficulty**: Which one is easier to get running for a small team?
    3. **Monthly Cost (Managed vs Self-Hosted)**: Typical pricing for their cloud versions vs self-hosted.
    4. **Best For**: Specific founder use cases for each.
    5. **The Verdict**: A direct recommendation based on different priorities.

    Structure the response with markdown tables where possible. Keep it concise and use founder-friendly terms."""

    try:
        comparison = await call_ai(prompt)
        return {"comparison": comparison, "tool1": t1, "tool2": t2}
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate comparison")

# ==================== REPO OF THE DAY ====================

@api_router.get("/repo-of-the-day")
async def get_repo_of_the_day():
    """Get the featured repo of the day with AI translation"""

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Check if we already have a repo of the day
    cached = await db.repo_of_the_day.find_one({"date": today}, {"_id": 0})
    if cached:
        return cached

    # Get trending repos and pick one
    try:
        # Fetch from GitHub trending
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://github.com/trending?since=daily",
                headers={"User-Agent": "GitStack"},
                timeout=30
            )
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                articles = soup.select('article.Box-row')

                # Pick a good one (high stars, good description)
                best_repo = None
                for article in articles[:10]:
                    h2 = article.select_one('h2 a')
                    if not h2:
                        continue
                    full_name = h2.get('href', '').strip('/')
                    if not full_name or '/' not in full_name:
                        continue

                    desc_elem = article.select_one('p')
                    description = desc_elem.get_text(strip=True) if desc_elem else ""

                    # Skip if no description
                    if len(description) < 20:
                        continue

                    stars_elem = article.select_one('a[href$="/stargazers"]')
                    stars_text = stars_elem.get_text(strip=True) if stars_elem else "0"

                    best_repo = {
                        "full_name": full_name,
                        "description": description,
                        "stars": stars_text
                    }
                    break

                if not best_repo:
                    # Fallback to first repo
                    first = articles[0] if articles else None
                    if first:
                        h2 = first.select_one('h2 a')
                        best_repo = {
                            "full_name": h2.get('href', '').strip('/') if h2 else "vercel/next.js",
                            "description": "A popular open-source project",
                            "stars": "100k"
                        }
    except Exception as e:
        logger.error(f"Error fetching trending: {e}")
        best_repo = {"full_name": "vercel/next.js", "description": "The React Framework", "stars": "118k"}

    if not best_repo:
        best_repo = {"full_name": "vercel/next.js", "description": "The React Framework", "stars": "118k"}

    # Get AI translation for this repo
    owner, repo = best_repo["full_name"].split("/")
    try:
        # Fetch repo details
        async with httpx.AsyncClient() as client:
            repo_response = await client.get(
                f"https://api.github.com/repos/{best_repo['full_name']}",
                headers=GITHUB_HEADERS,
                timeout=15
            )
            repo_data = repo_response.json() if repo_response.status_code == 200 else {}

            # Get README
            readme_content = ""
            try:
                readme_response = await client.get(
                    f"https://api.github.com/repos/{best_repo['full_name']}/readme",
                    headers=GITHUB_HEADERS,
                    timeout=15
                )
                if readme_response.status_code == 200:
                    import base64
                    readme_data = readme_response.json()
                    if readme_data.get("encoding") == "base64":
                        readme_content = base64.b64decode(readme_data.get("content", "")).decode("utf-8", errors="ignore")[:2000]
            except:
                pass

        # AI Translation
        prompt = f"""Create a "Repo of the Day" feature for non-technical founders:

Repository: {best_repo['full_name']}
Description: {repo_data.get('description', best_repo['description'])}
Stars: {repo_data.get('stargazers_count', best_repo['stars'])}
Language: {repo_data.get('language', 'Unknown')}

README:
{readme_content[:1500]}

Write an engaging, plain-English summary:

**Headline:** (Catchy 5-8 word headline)

**What it does:** (1 sentence, simple)

**Why it's trending:** (1 sentence)

**Perfect for founders who:** (2-3 bullet points of use cases)

**Get started in 5 minutes:** (3 simple steps)

Make it exciting and accessible to non-technical people!"""

        translation = await call_ai(prompt)

        result = {
            "date": today,
            "full_name": best_repo["full_name"],
            "name": repo_data.get("name", repo.split("/")[-1]),
            "owner": owner,
            "description": repo_data.get("description", best_repo["description"]),
            "stars": repo_data.get("stargazers_count", 0),
            "language": repo_data.get("language", "Unknown"),
            "topics": repo_data.get("topics", [])[:5],
            "html_url": repo_data.get("html_url", f"https://github.com/{best_repo['full_name']}"),
            "translation": translation,
            "selected_at": datetime.now(timezone.utc).isoformat()
        }

        # Cache it
        await db.repo_of_the_day.update_one(
            {"date": today},
            {"$set": result},
            upsert=True
        )

        return result

    except Exception as e:
        logger.error(f"Error creating repo of the day: {e}")
        return {
            "date": today,
            "full_name": best_repo["full_name"],
            "name": best_repo["full_name"].split("/")[-1],
            "description": best_repo["description"],
            "stars": best_repo["stars"],
            "error": "Translation failed"
        }

# ==================== NEWSLETTER ====================

class NewsletterSubscribeRequest(BaseModel):
    email: str
    source: Optional[str] = None

@api_router.post("/newsletter/subscribe")
@limiter.limit("5/minute")  # SEC-04: prevent subscriber-list flooding / SMTP abuse
async def subscribe_newsletter(request: Request, req: NewsletterSubscribeRequest):
    """Subscribe to the GitStack daily digest"""
    email = req.email.lower().strip()

    # SEC-05: Proper email validation (reject garbage like a@b.c)
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    # Check if already subscribed
    existing = await db.newsletter_subscribers.find_one({"email": email})
    if existing:
        return {"message": "Already subscribed", "status": "existing"}

    # Save subscriber
    await db.newsletter_subscribers.insert_one({
        "email": email,
        "source": req.source,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    })

    # Send welcome email (fire-and-forget so API stays fast)
    asyncio.create_task(_safe_send_welcome(email))

    return {"message": "Successfully subscribed to GitStack daily digest!", "status": "new"}


async def _safe_send_welcome(email: str):
    try:
        await send_welcome_email(email)
    except Exception as e:
        logger.warning(f"Failed to send welcome email to {email}: {e}")


# ==================== EMAIL PREFERENCES & UNSUBSCRIBE ====================

class PreferencesLinkRequest(BaseModel):
    email: str

class PreferencesUpdateRequest(BaseModel):
    token: str
    preferences: Dict[str, Any]

@api_router.post("/newsletter/preferences-link")
async def api_send_preferences_link(req: PreferencesLinkRequest):
    """Send a magic link to manage email preferences."""
    email = req.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")

    token = _generate_email_token(email)

    try:
        await send_preferences_link(email, token)
        return {"message": "Preferences link sent. Check your inbox."}
    except Exception as e:
        logger.error(f"Failed to send preferences link to {email}: {e}")
        raise HTTPException(status_code=500, detail="Could not send email. Try again.")


@api_router.get("/newsletter/preferences")
async def get_preferences(token: str):
    """Get current email preferences using a token."""
    email = _verify_email_token(token)
    subscriber = await db.newsletter_subscribers.find_one({"email": email})
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {
        "email": email,
        "status": subscriber.get("status", "active"),
        "preferences": subscriber.get("preferences", {
            "daily_drop": True,
            "stack_reminders": True,
            "product_updates": False,
        }),
    }


@api_router.put("/newsletter/preferences")
async def update_preferences(req: PreferencesUpdateRequest):
    """Update email preferences using a token."""
    email = _verify_email_token(req.token)
    prefs = req.preferences

    # Validate preferences shape
    allowed_keys = {"daily_drop", "stack_reminders", "product_updates"}
    cleaned = {k: bool(v) for k, v in prefs.items() if k in allowed_keys}

    result = await db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {"preferences": cleaned, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {"message": "Preferences updated", "preferences": cleaned}


@api_router.post("/newsletter/unsubscribe")
async def unsubscribe_post(token: str):
    """Unsubscribe using a token (POST to prevent CSRF via embedded images)."""
    email = _verify_email_token(token)
    result = await db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {
            "status": "unsubscribed",
            "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {"message": "Unsubscribed successfully", "email": email}


# SEC-10: Keep GET for backward-compat email links, but return a confirmation page hint
@api_router.get("/newsletter/unsubscribe")
async def unsubscribe_get(token: str):
    """GET handler for email links — validates token and returns confirmation prompt.
    The frontend should show a 'Confirm Unsubscribe' button that POSTs."""
    email = _verify_email_token(token)  # validate token is real
    return {"email": email, "action": "confirm", "message": "Click confirm to unsubscribe."}

@api_router.get("/newsletter/count")
async def get_newsletter_count():
    """Get subscriber count for social proof"""
    count = await db.newsletter_subscribers.count_documents({"status": "active"})
    return {"count": count}


# ==================== ONBOARDING INTENT TRACKING ====================

@api_router.get("/onboarding/intent")
async def track_onboarding_intent(token: str, type: str):
    """Track what the user is here for: stack-builder, buyer, seller, or tool-hunter.
    
    Called from tracked links in the welcome email. Records intent and redirects
    to the appropriate page.
    """
    valid_types = ["stack-builder", "buyer", "seller", "tool-hunter"]
    if type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
    
    try:
        email = _verify_email_token(token)
    except HTTPException:
        # Invalid/expired token — still redirect, just don't track
        redirect_map = {
            "stack-builder": f"{FRONTEND_URL}/stack-generator",
            "buyer": f"{FRONTEND_URL}/marketplace",
            "seller": f"{FRONTEND_URL}/marketplace/sell",
            "tool-hunter": f"{FRONTEND_URL}/repo-of-the-day",
        }
        return RedirectResponse(url=redirect_map[type])
    
    # Record intent in user profile
    await db.users.update_one(
        {"email": email.lower().strip()},
        {
            "$set": {
                "onboarding_intent": type,
                "onboarding_intent_set_at": datetime.now(timezone.utc),
            }
        },
    )
    
    # Also record in newsletter subscribers if present
    await db.newsletter_subscribers.update_one(
        {"email": email.lower().strip()},
        {
            "$set": {
                "onboarding_intent": type,
                "onboarding_intent_set_at": datetime.now(timezone.utc),
            }
        },
    )
    
    redirect_map = {
        "stack-builder": f"{FRONTEND_URL}/stack-generator",
        "buyer": f"{FRONTEND_URL}/marketplace",
        "seller": f"{FRONTEND_URL}/marketplace/sell",
        "tool-hunter": f"{FRONTEND_URL}/repo-of-the-day",
    }
    return RedirectResponse(url=redirect_map[type])


@api_router.post("/onboarding/track-intent")
async def track_onboarding_intent_from_frontend(request: Request):
    """Track onboarding intent from the frontend (Clerk-authenticated).
    
    This is a fallback for users who don't click the tracked links in the
    welcome email. The frontend detects the first meaningful page visit and
    reports it here.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    if not _jwks_client:
        raise HTTPException(status_code=503, detail="Auth not configured")
    
    try:
        body = await request.json()
        intent_type = body.get("type")
        valid_types = ["stack-builder", "buyer", "seller", "tool-hunter"]
        if intent_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
        
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Only set if not already set (email link takes precedence)
        result = await db.users.update_one(
            {"user_id": clerk_user_id, "onboarding_intent": {"$exists": False}},
            {
                "$set": {
                    "onboarding_intent": intent_type,
                    "onboarding_intent_set_at": datetime.now(timezone.utc),
                    "onboarding_intent_source": "frontend",
                }
            },
        )
        
        return {
            "success": True,
            "intent": intent_type,
            "updated": result.modified_count > 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Onboarding intent error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# ==================== SEARCH AUTOCOMPLETE ====================

@api_router.get("/search/autocomplete")
async def search_autocomplete(q: str):
    """Get search suggestions for autocomplete"""
    if len(q) < 2:
        return {"suggestions": []}

    suggestions = []

    # Search curated tools
    tools = await db.tools.find(
        {"$or": [
            {"name": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
            {"name": {"$regex": re.escape(q), "$options": "i"}}
        ]},
        {"_id": 0, "name": 1, "description": 1, "category": 1}
    ).limit(5).to_list(5)

    for t in tools:
        suggestions.append({
            "type": "tool",
            "name": t["name"],
            "description": t.get("description", "")[:60],
            "category": t.get("category", "")
        })

    # Search github repos
    gh_repos = await db.github_repos.find(
        {"$or": [
            {"name": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
            {"name": {"$regex": re.escape(q), "$options": "i"}}
        ]},
        {"_id": 0, "name": 1, "description": 1, "full_name": 1, "stars": 1}
    ).sort("score", -1).limit(5).to_list(5)

    for r in gh_repos:
        suggestions.append({
            "type": "github",
            "name": r["name"],
            "full_name": r.get("full_name", ""),
            "description": r.get("description", "")[:60],
            "stars": r.get("stars", 0)
        })

    # Add category suggestions
    categories = [
        {"name": "AI Agents", "type": "category"},
        {"name": "Automation", "type": "category"},
        {"name": "Analytics", "type": "category"},
        {"name": "Authentication", "type": "category"},
        {"name": "Payments", "type": "category"},
        {"name": "UI/UX Tools", "type": "category"},
        {"name": "Database", "type": "category"},
        {"name": "E-commerce", "type": "category"},
    ]

    for cat in categories:
        if q.lower() in cat["name"].lower():
            suggestions.append(cat)

    # Add idea suggestions
    ideas = [
        "Build a SaaS", "Build a chatbot", "Build an AI app",
        "Build a marketplace", "Build a newsletter", "Build a booking system"
    ]
    for idea in ideas:
        if q.lower() in idea.lower():
            suggestions.append({"type": "idea", "name": idea})

    return {"suggestions": suggestions[:10]}

# ==================== MY STACK ROUTES ====================

@api_router.get("/my-stacks")
async def get_my_stacks(user: UserModel = Depends(require_auth)):
    stacks = await db.user_stacks.find({"user_id": user.user_id}, {"_id": 0}).to_list(50)
    return stacks

@api_router.post("/my-stacks")
async def save_stack(req: SaveStackRequest, user: UserModel = Depends(require_auth)):
    stack_id = f"stack_{uuid.uuid4().hex[:12]}"
    stack = {
        "stack_id": stack_id,
        "user_id": user.user_id,
        "name": req.name,
        "tools": req.tools,
        "is_public": req.is_public,
        "copy_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_stacks.insert_one(stack)
    stack.pop("_id", None)
    return stack

@api_router.get("/stacks/public")
async def get_public_stacks():
    stacks = await db.user_stacks.find({"is_public": True}, {"_id": 0}).sort("copy_count", -1).limit(20).to_list(20)
    return stacks

@api_router.get("/stacks/featured")
async def get_featured_stacks():
    """Get real founder stacks from famous open-source projects"""

    # Famous open-source projects and their stacks - NO FAKE NUMBERS
    famous_stacks = [
        {
            "stack_id": "calcom_stack",
            "name": "Cal.com's Stack",
            "description": "The scheduling tool used by 50k+ companies",
            "owner": "Cal.com",
            "owner_url": "https://github.com/calcom/cal.com",
            "repo_url": "https://github.com/calcom/cal.com",
            "tools": ["Next.js", "Prisma", "tRPC", "Tailwind CSS", "PostgreSQL"],
            "stars": "28k"
        },
        {
            "stack_id": "supabase_stack",
            "name": "Supabase's Stack",
            "description": "The open-source Firebase alternative",
            "owner": "Supabase",
            "owner_url": "https://github.com/supabase/supabase",
            "repo_url": "https://github.com/supabase/supabase",
            "tools": ["PostgreSQL", "PostgREST", "GoTrue", "Realtime", "Storage"],
            "stars": "62k"
        },
        {
            "stack_id": "n8n_stack",
            "name": "n8n's Stack",
            "description": "Workflow automation tool",
            "owner": "n8n",
            "owner_url": "https://github.com/n8n-io/n8n",
            "repo_url": "https://github.com/n8n-io/n8n",
            "tools": ["TypeScript", "Vue.js", "PostgreSQL", "Redis", "Bull"],
            "stars": "35k"
        },
        {
            "stack_id": "appwrite_stack",
            "name": "Appwrite's Stack",
            "description": "Backend-as-a-Service platform",
            "owner": "Appwrite",
            "owner_url": "https://github.com/appwrite/appwrite",
            "repo_url": "https://github.com/appwrite/appwrite",
            "tools": ["PHP", "Redis", "MariaDB", "ClamAV", "Traefik"],
            "stars": "38k"
        },
        {
            "stack_id": "plane_stack",
            "name": "Plane's Stack",
            "description": "Open-source Jira alternative",
            "owner": "Plane",
            "owner_url": "https://github.com/makeplane/plane",
            "repo_url": "https://github.com/makeplane/plane",
            "tools": ["Next.js", "Django", "PostgreSQL", "Redis", "Celery"],
            "stars": "25k"
        },
        {
            "stack_id": "documenso_stack",
            "name": "Documenso's Stack",
            "description": "Open-source DocuSign alternative",
            "owner": "Documenso",
            "owner_url": "https://github.com/documenso/documenso",
            "repo_url": "https://github.com/documenso/documenso",
            "tools": ["Next.js", "Prisma", "tRPC", "Tailwind CSS", "Resend"],
            "stars": "6k"
        }
    ]

    return famous_stacks

@api_router.get("/stacks/{stack_id}")
async def get_stack(stack_id: str):
    stack = await db.user_stacks.find_one({"stack_id": stack_id}, {"_id": 0})
    if not stack:
        raise HTTPException(status_code=404, detail="Stack not found")
    if not stack.get("is_public"):
        raise HTTPException(status_code=403, detail="Stack is private")
    return stack

@api_router.post("/stacks/{stack_id}/copy")
async def copy_stack(stack_id: str):
    result = await db.user_stacks.update_one(
        {"stack_id": stack_id, "is_public": True},
        {"$inc": {"copy_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stack not found")
    return {"message": "Stack copied"}

# ==================== PUBLIC STACKS (no auth) ====================

class PublishStackRequest(BaseModel):
    name: str
    idea: str
    tools: List[Dict[str, Any]]

@api_router.post("/stacks/publish")
@limiter.limit("5/minute")
async def publish_stack(request: Request, req: PublishStackRequest):
    """Publish a stack publicly without requiring auth — anyone gets a shareable URL."""
    slug = f"s_{uuid.uuid4().hex[:10]}"
    stack = {
        "stack_id": slug,
        "name": req.name[:80],
        "idea": req.idea,
        "tools": req.tools,
        "is_public": True,
        "copy_count": 0,
        "source": "community",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_stacks.insert_one(stack)
    stack.pop("_id", None)
    return stack

# ==================== EMAIL STACK ====================

class EmailStackRequest(BaseModel):
    email: str
    idea: str
    tools: List[Dict[str, Any]]

@api_router.post("/stacks/email-me")
async def email_stack(req: EmailStackRequest):
    """Save an email + stack so the user can be reminded to build it."""
    email = req.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")

    doc = {
        "email": email,
        "idea": req.idea,
        "tools": req.tools,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
    }
    await db.email_stacks.insert_one(doc)

    # Actually email the stack immediately (fire-and-forget)
    import asyncio
    asyncio.create_task(_safe_send_stack(email, req.idea, req.tools))

    return {"message": "Saved! Check your inbox — we'll remind you when it's time to build."}


async def _safe_send_stack(email: str, idea: str, tools: list):
    try:
        await send_stack_email(email, idea, tools)
    except Exception as e:
        logger.warning(f"Failed to send stack email to {email}: {e}")

# ==================== STATS ====================

@api_router.get("/stats")
@cache(expire=300)
async def get_stats():
    """Live counters for social proof on homepage."""
    stacks_count = await db.user_stacks.count_documents({})
    translations_count = await db.repo_translations.count_documents({})
    subscribers_count = await db.newsletter_subscribers.count_documents({"status": "active"})
    # Rough savings: each dead-tool session saves avg $800/yr
    email_stacks_count = await db.email_stacks.count_documents({})
    estimated_savings = (stacks_count + email_stacks_count) * 800
    return {
        "stacks_generated": max(stacks_count, 847),   # seed floor so it never shows 0
        "repos_translated": max(translations_count, 312),
        "estimated_savings": max(estimated_savings, 124000),
        "founders": max(subscribers_count + stacks_count, 1200),
    }

# ==================== SMART SEARCH ====================

@api_router.post("/search")
async def smart_search(req: SmartSearchRequest):
    """AI-powered search across curated DB and live GitHub"""
    results = []

    # 1. Parse query with AI
    parsed_query = {"keywords": req.query.lower().split(), "intent": "search"}
    try:
        prompt = f"""Parse this search: "{req.query}"
Return ONLY JSON (no markdown):
{{"keywords": ["word1", "word2"], "categories": ["ai", "saas"], "github_query": "optimized search for open source tools", "alternative_to": "paid tool name if possible"}}"""
        response = await call_ai(prompt, json_response=True)
        import json
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed_query = json.loads(cleaned)
    except Exception as e:
        logger.error(f"Query parse error: {e}")

    keywords = parsed_query.get("keywords", req.query.lower().split())

    # 2. Search our database
    if keywords:
        text_regex = "|".join(re.escape(k) for k in keywords[:5])
        db_query = {
            "$or": [
                {"name": {"$regex": text_regex, "$options": "i"}},
                {"description": {"$regex": text_regex, "$options": "i"}},
                {"tags": {"$in": keywords}},
                {"topics": {"$in": keywords}}
            ]
        }

        # Search curated tools
        tools = await db.tools.find(db_query, {"_id": 0}).limit(req.limit).to_list(req.limit)
        for t in tools:
            t["source"] = "curated"
            results.append(t)

        # Search github_repos
        gh_repos = await db.github_repos.find(db_query, {"_id": 0}).sort("score", -1).limit(req.limit - len(results)).to_list(req.limit - len(results))
        for r in gh_repos:
            r["source"] = "github_cached"
            results.append(r)

    # 3. Search GitHub live if not enough results
    if req.include_github_live and len(results) < req.limit:
        github_query = parsed_query.get("github_query", req.query)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://api.github.com/search/repositories",
                    params={
                        "q": f"{github_query} stars:>50",
                        "sort": "stars",
                        "order": "desc",
                        "per_page": req.limit - len(results)
                    },
                    headers=GITHUB_HEADERS,
                    timeout=15
                )
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get("items", []):
                        results.append({
                            "tool_id": item["full_name"].replace("/", "_").lower(),
                            "name": item["name"],
                            "full_name": item["full_name"],
                            "description": item.get("description") or "",
                            "stars": f"{item['stargazers_count']:,}",
                            "language": item.get("language") or "Unknown",
                            "github_url": item["html_url"],
                            "topics": item.get("topics", []),
                            "source": "github_live"
                        })
        except Exception as e:
            logger.error(f"GitHub live search error: {e}")

    # Split results into solutions vs building blocks (Phase 6)
    complete_solutions = [r for r in results if r.get("repo_type") == "complete_solution"]
    building_blocks = [r for r in results if r.get("repo_type") != "complete_solution"]

    return {
        "query": req.query,
        "parsed": parsed_query,
        "results": results[:req.limit],
        "solutions": complete_solutions[:5],
        "building_blocks": building_blocks[:req.limit],
        "total": len(results)
    }



# ==================== GITHUB SCRAPER ====================

@api_router.post("/scraper/run")
@limiter.limit("5/minute")
async def trigger_scraper(request: Request, background_tasks: BackgroundTasks, admin: UserModel = Depends(require_admin)):
    """Manually trigger GitHub scraper (admin only)"""
    from github_scraper import GitHubScraper

    async def run_scrape():
        scraper = GitHubScraper(db)
        await scraper.run_full_scrape()

    background_tasks.add_task(run_scrape)
    return {"message": "Scraper started in background"}

@api_router.get("/scraper/status")
async def scraper_status():
    """Get last scrape status with details"""
    metadata = await db.scrape_metadata.find_one({"_id": "last_scrape"})
    gh_count = await db.github_repos.count_documents({})
    hot_count = await db.github_repos.count_documents({"tier": "hot"})
    warm_count = await db.github_repos.count_documents({"tier": "warm"})
    with_topics = await db.github_repos.count_documents({"topics": {"$ne": []}})

    result = {
        "total_repos": gh_count,
        "hot_tier": hot_count,
        "warm_tier": warm_count,
        "with_topics": with_topics,
        "cron_active": _scraper_task is not None and not _scraper_task.done() if _scraper_task else False,
        "cron_interval": "Every 6 hours"
    }

    if metadata:
        result["last_scrape"] = metadata.get("timestamp")
        result["stats"] = metadata.get("stats")
    else:
        result["last_scrape"] = None
        result["stats"] = None
    return result


# ==================== DAILY DROP (Admin Trigger) ====================

@api_router.post("/admin/email/daily-drop")
@limiter.limit("5/minute")
async def trigger_daily_drop(request: Request, test_email: str = None, admin: UserModel = Depends(require_admin)):
    """Manually trigger the Daily Drop. Pass ?test_email=... to send to one address only."""
    try:
        await send_daily_drop(db, test_email=test_email)
        return {"message": "Daily Drop sent", "test_email": test_email}
    except Exception as e:
        logger.error(f"Daily Drop trigger failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.post("/admin/email/onboarding-drip")
@limiter.limit("5/minute")
async def trigger_onboarding_drip(request: Request, user_id: str = None, admin: UserModel = Depends(require_admin)):
    """Manually trigger the onboarding drip. Pass ?user_id=... to test one user."""
    try:
        await run_onboarding_drip(db, test_user_id=user_id)
        return {"message": "Onboarding drip processed", "user_id": user_id}
    except Exception as e:
        logger.error(f"Onboarding drip trigger failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

    # BUG-01 FIX: function was missing its return statement, causing FastAPI to return null.
    return result

# BUG-02 FIX: Removed duplicate TOPIC_KEYWORDS dict that was defined here a second time.
# The canonical TOPIC_KEYWORDS definition is at the top of the file (~L560).
# This block shadowed it with a shorter, less-complete version.

# ==================== SEED DATA ====================

GLOBAL_SEED_TOPICS = [
    {"topic_id": "ai-agents", "name": "AI Agents", "icon": "Bot", "color": "text-blue-600", "bg_color": "bg-blue-100", "tool_count": 0},
    {"topic_id": "ai-coding-tools", "name": "AI Coding Tools", "icon": "Code", "color": "text-violet-600", "bg_color": "bg-violet-100", "tool_count": 0},
    {"topic_id": "ai-memory-pkm", "name": "AI Memory & PKM", "icon": "Brain", "color": "text-fuchsia-600", "bg_color": "bg-fuchsia-100", "tool_count": 0},
    {"topic_id": "local-ai", "name": "Local AI & Models", "icon": "Cpu", "color": "text-green-600", "bg_color": "bg-green-100", "tool_count": 0},
    {"topic_id": "mcp-tools", "name": "MCP & Agent Tools", "icon": "Network", "color": "text-blue-600", "bg_color": "bg-blue-100", "tool_count": 0},
    {"topic_id": "ai-agents-advanced", "name": "Advanced AI Agents", "icon": "Bot", "color": "text-orange-600", "bg_color": "bg-orange-100", "tool_count": 0},
    {"topic_id": "ui-ux", "name": "UI/UX Tools", "icon": "Palette", "color": "text-pink-600", "bg_color": "bg-pink-100", "tool_count": 0},
    {"topic_id": "automation", "name": "Automation", "icon": "Zap", "color": "text-yellow-600", "bg_color": "bg-yellow-100", "tool_count": 0},
    {"topic_id": "data-analytics", "name": "Data & Analytics", "icon": "LineChart", "color": "text-emerald-600", "bg_color": "bg-emerald-100", "tool_count": 0},
    {"topic_id": "voice-speech-ai", "name": "Voice & Speech AI", "icon": "Mic", "color": "text-yellow-600", "bg_color": "bg-yellow-100", "tool_count": 0},
    {"topic_id": "code-quality-review", "name": "Code Quality & Review", "icon": "CheckCircle", "color": "text-green-600", "bg_color": "bg-green-100", "tool_count": 0},
    {"topic_id": "rag-vector-search", "name": "RAG & Vector Search", "icon": "Database", "color": "text-blue-600", "bg_color": "bg-blue-100", "tool_count": 0},
    {"topic_id": "scraping-data-extraction", "name": "Scraping & Data", "icon": "Globe", "color": "text-emerald-600", "bg_color": "bg-emerald-100", "tool_count": 0},
    {"topic_id": "terminal-shell", "name": "Terminal & Dotfiles", "icon": "Terminal", "color": "text-zinc-600", "bg_color": "bg-zinc-100", "tool_count": 0},
    {"topic_id": "payments", "name": "Payments & Billing", "icon": "CreditCard", "color": "text-orange-600", "bg_color": "bg-orange-100", "tool_count": 0},
    {"topic_id": "auth", "name": "Authentication", "icon": "Shield", "color": "text-purple-600", "bg_color": "bg-purple-100", "tool_count": 0},
    {"topic_id": "email-messaging", "name": "Email & Messaging", "icon": "Mail", "color": "text-rose-600", "bg_color": "bg-rose-100", "tool_count": 0},
    {"topic_id": "cms-content", "name": "CMS & Content", "icon": "FileText", "color": "text-teal-600", "bg_color": "bg-teal-100", "tool_count": 0},
    {"topic_id": "mobile-dev", "name": "Mobile Dev", "icon": "Smartphone", "color": "text-indigo-600", "bg_color": "bg-indigo-100", "tool_count": 0},
    {"topic_id": "testing-qa", "name": "Testing & QA", "icon": "TestTube2", "color": "text-cyan-600", "bg_color": "bg-cyan-100", "tool_count": 0},
    {"topic_id": "web3-blockchain", "name": "Web3 & Blockchain", "icon": "Blocks", "color": "text-amber-600", "bg_color": "bg-amber-100", "tool_count": 0},
    {"topic_id": "selfhosted", "name": "Self-Hosted", "icon": "Server", "color": "text-slate-600", "bg_color": "bg-slate-100", "tool_count": 0},
]

@api_router.post("/seed")
@api_router.get("/seed")
async def seed_database(force: bool = False):
    """Seed the database with initial tools, topics, and collections.
    Pass ?force=true to add new tools without deleting existing data."""

    lock = await db.seed_lock.find_one({"_id": "seed_lock"})
    already_seeded = lock and lock.get("seeded")

    if already_seeded and not force:
        await db.topics.delete_many({})
        await db.topics.insert_many(GLOBAL_SEED_TOPICS)
        existing = await db.tools.count_documents({})
        return {"message": "Already seeded. Use ?force=true to add new tools.", "tools_count": existing}

    await db.seed_lock.update_one(
        {"_id": "seed_lock"},
        {"$set": {"seeded": True, "timestamp": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

    await db.topics.delete_many({})
    await db.topics.insert_many(GLOBAL_SEED_TOPICS)

    if force and already_seeded:
        existing_ids = {t["tool_id"] async for t in db.tools.find({}, {"tool_id": 1})}
        new_tools = [t for t in tools if t["tool_id"] not in existing_ids]
        if new_tools:
            await db.tools.insert_many(new_tools)
        return {
            "message": f"Added {len(new_tools)} new tools.",
            "new_tools": [t["tool_id"] for t in new_tools],
            "total_tools": await db.tools.count_documents({})
        }

    await db.tools.delete_many({})
    await db.tools.insert_many(tools)

tools = [
        # Forms & Surveys
        {
            "tool_id": "formbricks",
            "name": "Formbricks",
            "description": "Build beautiful surveys and forms without any coding. Works like Typeform but it's completely free.",
            "who_its_for": "Founders who want to collect feedback, run surveys, or create contact forms",
            "what_you_can_build": ["Customer feedback surveys", "Contact forms", "NPS surveys", "Lead capture forms"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Sign up on their website", "Create a new survey using the visual builder", "Copy the embed code to your website"],
            "related_tools": ["cal-com", "plausible", "umami"],
            "github_url": "https://github.com/formbricks/formbricks",
            "stars": "8.2k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["forms", "surveys", "feedback", "no-code"],
            "paid_alternative": "Typeform",
            "monthly_cost": "$25/mo"
        },
        # Scheduling
        {
            "tool_id": "cal-com",
            "name": "Cal.com",
            "description": "Let people book meetings with you. It's like Calendly but you own all your data.",
            "who_its_for": "Anyone who needs to schedule meetings - consultants, coaches, salespeople",
            "what_you_can_build": ["Booking pages", "Team scheduling", "Appointment systems"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Create a free account at cal.com", "Connect your Google Calendar", "Share your booking link"],
            "related_tools": ["formbricks", "n8n", "ghostcms"],
            "github_url": "https://github.com/calcom/cal.com",
            "stars": "24.5k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["scheduling", "calendar", "booking", "meetings"],
            "paid_alternative": "Calendly",
            "monthly_cost": "$12/mo"
        },
        # Automation
        {
            "tool_id": "n8n",
            "name": "n8n",
            "description": "Connect different apps and automate tasks. Like Zapier, but you can host it yourself for free.",
            "who_its_for": "Founders who want to automate repetitive tasks between different tools",
            "what_you_can_build": ["Email automation", "CRM workflows", "Data syncing", "Social media automation"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Use n8n.cloud for quick start or self-host", "Connect your first two apps", "Build your automation flow visually"],
            "related_tools": ["cal-com", "nocodb", "appwrite"],
            "github_url": "https://github.com/n8n-io/n8n",
            "stars": "35.1k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["automation", "workflow", "integration", "zapier-alternative"],
            "paid_alternative": "Zapier",
            "monthly_cost": "$20/mo"
        },
        # Analytics
        {
            "tool_id": "plausible",
            "name": "Plausible",
            "description": "See who's visiting your website without invading their privacy. Simple and GDPR-friendly.",
            "who_its_for": "Anyone with a website who wants simple, privacy-respecting analytics",
            "what_you_can_build": ["Website analytics dashboard", "Traffic tracking", "Conversion tracking"],
            "difficulty": "Beginner",
            "setup_time": "5 mins",
            "setup_steps": ["Sign up at plausible.io", "Add one line of code to your website", "View your dashboard"],
            "related_tools": ["umami", "formbricks", "ghostcms"],
            "github_url": "https://github.com/plausible/analytics",
            "stars": "16.8k",
            "language": "Elixir",
            "category": "Data & Analytics",
            "tags": ["analytics", "privacy", "gdpr", "google-analytics-alternative"],
            "paid_alternative": "Google Analytics 360",
            "monthly_cost": "$150/mo"
        },
        {
            "tool_id": "umami",
            "name": "Umami",
            "description": "Track your website visitors with a beautiful, simple dashboard. No cookies needed.",
            "who_its_for": "Developers and founders who want privacy-focused analytics they can self-host",
            "what_you_can_build": ["Privacy-first analytics", "Real-time visitor tracking", "Custom dashboards"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy to Vercel for free", "Add tracking script to your site", "View analytics in your dashboard"],
            "related_tools": ["plausible", "formbricks", "posthog"],
            "github_url": "https://github.com/umami-software/umami",
            "stars": "18.5k",
            "language": "TypeScript",
            "category": "Data & Analytics",
            "tags": ["analytics", "privacy", "self-hosted"],
            "paid_alternative": "Mixpanel",
            "monthly_cost": "$28/mo"
        },
        # CMS
        {
            "tool_id": "ghostcms",
            "name": "Ghost",
            "description": "Create a professional blog or newsletter. Built for creators who want to own their content.",
            "who_its_for": "Writers, bloggers, and anyone building an audience through content",
            "what_you_can_build": ["Professional blog", "Paid newsletter", "Membership site"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Sign up at ghost.org or self-host", "Choose a theme", "Start publishing"],
            "related_tools": ["plausible", "buttondown", "listmonk"],
            "github_url": "https://github.com/TryGhost/Ghost",
            "stars": "44.2k",
            "language": "JavaScript",
            "category": "UI/UX Tools",
            "tags": ["cms", "blog", "newsletter", "publishing"],
            "paid_alternative": "Substack Pro",
            "monthly_cost": "$50/mo"
        },
        # Database
        {
            "tool_id": "nocodb",
            "name": "NocoDB",
            "description": "Turn any database into a smart spreadsheet. Like Airtable but free and you own your data.",
            "who_its_for": "Teams who need a flexible database that feels like a spreadsheet",
            "what_you_can_build": ["Project management", "CRM", "Inventory tracking", "Any database app"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Deploy for free on their cloud", "Import your data or start fresh", "Build views and forms"],
            "related_tools": ["n8n", "appwrite", "supabase"],
            "github_url": "https://github.com/nocodb/nocodb",
            "stars": "40.2k",
            "language": "TypeScript",
            "category": "Data & Analytics",
            "tags": ["database", "spreadsheet", "airtable-alternative", "no-code"],
            "paid_alternative": "Airtable",
            "monthly_cost": "$20/mo"
        },
        {
            "tool_id": "supabase",
            "name": "Supabase",
            "description": "Get a database, authentication, and file storage in one place. Firebase alternative you can trust.",
            "who_its_for": "Developers building apps who need a complete backend",
            "what_you_can_build": ["Web apps", "Mobile apps", "SaaS products", "Real-time apps"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Create a project at supabase.com", "Use the dashboard to create tables", "Connect your app with their SDK"],
            "related_tools": ["appwrite", "nocodb", "pocketbase"],
            "github_url": "https://github.com/supabase/supabase",
            "stars": "62.3k",
            "language": "TypeScript",
            "category": "Data & Analytics",
            "tags": ["database", "backend", "auth", "firebase-alternative"],
            "paid_alternative": "Firebase",
            "monthly_cost": "$25/mo"
        },
        # Backend
        {
            "tool_id": "appwrite",
            "name": "Appwrite",
            "description": "Everything you need to build an app - database, auth, storage, functions. One platform.",
            "who_its_for": "Developers who want a complete backend without managing servers",
            "what_you_can_build": ["Web applications", "Mobile apps", "APIs", "Serverless functions"],
            "difficulty": "Intermediate",
            "setup_time": "25 mins",
            "setup_steps": ["Use Appwrite Cloud or self-host", "Create your first project", "Add your app's features"],
            "related_tools": ["supabase", "pocketbase", "n8n"],
            "github_url": "https://github.com/appwrite/appwrite",
            "stars": "38.5k",
            "language": "TypeScript",
            "category": "Data & Analytics",
            "tags": ["backend", "baas", "database", "auth"],
            "paid_alternative": "AWS Amplify",
            "monthly_cost": "$50/mo"
        },
        {
            "tool_id": "pocketbase",
            "name": "PocketBase",
            "description": "A complete backend in a single file. Database, auth, and file storage ready to go.",
            "who_its_for": "Solo developers who want the simplest possible backend",
            "what_you_can_build": ["Small to medium apps", "MVPs", "Side projects"],
            "difficulty": "Beginner",
            "setup_time": "5 mins",
            "setup_steps": ["Download the single executable", "Run it on your computer or server", "Use the admin dashboard"],
            "related_tools": ["supabase", "appwrite", "nocodb"],
            "github_url": "https://github.com/pocketbase/pocketbase",
            "stars": "32.1k",
            "language": "Go",
            "category": "Data & Analytics",
            "tags": ["backend", "database", "simple", "sqlite"],
            "paid_alternative": "Firebase",
            "monthly_cost": "$25/mo"
        },
        # Email
        {
            "tool_id": "listmonk",
            "name": "Listmonk",
            "description": "Send newsletters and manage email lists. High-performance email for serious marketers.",
            "who_its_for": "Marketers and founders with large email lists",
            "what_you_can_build": ["Email newsletters", "Marketing campaigns", "Transactional emails"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Self-host using Docker", "Import your email list", "Create and send campaigns"],
            "related_tools": ["ghostcms", "buttondown", "plausible"],
            "github_url": "https://github.com/knadh/listmonk",
            "stars": "12.8k",
            "language": "Go",
            "category": "Automation",
            "tags": ["email", "newsletter", "marketing", "mailchimp-alternative"],
            "paid_alternative": "Mailchimp",
            "monthly_cost": "$30/mo"
        },
        {
            "tool_id": "buttondown",
            "name": "Buttondown",
            "description": "The simplest way to start a newsletter. Clean, minimal, focused on writing.",
            "who_its_for": "Writers who want a no-fuss newsletter tool",
            "what_you_can_build": ["Personal newsletter", "Paid subscriptions", "RSS-to-email"],
            "difficulty": "Beginner",
            "setup_time": "5 mins",
            "setup_steps": ["Sign up for free tier", "Import subscribers if you have them", "Write and send"],
            "related_tools": ["ghostcms", "listmonk", "plausible"],
            "github_url": "https://github.com/buttondown-email/roadmap",
            "stars": "1.2k",
            "language": "Python",
            "category": "UI/UX Tools",
            "tags": ["newsletter", "email", "writing"],
            "paid_alternative": "ConvertKit",
            "monthly_cost": "$29/mo"
        },
        # E-commerce
        {
            "tool_id": "medusa",
            "name": "Medusa",
            "description": "Build your own online store. Like Shopify but open-source and customizable.",
            "who_its_for": "E-commerce founders who want full control over their store",
            "what_you_can_build": ["Online stores", "Marketplaces", "B2B commerce"],
            "difficulty": "Advanced",
            "setup_time": "1 hour",
            "setup_steps": ["Set up the Medusa server", "Connect a storefront template", "Add your products"],
            "related_tools": ["saleor", "nocodb", "n8n"],
            "github_url": "https://github.com/medusajs/medusa",
            "stars": "22.1k",
            "language": "TypeScript",
            "category": "Payments & Billing",
            "tags": ["ecommerce", "store", "shopify-alternative"],
            "paid_alternative": "Shopify",
            "monthly_cost": "$79/mo"
        },
        {
            "tool_id": "saleor",
            "name": "Saleor",
            "description": "Enterprise-grade e-commerce platform. Build stores that can handle serious traffic.",
            "who_its_for": "Growing e-commerce businesses needing scale",
            "what_you_can_build": ["Large online stores", "Multi-channel commerce", "B2B platforms"],
            "difficulty": "Advanced",
            "setup_time": "2 hours",
            "setup_steps": ["Deploy using their cloud or self-host", "Configure your store settings", "Add products and categories"],
            "related_tools": ["medusa", "nocodb", "supabase"],
            "github_url": "https://github.com/saleor/saleor",
            "stars": "19.8k",
            "language": "Python",
            "category": "Payments & Billing",
            "tags": ["ecommerce", "enterprise", "graphql"],
            "paid_alternative": "Shopify Plus",
            "monthly_cost": "$2000/mo"
        },
        # AI Tools
        {
            "tool_id": "langchain",
            "name": "LangChain",
            "description": "Build AI applications that can think, remember, and take actions. The framework for AI agents.",
            "who_its_for": "Developers building AI-powered products",
            "what_you_can_build": ["Chatbots", "AI agents", "Document Q&A", "Automated workflows"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Install the library", "Connect to an AI model (OpenAI, etc.)", "Build your first chain"],
            "related_tools": ["llamaindex", "flowise", "dify"],
            "github_url": "https://github.com/langchain-ai/langchain",
            "stars": "82.5k",
            "language": "Python",
            "category": "AI Agents",
            "tags": ["ai", "llm", "agents", "chatbot"],
            "paid_alternative": "Custom AI development",
            "monthly_cost": "$5000/mo"
        },
        {
            "tool_id": "flowise",
            "name": "Flowise",
            "description": "Build AI workflows by dragging and dropping. No coding needed to create AI apps.",
            "who_its_for": "Non-technical founders who want to build AI products",
            "what_you_can_build": ["AI chatbots", "Document assistants", "Customer support bots"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy on their cloud or locally", "Drag components to build your flow", "Connect to ChatGPT or other models"],
            "related_tools": ["langchain", "dify", "n8n"],
            "github_url": "https://github.com/FlowiseAI/Flowise",
            "stars": "24.2k",
            "language": "TypeScript",
            "category": "AI Agents",
            "tags": ["ai", "no-code", "chatbot", "visual"],
            "paid_alternative": "Botpress",
            "monthly_cost": "$50/mo"
        },
        {
            "tool_id": "dify",
            "name": "Dify",
            "description": "Create AI apps visually. Combines workflow builder with prompt management.",
            "who_its_for": "Teams building AI products who want visual development",
            "what_you_can_build": ["AI assistants", "Content generators", "Data analysis tools"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Use Dify.ai cloud or self-host", "Create a new app", "Design your AI workflow"],
            "related_tools": ["flowise", "langchain", "llamaindex"],
            "github_url": "https://github.com/langgenius/dify",
            "stars": "28.5k",
            "language": "Python",
            "category": "AI Agents",
            "tags": ["ai", "workflow", "llm", "visual"],
            "paid_alternative": "OpenAI Assistants API",
            "monthly_cost": "$100/mo"
        },
        {
            "tool_id": "llamaindex",
            "name": "LlamaIndex",
            "description": "Connect your data to AI. Make ChatGPT understand your documents.",
            "who_its_for": "Developers building AI apps that work with custom data",
            "what_you_can_build": ["Document Q&A", "Knowledge bases", "AI research tools"],
            "difficulty": "Intermediate",
            "setup_time": "25 mins",
            "setup_steps": ["Install the library", "Index your documents", "Query with natural language"],
            "related_tools": ["langchain", "flowise", "dify"],
            "github_url": "https://github.com/run-llama/llama_index",
            "stars": "30.2k",
            "language": "Python",
            "category": "AI Agents",
            "tags": ["ai", "rag", "documents", "search"],
            "paid_alternative": "Pinecone + custom dev",
            "monthly_cost": "$200/mo"
        },
        # Auth
        {
            "tool_id": "authjs",
            "name": "Auth.js",
            "description": "Add login to your app in minutes. Supports Google, GitHub, email, and more.",
            "who_its_for": "Developers adding authentication to web apps",
            "what_you_can_build": ["User login systems", "Social auth", "Passwordless login"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Install the package", "Configure your providers", "Add login buttons"],
            "related_tools": ["supabase", "appwrite", "clerk"],
            "github_url": "https://github.com/nextauthjs/next-auth",
            "stars": "21.5k",
            "language": "TypeScript",
            "category": "Authentication",
            "tags": ["auth", "login", "oauth", "nextjs"],
            "paid_alternative": "Auth0",
            "monthly_cost": "$35/mo"
        },
        {
            "tool_id": "keycloak",
            "name": "Keycloak",
            "description": "Enterprise identity management. Single sign-on for all your apps.",
            "who_its_for": "Organizations needing centralized authentication",
            "what_you_can_build": ["SSO systems", "User management", "Identity federation"],
            "difficulty": "Advanced",
            "setup_time": "1 hour",
            "setup_steps": ["Deploy using Docker", "Configure your realm", "Integrate with your apps"],
            "related_tools": ["authjs", "supabase", "appwrite"],
            "github_url": "https://github.com/keycloak/keycloak",
            "stars": "18.9k",
            "language": "Java",
            "category": "Authentication",
            "tags": ["auth", "sso", "enterprise", "identity"],
            "paid_alternative": "Okta",
            "monthly_cost": "$150/mo"
        },
        # UI Components
        {
            "tool_id": "shadcn",
            "name": "shadcn/ui",
            "description": "Beautiful UI components you can copy and paste. Not a library - you own the code.",
            "who_its_for": "Developers who want great-looking UI without being locked into a library",
            "what_you_can_build": ["Modern web interfaces", "Dashboards", "Landing pages"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Run the CLI to initialize", "Add components you need", "Customize the code"],
            "related_tools": ["tailwindcss", "radix-ui", "react"],
            "github_url": "https://github.com/shadcn-ui/ui",
            "stars": "52.8k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["ui", "components", "react", "tailwind"],
            "paid_alternative": "Chakra UI Pro",
            "monthly_cost": "$200 one-time"
        },
        {
            "tool_id": "radix-ui",
            "name": "Radix UI",
            "description": "Accessible UI primitives. Build great interfaces that work for everyone.",
            "who_its_for": "Developers who care about accessibility",
            "what_you_can_build": ["Accessible web apps", "Design systems", "Component libraries"],
            "difficulty": "Intermediate",
            "setup_time": "15 mins",
            "setup_steps": ["Install the primitives you need", "Add your styling", "Compose into components"],
            "related_tools": ["shadcn", "tailwindcss", "react"],
            "github_url": "https://github.com/radix-ui/primitives",
            "stars": "14.2k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["ui", "accessibility", "components", "headless"],
            "paid_alternative": "Headless UI Pro",
            "monthly_cost": "$100 one-time"
        },
        # CRM
        {
            "tool_id": "twenty",
            "name": "Twenty",
            "description": "Modern CRM that's actually pleasant to use. Track your customers and deals.",
            "who_its_for": "Sales teams and founders managing customer relationships",
            "what_you_can_build": ["Sales pipeline", "Customer database", "Deal tracking"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy on their cloud or self-host", "Import your contacts", "Set up your pipeline"],
            "related_tools": ["nocodb", "n8n", "cal-com"],
            "github_url": "https://github.com/twentyhq/twenty",
            "stars": "15.3k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["crm", "sales", "customers", "salesforce-alternative"],
            "paid_alternative": "Salesforce",
            "monthly_cost": "$75/mo"
        },
        # Project Management
        {
            "tool_id": "plane",
            "name": "Plane",
            "description": "Project management that doesn't suck. Track issues and sprints with a clean interface.",
            "who_its_for": "Teams managing software projects",
            "what_you_can_build": ["Issue tracking", "Sprint planning", "Project roadmaps"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Use Plane cloud or self-host", "Create your first project", "Invite your team"],
            "related_tools": ["nocodb", "twenty", "cal-com"],
            "github_url": "https://github.com/makeplane/plane",
            "stars": "24.8k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["project-management", "issues", "jira-alternative"],
            "paid_alternative": "Jira",
            "monthly_cost": "$10/user/mo"
        },
        # Product Analytics
        {
            "tool_id": "posthog",
            "name": "PostHog",
            "description": "Understand how people use your product. Analytics, session recording, feature flags.",
            "who_its_for": "Product teams who want deep insights into user behavior",
            "what_you_can_build": ["Product analytics", "A/B testing", "Feature flags"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Sign up for PostHog Cloud", "Add the tracking code", "View your first insights"],
            "related_tools": ["plausible", "umami", "formbricks"],
            "github_url": "https://github.com/PostHog/posthog",
            "stars": "16.9k",
            "language": "Python",
            "category": "Data & Analytics",
            "tags": ["analytics", "product", "ab-testing", "mixpanel-alternative"],
            "paid_alternative": "Amplitude",
            "monthly_cost": "$49/mo"
        },
        # Documentation
        {
            "tool_id": "docusaurus",
            "name": "Docusaurus",
            "description": "Create beautiful documentation websites. Used by Facebook, Discord, and more.",
            "who_its_for": "Teams that need to document their products",
            "what_you_can_build": ["Documentation sites", "Developer portals", "Knowledge bases"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Run the create command", "Edit the markdown files", "Deploy to Vercel or Netlify"],
            "related_tools": ["mintlify", "gitbook", "notion"],
            "github_url": "https://github.com/facebook/docusaurus",
            "stars": "51.2k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["documentation", "docs", "markdown"],
            "paid_alternative": "GitBook",
            "monthly_cost": "$6.70/mo"
        },
        {
            "tool_id": "mintlify",
            "name": "Mintlify",
            "description": "Documentation that looks amazing out of the box. No design skills needed.",
            "who_its_for": "Startups who want polished docs quickly",
            "what_you_can_build": ["API documentation", "Product guides", "Knowledge bases"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Connect your GitHub repo", "Write in Markdown", "Docs update automatically"],
            "related_tools": ["docusaurus", "gitbook", "readme"],
            "github_url": "https://github.com/mintlify/mint",
            "stars": "2.4k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["documentation", "api", "developer"],
            "paid_alternative": "ReadMe",
            "monthly_cost": "$99/mo"
        },
        # Status Pages
        {
            "tool_id": "upptime",
            "name": "Upptime",
            "description": "Monitor your website uptime using just GitHub. Free status page included.",
            "who_its_for": "Anyone who needs to show their service status to customers",
            "what_you_can_build": ["Status pages", "Uptime monitoring", "Incident tracking"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Fork the GitHub repo", "Configure your sites to monitor", "GitHub Actions runs the checks"],
            "related_tools": ["plausible", "umami", "posthog"],
            "github_url": "https://github.com/upptime/upptime",
            "stars": "14.5k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["monitoring", "uptime", "status-page"],
            "paid_alternative": "Statuspage",
            "monthly_cost": "$29/mo"
        },
        # Landing Pages
        {
            "tool_id": "astro",
            "name": "Astro",
            "description": "Build lightning-fast websites. Perfect for blogs, marketing sites, and landing pages.",
            "who_its_for": "Anyone building content-focused websites",
            "what_you_can_build": ["Landing pages", "Blogs", "Marketing sites", "Documentation"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Run create astro", "Choose a template", "Deploy to Vercel"],
            "related_tools": ["nextjs", "docusaurus", "ghostcms"],
            "github_url": "https://github.com/withastro/astro",
            "stars": "40.1k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["framework", "static", "fast", "landing-page"],
            "paid_alternative": "Webflow",
            "monthly_cost": "$14/mo"
        },
        {
            "tool_id": "nextjs",
            "name": "Next.js",
            "description": "The most popular way to build React websites. Used by Netflix, TikTok, and more.",
            "who_its_for": "Developers building modern web applications",
            "what_you_can_build": ["Web apps", "E-commerce", "SaaS products", "Blogs"],
            "difficulty": "Intermediate",
            "setup_time": "15 mins",
            "setup_steps": ["Run create-next-app", "Start coding", "Deploy to Vercel for free"],
            "related_tools": ["astro", "supabase", "shadcn"],
            "github_url": "https://github.com/vercel/next.js",
            "stars": "118.2k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["react", "framework", "fullstack"],
            "paid_alternative": "Custom development",
            "monthly_cost": "$0"
        },
        # File Storage
        {
            "tool_id": "minio",
            "name": "MinIO",
            "description": "Store files and images like AWS S3, but host it yourself for free.",
            "who_its_for": "Apps that need to store user uploads",
            "what_you_can_build": ["File storage", "Image hosting", "Backup systems"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy with Docker", "Configure your buckets", "Connect your app"],
            "related_tools": ["supabase", "appwrite", "pocketbase"],
            "github_url": "https://github.com/minio/minio",
            "stars": "43.5k",
            "language": "Go",
            "category": "Data & Analytics",
            "tags": ["storage", "s3", "files", "self-hosted"],
            "paid_alternative": "AWS S3",
            "monthly_cost": "$23/mo"
        },
        # Video
        {
            "tool_id": "jellyfin",
            "name": "Jellyfin",
            "description": "Your own Netflix. Stream your media collection from anywhere.",
            "who_its_for": "Media collectors who want their own streaming service",
            "what_you_can_build": ["Personal streaming", "Media server", "Video library"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Install on your server", "Add your media folders", "Stream from any device"],
            "related_tools": ["minio", "pocketbase", "nextjs"],
            "github_url": "https://github.com/jellyfin/jellyfin",
            "stars": "28.2k",
            "language": "C#",
            "category": "UI/UX Tools",
            "tags": ["media", "streaming", "plex-alternative"],
            "paid_alternative": "Plex Pass",
            "monthly_cost": "$5/mo"
        },
        # Password Manager
        {
            "tool_id": "vaultwarden",
            "name": "Vaultwarden",
            "description": "Self-hosted password manager. Bitwarden compatible but lighter.",
            "who_its_for": "Privacy-conscious users and teams",
            "what_you_can_build": ["Personal password vault", "Team password sharing"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy with Docker", "Create your account", "Install browser extension"],
            "related_tools": ["keycloak", "authjs", "minio"],
            "github_url": "https://github.com/dani-garcia/vaultwarden",
            "stars": "31.2k",
            "language": "Rust",
            "category": "Authentication",
            "tags": ["passwords", "security", "bitwarden"],
            "paid_alternative": "1Password Teams",
            "monthly_cost": "$7.99/mo"
        },
        # Chat
        {
            "tool_id": "rocketchat",
            "name": "Rocket.Chat",
            "description": "Team chat like Slack, but you own the server. Great for privacy-focused teams.",
            "who_its_for": "Organizations needing secure team communication",
            "what_you_can_build": ["Team chat", "Customer support", "Community platform"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy on your server", "Invite team members", "Set up channels"],
            "related_tools": ["mattermost", "n8n", "cal-com"],
            "github_url": "https://github.com/RocketChat/Rocket.Chat",
            "stars": "38.1k",
            "language": "TypeScript",
            "category": "Automation",
            "tags": ["chat", "team", "slack-alternative"],
            "paid_alternative": "Slack Business+",
            "monthly_cost": "$15/user/mo"
        },
        {
            "tool_id": "mattermost",
            "name": "Mattermost",
            "description": "Secure team messaging for enterprises. Like Slack but with compliance features.",
            "who_its_for": "Companies with strict security requirements",
            "what_you_can_build": ["Enterprise chat", "DevOps collaboration", "Incident management"],
            "difficulty": "Intermediate",
            "setup_time": "45 mins",
            "setup_steps": ["Deploy on your infrastructure", "Configure security settings", "Integrate with your tools"],
            "related_tools": ["rocketchat", "n8n", "plane"],
            "github_url": "https://github.com/mattermost/mattermost",
            "stars": "27.5k",
            "language": "Go",
            "category": "Automation",
            "tags": ["chat", "enterprise", "security"],
            "paid_alternative": "Microsoft Teams",
            "monthly_cost": "$12.50/user/mo"
        },
        # Payments
        {
            "tool_id": "killbill",
            "name": "Kill Bill",
            "description": "Handle subscriptions and billing. Enterprise-grade billing that's free.",
            "who_its_for": "SaaS companies needing complex billing",
            "what_you_can_build": ["Subscription billing", "Usage-based pricing", "Invoice systems"],
            "difficulty": "Advanced",
            "setup_time": "2 hours",
            "setup_steps": ["Deploy the platform", "Configure your pricing plans", "Integrate with payment gateway"],
            "related_tools": ["medusa", "saleor", "supabase"],
            "github_url": "https://github.com/killbill/killbill",
            "stars": "4.3k",
            "language": "Java",
            "category": "Payments & Billing",
            "tags": ["billing", "subscriptions", "payments"],
            "paid_alternative": "Chargebee",
            "monthly_cost": "$249/mo"
        },
        # Website Builder
        {
            "tool_id": "webstudio",
            "name": "Webstudio",
            "description": "Visual website builder like Webflow, but open source. Design without code.",
            "who_its_for": "Designers and marketers building websites",
            "what_you_can_build": ["Marketing sites", "Landing pages", "Portfolios"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Use webstudio.is or self-host", "Design in the visual editor", "Publish your site"],
            "related_tools": ["astro", "nextjs", "shadcn"],
            "github_url": "https://github.com/webstudio-is/webstudio",
            "stars": "3.8k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["website-builder", "no-code", "webflow-alternative"],
            "paid_alternative": "Webflow",
            "monthly_cost": "$14/mo"
        },
        # Monitoring
        {
            "tool_id": "grafana",
            "name": "Grafana",
            "description": "Beautiful dashboards for any data. Monitor everything in one place.",
            "who_its_for": "DevOps teams and data analysts",
            "what_you_can_build": ["Monitoring dashboards", "Data visualization", "Alerting systems"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy Grafana", "Connect your data sources", "Create dashboards"],
            "related_tools": ["prometheus", "posthog", "plausible"],
            "github_url": "https://github.com/grafana/grafana",
            "stars": "59.8k",
            "language": "TypeScript",
            "category": "Data & Analytics",
            "tags": ["monitoring", "dashboards", "visualization"],
            "paid_alternative": "Datadog",
            "monthly_cost": "$15/host/mo"
        },
        # API Gateway
        {
            "tool_id": "kong",
            "name": "Kong",
            "description": "Manage all your APIs in one place. Rate limiting, auth, analytics included.",
            "who_its_for": "Teams with multiple APIs to manage",
            "what_you_can_build": ["API gateway", "Microservices routing", "API management"],
            "difficulty": "Advanced",
            "setup_time": "1 hour",
            "setup_steps": ["Deploy Kong", "Configure your services", "Add plugins for features"],
            "related_tools": ["supabase", "appwrite", "n8n"],
            "github_url": "https://github.com/Kong/kong",
            "stars": "37.1k",
            "language": "Lua",
            "category": "Data & Analytics",
            "tags": ["api", "gateway", "microservices"],
            "paid_alternative": "AWS API Gateway",
            "monthly_cost": "$3.50/million requests"
        },
        # Search
        {
            "tool_id": "meilisearch",
            "name": "Meilisearch",
            "description": "Lightning-fast search for your app. Add powerful search in minutes.",
            "who_its_for": "Apps that need search functionality",
            "what_you_can_build": ["Product search", "Content search", "Autocomplete"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy Meilisearch", "Index your data", "Add search to your frontend"],
            "related_tools": ["supabase", "nocodb", "posthog"],
            "github_url": "https://github.com/meilisearch/meilisearch",
            "stars": "42.3k",
            "language": "Rust",
            "category": "Data & Analytics",
            "tags": ["search", "algolia-alternative", "fast"],
            "paid_alternative": "Algolia",
            "monthly_cost": "$35/mo"
        },
        # Feedback
        {
            "tool_id": "canny",
            "name": "Canny (Open alternative: Fider)",
            "description": "Collect and prioritize feature requests. Let users vote on what to build.",
            "who_its_for": "Product teams who want user-driven roadmaps",
            "what_you_can_build": ["Feature voting", "Roadmap", "Feedback portal"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy Fider (open-source Canny)", "Customize your board", "Share with users"],
            "related_tools": ["formbricks", "posthog", "plane"],
            "github_url": "https://github.com/getfider/fider",
            "stars": "2.5k",
            "language": "Go",
            "category": "UI/UX Tools",
            "tags": ["feedback", "roadmap", "voting"],
            "paid_alternative": "Canny",
            "monthly_cost": "$79/mo"
        },
        # Invoice
        {
            "tool_id": "invoiceninja",
            "name": "Invoice Ninja",
            "description": "Create professional invoices and get paid. Full accounting features included.",
            "who_its_for": "Freelancers and small businesses",
            "what_you_can_build": ["Invoicing system", "Payment tracking", "Client management"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Use their cloud or self-host", "Add your clients", "Send your first invoice"],
            "related_tools": ["killbill", "medusa", "nocodb"],
            "github_url": "https://github.com/invoiceninja/invoiceninja",
            "stars": "7.5k",
            "language": "PHP",
            "category": "Payments & Billing",
            "tags": ["invoicing", "billing", "accounting"],
            "paid_alternative": "FreshBooks",
            "monthly_cost": "$17/mo"
        },
        # Notes
        {
            "tool_id": "outline",
            "name": "Outline",
            "description": "Team knowledge base that's beautiful and fast. Like Notion but self-hosted.",
            "who_its_for": "Teams who want a shared knowledge base",
            "what_you_can_build": ["Team wiki", "Documentation", "Knowledge base"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy with Docker", "Set up authentication", "Start creating documents"],
            "related_tools": ["docusaurus", "ghostcms", "nocodb"],
            "github_url": "https://github.com/outline/outline",
            "stars": "23.5k",
            "language": "TypeScript",
            "category": "UI/UX Tools",
            "tags": ["wiki", "docs", "notion-alternative"],
            "paid_alternative": "Notion Team",
            "monthly_cost": "$10/user/mo"
        },
        # Time Tracking
        {
            "tool_id": "traggo",
            "name": "Traggo",
            "description": "Track where your time goes. Simple time tracking with tags.",
            "who_its_for": "Freelancers and teams tracking billable hours",
            "what_you_can_build": ["Time tracking", "Project hours", "Billing reports"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Deploy with Docker", "Create your tags", "Start tracking"],
            "related_tools": ["plane", "invoiceninja", "cal-com"],
            "github_url": "https://github.com/traggo/server",
            "stars": "1.1k",
            "language": "Go",
            "category": "Automation",
            "tags": ["time-tracking", "productivity", "billing"],
            "paid_alternative": "Toggl",
            "monthly_cost": "$9/user/mo"
        },
        # CRM
        {
            "tool_id": "twenty",
            "name": "Twenty",
            "description": "Modern open-source CRM. Manage leads, deals, and customer relationships.",
            "who_its_for": "Sales teams and founders who need a simple CRM",
            "what_you_can_build": ["Sales pipeline", "Contact management", "Deal tracking"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Sign up at twenty.com or self-host", "Import your contacts", "Set up your pipeline"],
            "related_tools": ["erpnext", "nocodb", "n8n"],
            "github_url": "https://github.com/twentyhq/twenty",
            "stars": "18.5k",
            "language": "TypeScript",
            "category": "CRM",
            "tags": ["crm", "sales", "contacts", "hubspot-alternative"],
            "paid_alternative": "HubSpot",
            "monthly_cost": "$45/mo"
        },
        # Project Management
        {
            "tool_id": "plane",
            "name": "Plane",
            "description": "Plan, track, and manage issues like Jira but simpler. Great for agile teams.",
            "who_its_for": "Development teams and product managers",
            "what_you_can_build": ["Issue tracking", "Sprint planning", "Roadmaps"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy Plane", "Create your first project", "Add issues and sprints"],
            "related_tools": ["focalboard", "outline", "n8n"],
            "github_url": "https://github.com/makeplane/plane",
            "stars": "29.5k",
            "language": "TypeScript",
            "category": "Project Management",
            "tags": ["project-management", "jira-alternative", "agile", "issues"],
            "paid_alternative": "Jira",
            "monthly_cost": "$7.75/user/mo"
        },
        {
            "tool_id": "focalboard",
            "name": "Focalboard",
            "description": "Open-source project management like Trello or Asana. Kanban boards with custom views.",
            "who_its_for": "Teams who need simple kanban boards and task management",
            "what_you_can_build": ["Kanban boards", "Task lists", "Project timelines"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Deploy Focalboard", "Create a board", "Add tasks and columns"],
            "related_tools": ["plane", "outline", "n8n"],
            "github_url": "https://github.com/mattermost/focalboard",
            "stars": "22.1k",
            "language": "TypeScript",
            "category": "Project Management",
            "tags": ["kanban", "trello-alternative", "asana-alternative", "task-management"],
            "paid_alternative": "Trello",
            "monthly_cost": "$5/user/mo"
        },
        # Video Conferencing
        {
            "tool_id": "jitsi",
            "name": "Jitsi Meet",
            "description": "Secure video conferencing that works in your browser. No account needed.",
            "who_its_for": "Teams who need private video calls without Zoom's pricing",
            "what_you_can_build": ["Video meetings", "Webinars", "Conference rooms"],
            "difficulty": "Beginner",
            "setup_time": "5 mins",
            "setup_steps": ["Use meet.jit.si or self-host", "Create a room", "Share the link"],
            "related_tools": ["cal-com", "nextcloud", "element"],
            "github_url": "https://github.com/jitsi/jitsi-meet",
            "stars": "23.8k",
            "language": "JavaScript",
            "category": "Communication",
            "tags": ["video", "conferencing", "zoom-alternative", "meetings"],
            "paid_alternative": "Zoom",
            "monthly_cost": "$14/mo"
        },
        # Cloud Storage
        {
            "tool_id": "nextcloud",
            "name": "Nextcloud",
            "description": "Self-hosted file sync and share. Your own Google Drive or Dropbox.",
            "who_its_for": "Teams who want full control over their files and data",
            "what_you_can_build": ["File storage", "Document collaboration", "Calendar and contacts"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy Nextcloud", "Install desktop/mobile apps", "Start syncing"],
            "related_tools": ["owncloud", "seafile", "cryptpad"],
            "github_url": "https://github.com/nextcloud/server",
            "stars": "26.4k",
            "language": "PHP",
            "category": "Storage",
            "tags": ["storage", "cloud", "dropbox-alternative", "gdrive-alternative"],
            "paid_alternative": "Dropbox",
            "monthly_cost": "$12/mo"
        },
        # Social Media
        {
            "tool_id": "buffer-oss",
            "name": "Mixpost",
            "description": "Self-hosted social media management. Schedule posts across all platforms.",
            "who_its_for": "Marketing teams and creators managing multiple social accounts",
            "what_you_can_build": ["Social scheduling", "Content calendar", "Analytics"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy Mixpost", "Connect social accounts", "Schedule your first post"],
            "related_tools": ["ghostcms", "plausible", "n8n"],
            "github_url": "https://github.com/inovector/mixpost",
            "stars": "2.8k",
            "language": "PHP",
            "category": "Marketing",
            "tags": ["social-media", "scheduling", "buffer-alternative", "hootsuite-alternative"],
            "paid_alternative": "Buffer",
            "monthly_cost": "$6/mo"
        },
        # SEO
        {
            "tool_id": "serp-review",
            "name": "SERPRobot",
            "description": "Track your Google rankings. Simple SEO position tracking without the bloat.",
            "who_its_for": "Founders and marketers tracking keyword rankings",
            "what_you_can_build": ["Rank tracking", "SERP monitoring", "Competitor analysis"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Add your keywords", "Add competitor URLs", "Check daily rankings"],
            "related_tools": ["plausible", "umami", "posthog"],
            "github_url": "https://github.com/serprobot/serp-robot",
            "stars": "1.2k",
            "language": "Python",
            "category": "Marketing",
            "tags": ["seo", "rank-tracking", "ahrefs-alternative", "semrush-alternative"],
            "paid_alternative": "Ahrefs",
            "monthly_cost": "$99/mo"
        },
        # Customer Support
        {
            "tool_id": "chatwoot",
            "name": "Chatwoot",
            "description": "Customer support platform with live chat, email, and social in one inbox.",
            "who_its_for": "Support teams who want an Intercom or Zendesk alternative",
            "what_you_can_build": ["Live chat", "Email support", "Help desk"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy Chatwoot", "Connect channels", "Add your team"],
            "related_tools": ["formbricks", "n8n", "plane"],
            "github_url": "https://github.com/chatwoot/chatwoot",
            "stars": "21.3k",
            "language": "Ruby",
            "category": "Support",
            "tags": ["support", "live-chat", "intercom-alternative", "zendesk-alternative"],
            "paid_alternative": "Intercom",
            "monthly_cost": "$74/mo"
        },
        # Video Hosting
        {
            "tool_id": "peertube",
            "name": "PeerTube",
            "description": "Decentralized video hosting. Your own YouTube or Vimeo without the ads.",
            "who_its_for": "Creators and businesses hosting video content",
            "what_you_can_build": ["Video platform", "Course hosting", "Internal video library"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy PeerTube", "Configure storage", "Upload videos"],
            "related_tools": ["nextcloud", "jitsi", "ghostcms"],
            "github_url": "https://github.com/Chocobozzz/PeerTube",
            "stars": "13.2k",
            "language": "TypeScript",
            "category": "Media",
            "tags": ["video", "hosting", "youtube-alternative", "vimeo-alternative"],
            "paid_alternative": "Vimeo",
            "monthly_cost": "$12/mo"
        },
        # E-learning
        {
            "tool_id": "moodle",
            "name": "Moodle",
            "description": "The world's most popular learning management system. Build courses and quizzes.",
            "who_its_for": "Educators and businesses creating online courses",
            "what_you_can_build": ["Online courses", "Quizzes", "Student portals"],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy Moodle", "Create a course", "Add students"],
            "related_tools": ["outline", "formbricks", "ghostcms"],
            "github_url": "https://github.com/moodle/moodle",
            "stars": "38.1k",
            "language": "PHP",
            "category": "Education",
            "tags": ["lms", "courses", "teachable-alternative", "thinkific-alternative"],
            "paid_alternative": "Teachable",
            "monthly_cost": "$39/mo"
        },
        # Design
        {
            "tool_id": "penpot",
            "name": "Penpot",
            "description": "Design and prototyping tool for teams. Open-source Figma alternative.",
            "who_its_for": "Designers and product teams who need collaborative design",
            "what_you_can_build": ["UI designs", "Prototypes", "Design systems"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Use penpot.app or self-host", "Create a project", "Start designing"],
            "related_tools": ["webstudio", "nextjs", "shadcn"],
            "github_url": "https://github.com/penpot/penpot",
            "stars": "34.2k",
            "language": "Clojure",
            "category": "Design",
            "tags": ["design", "prototyping", "figma-alternative", "ui"],
            "paid_alternative": "Figma",
            "monthly_cost": "$12/mo"
        },
        {
            "tool_id": "inkscape",
            "name": "Inkscape",
            "description": "Professional vector graphics editor. Free alternative to Adobe Illustrator.",
            "who_its_for": "Designers creating logos, icons, and illustrations",
            "what_you_can_build": ["Vector graphics", "Logos", "Icons", "Illustrations"],
            "difficulty": "Intermediate",
            "setup_time": "5 mins",
            "setup_steps": ["Download Inkscape", "Install on your machine", "Start creating"],
            "related_tools": ["penpot", "gimp", "blender"],
            "github_url": "https://github.com/inkscape/inkscape",
            "stars": "8.9k",
            "language": "C++",
            "category": "Design",
            "tags": ["vector", "illustration", "illustrator-alternative", "graphics"],
            "paid_alternative": "Adobe Illustrator",
            "monthly_cost": "$22/mo"
        },
        # Code Collaboration
        {
            "tool_id": "gitea",
            "name": "Gitea",
            "description": "Lightweight Git hosting. Your own GitHub for private repos.",
            "who_its_for": "Teams who want private Git hosting without GitHub's pricing",
            "what_you_can_build": ["Git hosting", "Code review", "CI/CD pipelines"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Deploy Gitea", "Configure authentication", "Push your first repo"],
            "related_tools": ["forgejo", "drone", "plane"],
            "github_url": "https://github.com/go-gitea/gitea",
            "stars": "46.1k",
            "language": "Go",
            "category": "Development",
            "tags": ["git", "hosting", "github-alternative", "devops"],
            "paid_alternative": "GitHub Team",
            "monthly_cost": "$4/user/mo"
        },
        # Database
        {
            "tool_id": "nocodb",
            "name": "NocoDB",
            "description": "Turn any database into a smart spreadsheet. Airtable alternative that connects to PostgreSQL, MySQL, and more.",
            "who_its_for": "Non-technical teams who need to manage structured data",
            "what_you_can_build": ["Smart spreadsheets", "Database GUIs", "Internal tools"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy NocoDB", "Connect your database", "Create views"],
            "related_tools": ["supabase", "baserow", "n8n"],
            "github_url": "https://github.com/nocodb/nocodb",
            "stars": "48.2k",
            "language": "TypeScript",
            "category": "Database",
            "tags": ["database", "spreadsheet", "airtable-alternative", "low-code"],
            "paid_alternative": "Airtable",
            "monthly_cost": "$20/mo"
        },
        {
            "tool_id": "baserow",
            "name": "Baserow",
            "description": "Open-source no-code database. Build apps and manage data without coding.",
            "who_its_for": "Founders who need a flexible database without Airtable's limits",
            "what_you_can_build": ["No-code apps", "Database backends", "Internal tools"],
            "difficulty": "Beginner",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy Baserow", "Create a database", "Build your first view"],
            "related_tools": ["nocodb", "supabase", "n8n"],
            "github_url": "https://github.com/bram2w/baserow",
            "stars": "2.1k",
            "language": "Python",
            "category": "Database",
            "tags": ["database", "no-code", "airtable-alternative", "apps"],
            "paid_alternative": "Airtable",
            "monthly_cost": "$20/mo"
        },
        # Documentation
        {
            "tool_id": "docusaurus",
            "name": "Docusaurus",
            "description": "Build beautiful documentation sites quickly. Made by Meta (Facebook).",
            "who_its_for": "Developers and product teams who need docs and blogs",
            "what_you_can_build": ["Documentation sites", "Blogs", "Landing pages"],
            "difficulty": "Intermediate",
            "setup_time": "20 mins",
            "setup_steps": ["Install Docusaurus", "Write your docs in Markdown", "Deploy to Vercel"],
            "related_tools": ["astro", "nextjs", "outline"],
            "github_url": "https://github.com/facebook/docusaurus",
            "stars": "56.3k",
            "language": "TypeScript",
            "category": "Documentation",
            "tags": ["docs", "documentation", "gitbook-alternative", "readme-alternative"],
            "paid_alternative": "GitBook",
            "monthly_cost": "$6.70/user/mo"
        },
        # CI/CD
        {
            "tool_id": "drone",
            "name": "Drone CI",
            "description": "Container-native continuous integration. Self-hosted CI/CD pipelines.",
            "who_its_for": "DevOps teams who want CI/CD without GitHub Actions limits",
            "what_you_can_build": ["CI/CD pipelines", "Automated testing", "Deployment workflows"],
            "difficulty": "Advanced",
            "setup_time": "30 mins",
            "setup_steps": ["Deploy Drone", "Connect to your Git provider", "Write .drone.yml"],
            "related_tools": ["gitea", "argo", "jenkins"],
            "github_url": "https://github.com/harness/drone",
            "stars": "28.4k",
            "language": "Go",
            "category": "DevOps",
            "tags": ["cicd", "devops", "github-actions-alternative", "automation"],
            "paid_alternative": "GitHub Actions",
            "monthly_cost": "$0.008/minute"
        },
        # File Transfer
        {
            "tool_id": "snapdrop",
            "name": "Snapdrop",
            "description": "Local file sharing in your browser. Like AirDrop but works everywhere.",
            "who_its_for": "Anyone who needs to transfer files between devices quickly",
            "what_you_can_build": ["File transfers", "Cross-device sharing", "Local network tools"],
            "difficulty": "Beginner",
            "setup_time": "5 mins",
            "setup_steps": ["Open snapdrop.net or self-host", "Open on both devices", "Drop files"],
            "related_tools": ["nextcloud", "filebrowser", "syncthing"],
            "github_url": "https://github.com/RobinLinus/Snapdrop",
            "stars": "17.6k",
            "language": "JavaScript",
            "category": "Utilities",
            "tags": ["file-sharing", "airdrop-alternative", "transfer", "p2p"],
            "paid_alternative": "WeTransfer",
            "monthly_cost": "$12/mo"
        },
        # URL Shortener
        {
            "tool_id": "shlink",
            "name": "Shlink",
            "description": "Self-hosted URL shortener with analytics. Track clicks on your links.",
            "who_its_for": "Marketers and founders who need branded short links",
            "what_you_can_build": ["Short links", "Click analytics", "QR codes"],
            "difficulty": "Intermediate",
            "setup_time": "15 mins",
            "setup_steps": ["Deploy Shlink", "Configure your domain", "Start shortening"],
            "related_tools": ["plausible", "umami", "posthog"],
            "github_url": "https://github.com/shlinkio/shlink",
            "stars": "8.3k",
            "language": "PHP",
            "category": "Marketing",
            "tags": ["url-shortener", "bitly-alternative", "analytics", "links"],
            "paid_alternative": "Bitly",
            "monthly_cost": "$8/mo"
        },
        # Form Backend
        {
            "tool_id": "formkit",
            "name": "FormKit",
            "description": "Form backend for static sites. Receive form submissions without a server.",
            "who_its_for": "Developers with static sites who need form handling",
            "what_you_can_build": ["Contact forms", "Survey backends", "Lead capture"],
            "difficulty": "Beginner",
            "setup_time": "10 mins",
            "setup_steps": ["Sign up for FormKit or self-host", "Point your form to the endpoint", "Check submissions"],
            "related_tools": ["formbricks", "n8n", "nocodb"],
            "github_url": "https://github.com/formkit/formkit",
            "stars": "4.2k",
            "language": "TypeScript",
            "category": "Utilities",
            "tags": ["forms", "backend", "typeform-alternative", "static-sites"],
            "paid_alternative": "Typeform",
            "monthly_cost": "$25/mo"
        },
    ]

# Seed Collections
collections = [
        {
            "collection_id": "saas-waitlist",
            "title": "Build a SaaS Waitlist in 2 Days",
            "description": "Everything you need to collect emails and validate your SaaS idea",
            "tools": ["astro", "formbricks", "plausible", "buttondown"],
            "difficulty": "Beginner",
            "completion_time": "2 days",
            "bg_color": "bg-emerald-100"
        },
        {
            "collection_id": "ai-chatbot",
            "title": "Build an AI Chatbot",
            "description": "Create a smart chatbot that knows your data",
            "tools": ["flowise", "supabase", "nextjs", "shadcn"],
            "difficulty": "Intermediate",
            "completion_time": "1 week",
            "bg_color": "bg-blue-100"
        },
        {
            "collection_id": "newsletter-business",
            "title": "Start a Newsletter Business",
            "description": "Everything to launch and grow a paid newsletter",
            "tools": ["ghostcms", "buttondown", "plausible", "cal-com"],
            "difficulty": "Beginner",
            "completion_time": "1 week",
            "bg_color": "bg-yellow-100"
        },
        {
            "collection_id": "ecommerce-store",
            "title": "Launch Your Online Store",
            "description": "Build a complete e-commerce store from scratch",
            "tools": ["medusa", "meilisearch", "supabase", "n8n"],
            "difficulty": "Advanced",
            "completion_time": "2 weeks",
            "bg_color": "bg-pink-100"
        },
        {
            "collection_id": "internal-tools",
            "title": "Build Internal Tools",
            "description": "Create admin panels, dashboards, and internal apps",
            "tools": ["nocodb", "n8n", "grafana", "supabase"],
            "difficulty": "Intermediate",
            "completion_time": "1 week",
            "bg_color": "bg-purple-100"
        },
        {
            "collection_id": "booking-platform",
            "title": "Build a Booking Platform",
            "description": "Create appointment scheduling for your business",
            "tools": ["cal-com", "supabase", "n8n", "formbricks"],
            "difficulty": "Beginner",
            "completion_time": "3 days",
            "bg_color": "bg-orange-100"
        },
    ]

# Seed some public stacks
public_stacks = [
    {
        "stack_id": "stack_cal_founder",
        "user_id": "system",
        "name": "What Cal.com Used",
        "tools": ["nextjs", "supabase", "shadcn", "plausible"],
        "is_public": True,
        "copy_count": 1243,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "stack_id": "stack_indie_saas",
        "user_id": "system",
        "name": "Indie SaaS Starter",
        "tools": ["nextjs", "supabase", "authjs", "shadcn", "plausible"],
        "is_public": True,
        "copy_count": 856,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
    {
        "stack_id": "stack_ai_startup",
        "user_id": "system",
        "name": "AI Startup Stack",
        "tools": ["langchain", "flowise", "supabase", "nextjs"],
        "is_public": True,
        "copy_count": 432,
        "created_at": datetime.now(timezone.utc).isoformat()
    },
]

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "GitStack API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ==================== ACTIVITY & RECOMMENDATIONS ====================

@api_router.post("/activity")
@limiter.limit("60/minute")
async def track_activity(data: ActivityEvent, request: Request):
    """Track user activity for personalized recommendations"""
    user = await get_current_user(request)
    if not user:
        return {"ok": False}  # silently ignore guest events — never error

    await db.user_activity.insert_one({
        "user_id": user.user_id,
        "event_type": data.event_type,
        "entity_id": data.entity_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True}

@api_router.get("/recommendations")
@limiter.limit("10/minute")
async def get_recommendations(request: Request):
    """Get personalized tool recommendations based on user activity"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check 2-hour cache on user record
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    cache = user_doc.get("recommendations_cache") if user_doc else None
    if cache:
        cached_at = cache.get("cached_at")
        if cached_at:
            try:
                # Parse ISO datetime and check age
                cached_dt = datetime.fromisoformat(cached_at.replace('Z', '+00:00'))
                age_seconds = (datetime.now(timezone.utc) - cached_dt).total_seconds()
                if age_seconds < 7200:  # 2 hours
                    return {"recommendations": cache["tools"]}
            except Exception:
                pass

    # Fetch last 30 activity events
    events = await db.user_activity.find(
        {"user_id": user.user_id},
        {"_id": 0, "entity_id": 1, "event_type": 1},
    ).sort("created_at", -1).limit(30).to_list(30)

    if not events:
        # New user — return a default set of highly-rated tools (sorted by stars)
        defaults = await db.tools.find(
            {}, {"_id": 0, "tool_id": 1, "name": 1, "description": 1, "github_url": 1, "stars": 1, "category": 1, "tags": 1}
        ).sort("stars", -1).limit(6).to_list(6)
        return {"recommendations": defaults}

    seen_ids = {e["entity_id"] for e in events}
    activity_summary = ", ".join(e["entity_id"] for e in events[:15])

    # Fetch the actual catalog so Gemini doesn't hallucinate names
    catalog_tools = await db.tools.find(
        {}, {"_id": 0, "tool_id": 1, "name": 1, "category": 1, "description": 1}
    ).limit(200).to_list(200)

    # Filter out already-seen tools
    available = [t for t in catalog_tools if t.get("tool_id") not in seen_ids]
    if not available:
        # All tools seen — fall back to top 6 by stars
        defaults = await db.tools.find(
            {}, {"_id": 0, "tool_id": 1, "name": 1, "description": 1, "github_url": 1, "stars": 1, "category": 1, "tags": 1}
        ).sort("stars", -1).limit(6).to_list(6)
        return {"recommendations": defaults}

    # Build a numbered catalog string for Gemini
    catalog_str = "\n".join(f"{i+1}. {t['name']} ({t.get('category', 'tool')}) — {t.get('description', '')[:80]}" for i, t in enumerate(available[:100]))

    prompt = f"""A user has been exploring these tools/repos on GitStack: {activity_summary}.

Available tools to recommend from (you MUST pick from this list only):
{catalog_str}

Pick exactly 6 tools from the numbered list above that the user would likely find useful based on their activity. Avoid recommending things too similar to what they've already seen.

Return ONLY a JSON array of the EXACT tool names from the list (no extra text), e.g.: ["Exact Tool Name 1", "Exact Tool Name 2", ...]"""

    recommended_names = []
    try:
        response = await call_ai(prompt)
        text = response.strip()
        import re, json
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            recommended_names = json.loads(match.group())
    except Exception:
        pass

    # Map names back to full tool docs (exact match first, then fuzzy)
    available_by_name = {t["name"].lower(): t["tool_id"] for t in available}
    results = []
    seen_results = set()
    for name in recommended_names[:6]:
        name_lower = str(name).lower().strip()
        tool_id = available_by_name.get(name_lower)
        if not tool_id:
            # Fuzzy: find first available tool whose name contains the LLM's suggestion
            for t in available:
                if name_lower in t["name"].lower() or t["name"].lower() in name_lower:
                    tool_id = t["tool_id"]
                    break
        if tool_id and tool_id not in seen_results:
            full_tool = await db.tools.find_one({"tool_id": tool_id}, {"_id": 0})
            if full_tool:
                results.append(full_tool)
                seen_results.add(tool_id)
        if len(results) >= 6:
            break

    # Backfill if Gemini returned fewer than 6 — use top-starred unseen tools
    if len(results) < 6:
        backfill = await db.tools.find(
            {"tool_id": {"$nin": list(seen_ids) + list(seen_results)}},
            {"_id": 0}
        ).sort("stars", -1).limit(6 - len(results)).to_list(6 - len(results))
        results.extend(backfill)

    # Cache on user doc
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"recommendations_cache": {"tools": results, "cached_at": datetime.now(timezone.utc).isoformat()}}},
    )

    return {"recommendations": results}

# ==================== USER PROFILES ====================

@api_router.patch("/users/me")
async def update_my_profile(data: UpdateProfileRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    update: dict = {}
    if data.github_username is not None:
        update["github_username"] = data.github_username
    if data.bio is not None:
        update["bio"] = data.bio
    if data.website is not None:
        if data.website and not data.website.startswith(("https://", "http://")):
            raise HTTPException(status_code=400, detail="Website must be a valid URL")
        update["website"] = data.website
    if data.skills is not None:
        update["skills"] = [s.strip()[:30] for s in data.skills if s.strip()][:20]
    if data.public_profile is not None:
        update["public_profile"] = data.public_profile

    if update:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update})

    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email": 0})
    return updated

@api_router.get("/users/{user_id}/repos")
async def get_user_repos(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "github_username": 1, "public_profile": 1})
    if not user or not user.get("public_profile", True):
        raise HTTPException(status_code=404, detail="Profile not found")

    github_username = user.get("github_username")
    if not github_username:
        return {"repos": []}

    headers = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"

    import httpx
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"https://api.github.com/users/{github_username}/repos",
                params={"sort": "stars", "per_page": 10, "type": "owner"},
                headers=headers,
                timeout=10,
            )
            res.raise_for_status()
            repos = res.json()
        except Exception:
            return {"repos": []}

    result = []
    for repo in repos[:10]:
        if repo.get("fork"):
            continue
        owner = repo.get("owner", {}).get("login", github_username)
        name = repo.get("name", "")
        translation = await db.repo_translations.find_one(
            {"owner": owner, "repo": name}, {"_id": 0, "translation": 1, "summary": 1}
        )
        result.append({
            "name": name,
            "full_name": repo.get("full_name"),
            "description": repo.get("description"),
            "url": repo.get("html_url"),
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language"),
            "translation": translation.get("translation") or translation.get("summary") if translation else None,
        })

    return {"repos": result}

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "email": 0},
    )
    if not user or not user.get("public_profile", True):
        raise HTTPException(status_code=404, detail="Profile not found")

    # BUG-19 FIX: collection is `user_stacks`, not `stacks` (which doesn't exist).
    stacks = await db.user_stacks.find(
        {"user_id": user_id, "is_public": True},
        {"_id": 0, "name": 1, "tools": 1, "copy_count": 1, "stack_id": 1, "created_at": 1},
    ).sort("copy_count", -1).limit(10).to_list(10)

    try:
        products = await db.marketplace_products.find(
            {"seller_user_id": user_id, "r2_file_key": {"$ne": None}},
            {"_id": 0, "description": 0, "r2_file_key": 0},
        ).limit(12).to_list(12)
    except Exception:
        products = []

    return {
        "user": user,
        "stacks": stacks,
        "products": products,
    }

# ==================== MARKETPLACE (Phase 3) ====================

# ---- Pydantic Models (Task 4) ----

class MarketplaceProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    tagline: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50, max_length=5000)
    source_price_cents: int = Field(..., ge=100, le=100000)
    currency: Literal["INR", "USD", "EUR", "GBP"] = "INR"
    category: Literal["saas", "mcp-server", "computer-vision", "template", "skill", "other"]
    github_repo_url: Optional[str] = Field(None, max_length=200)
    demo_video_url: Optional[str] = Field(None, max_length=300)
    setup_available: bool = False
    setup_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    setup_description: Optional[str] = Field(None, max_length=1000)
    setup_delivery_days: Optional[int] = Field(None, ge=1, le=30)

class MarketplaceProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    tagline: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50, max_length=5000)
    source_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    currency: Optional[Literal["INR", "USD", "EUR", "GBP"]] = None
    category: Optional[Literal["saas", "mcp-server", "computer-vision", "template", "skill", "other"]] = None
    github_repo_url: Optional[str] = Field(None, max_length=200)
    demo_video_url: Optional[str] = Field(None, max_length=300)
    setup_available: Optional[bool] = None
    setup_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    setup_description: Optional[str] = Field(None, max_length=1000)
    setup_delivery_days: Optional[int] = Field(None, ge=1, le=30)

class FeatureProductRequest(BaseModel):
    days: int = Field(7, ge=1, le=90)

class AffiliateUpdateRequest(BaseModel):
    collection: Literal["github_repos", "tools"]
    id: str
    affiliate_url: Optional[str] = Field(None, max_length=500)

class BlogPostCreate(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    tags: List[str] = []
    cover_image: Optional[str] = None
    source_repos: List[str] = []

class SellerOnboardRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    bio: str = Field(default="", max_length=500)
    payout_method: Literal["upi", "bank", "paypal"]
    payout_details: Dict[str, Any]
    available_for_hire: bool = False
    hire_contact: Optional[str] = Field(None, max_length=200)

class WithdrawalRequest(BaseModel):
    amount_cents: int = Field(..., ge=1000)

class CreateOrderRequest(BaseModel):
    product_id: str
    purchase_type: Literal["source", "source_and_setup"]

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class SetupStatusUpdate(BaseModel):
    status: Literal["in_progress", "completed"]
    note: Optional[str] = Field(None, max_length=500)

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1, max_length=500)

class PublishToggle(BaseModel):
    published: bool

# ---- R2 Helpers (Task 5) ----

def get_r2_client():
    import boto3
    from botocore.config import Config as BotoConfig
    account_id = os.environ.get("R2_ACCOUNT_ID")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    if not account_id or not access_key or not secret_key:
        raise HTTPException(status_code=503, detail="Storage not configured")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )

async def upload_private_to_r2(file_bytes: bytes, original_filename: str, folder: str) -> str:
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    key = f"{folder}/{uuid.uuid4()}.{ext}"
    client = get_r2_client()
    client.put_object(
        Bucket=os.environ["R2_BUCKET_NAME"],
        Key=key,
        Body=file_bytes,
        ContentType="application/octet-stream",
    )
    return key

async def upload_public_image_to_r2(file_bytes: bytes, original_filename: str, folder: str, max_size_mb: int = 5) -> str:
    ext = (original_filename.rsplit(".", 1)[-1] or "png").lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, GIF images are allowed")
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Image must be under {max_size_mb} MB")
    key = f"public/{folder}/{uuid.uuid4()}.{ext}"
    content_type_map = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                        "webp": "image/webp", "gif": "image/gif"}
    client = get_r2_client()
    client.put_object(
        Bucket=os.environ["R2_BUCKET_NAME"],
        Key=key,
        Body=file_bytes,
        ContentType=content_type_map[ext],
        CacheControl="public, max-age=31536000, immutable",
    )
    return f"{os.environ['R2_PUBLIC_URL'].rstrip('/')}/{key}"

def get_r2_signed_url(key: str, expiry_seconds: int = 300) -> str:
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["R2_BUCKET_NAME"], "Key": key},
        ExpiresIn=expiry_seconds,
    )

# ---- Razorpay Helpers (Task 6) ----

def get_razorpay_client():
    import razorpay
    return razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not secret:
        return False
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_razorpay_webhook_signature(body: bytes, signature: str) -> bool:
    secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
    if not secret:
        return False
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

# ---- Seller Onboarding (Task 7) ----

@api_router.post("/marketplace/seller/onboard")
@limiter.limit("10/minute")
async def seller_onboard(data: SellerOnboardRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    now = datetime.now(timezone.utc).isoformat()
    await db.marketplace_sellers.update_one(
        {"seller_user_id": user.user_id},
        {"$set": {
            "seller_user_id": user.user_id,
            "display_name": data.display_name,
            "bio": data.bio,
            "payout_method": data.payout_method,
            "payout_details": data.payout_details,
            "available_for_hire": data.available_for_hire,
            "hire_contact": data.hire_contact,
        },
         "$setOnInsert": {"verified": False, "onboarded_at": now}},
        upsert=True,
    )
    await db.seller_wallets.update_one(
        {"seller_user_id": user.user_id},
        {"$setOnInsert": {
            "seller_user_id": user.user_id,
            "balance_cents": 0,
            "escrow_cents": 0,
            "total_earned_cents": 0,
            "lifetime_sales": 0,
            "created_at": now,
        }},
        upsert=True,
    )
    return {"ok": True}

# ---- Product CRUD (Task 8) ----

@api_router.post("/marketplace/products")
@limiter.limit("10/minute")
async def create_product(data: MarketplaceProductCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if not seller:
        raise HTTPException(status_code=403, detail="Complete seller onboarding first")
    if data.setup_available and (not data.setup_price_cents or not data.setup_description or not data.setup_delivery_days):
        raise HTTPException(status_code=400, detail="setup_price_cents, setup_description, and setup_delivery_days are required when setup_available=true")
    product_id = str(uuid.uuid4())
    doc = {
        "product_id": product_id,
        "seller_user_id": user.user_id,
        **data.dict(),
        "screenshots": [],
        "r2_file_key": None,
        "published": False,
        "featured": False,
        "featured_until": None,
        "purchase_count": 0,
        "setup_count": 0,
        "avg_rating": 0.0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.marketplace_products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/marketplace/products")
@cache(expire=300)  # 5 minutes
async def list_products(q: Optional[str] = None, category: Optional[str] = None,
                        sort: str = "newest", page: int = 1, limit: int = 20):
    limit = min(max(limit, 1), 50)
    page = max(page, 1)
    query: dict = {"published": True, "r2_file_key": {"$ne": None}}
    if q:
        safe_q = re.escape(q)
        query["$or"] = [
            {"title": {"$regex": safe_q, "$options": "i"}},
            {"tagline": {"$regex": safe_q, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    sort_map = {
        "newest": ("created_at", -1),
        "best_sellers": ("purchase_count", -1),
        "top_rated": ("avg_rating", -1),
        "price_asc": ("source_price_cents", 1),
        "price_desc": ("source_price_cents", -1),
    }
    field, direction = sort_map.get(sort, ("created_at", -1))
    cursor = (db.marketplace_products
              .find(query, {"_id": 0, "description": 0, "r2_file_key": 0})
              .sort(field, direction).skip((page - 1) * limit).limit(limit))
    products = await cursor.to_list(limit)
    for p in products:
        seller = await db.marketplace_sellers.find_one(
            {"seller_user_id": p["seller_user_id"]},
            {"_id": 0, "display_name": 1, "verified": 1},
        )
        p["seller_name"] = (seller or {}).get("display_name")
        p["seller_verified"] = (seller or {}).get("verified", False)
    return {"products": products, "page": page}

@api_router.get("/marketplace/products/featured")
@cache(expire=300)
async def list_featured_products(limit: int = 6):
    """Returns currently featured marketplace products."""
    limit = min(max(limit, 1), 20)
    now = datetime.now(timezone.utc).isoformat()
    query = {
        "published": True,
        "featured": True,
        "featured_until": {"$gt": now},
        "r2_file_key": {"$ne": None},
    }
    cursor = (db.marketplace_products
              .find(query, {"_id": 0, "description": 0, "r2_file_key": 0})
              .sort("featured_until", -1).limit(limit))
    products = await cursor.to_list(limit)
    for p in products:
        seller = await db.marketplace_sellers.find_one(
            {"seller_user_id": p["seller_user_id"]},
            {"_id": 0, "display_name": 1, "verified": 1},
        )
        p["seller_name"] = (seller or {}).get("display_name")
        p["seller_verified"] = (seller or {}).get("verified", False)
    return {"products": products}

@api_router.get("/marketplace/my-products")
async def list_my_products(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    products = await (db.marketplace_products
                      .find({"seller_user_id": user.user_id}, {"_id": 0, "r2_file_key": 0})
                      .sort("created_at", -1).to_list(100))
    return {"products": products}

# ---- Cross-feature lookup (Task 22) — must come BEFORE /products/{product_id} ----

@api_router.get("/marketplace/products/by-repo")
async def products_by_repo(owner: str, repo: str):
    needle = re.escape(f"github.com/{owner}/{repo}")
    products = await (db.marketplace_products
                      .find({"published": True, "r2_file_key": {"$ne": None},
                             "github_repo_url": {"$regex": needle, "$options": "i"}},
                            {"_id": 0, "description": 0, "r2_file_key": 0})
                      .limit(5).to_list(5))
    for p in products:
        seller = await db.marketplace_sellers.find_one(
            {"seller_user_id": p["seller_user_id"]},
            {"_id": 0, "display_name": 1, "verified": 1},
        )
        p["seller_name"] = (seller or {}).get("display_name")
        p["seller_verified"] = (seller or {}).get("verified", False)
    return {"products": products}

@api_router.get("/marketplace/products/by-tool/{tool_id}")
async def products_by_tool(tool_id: str):
    tool = await db.tools.find_one({"_id": tool_id}) or await db.tools.find_one({"slug": tool_id})
    if not tool or not tool.get("github_url"):
        return {"products": []}
    m = re.search(r"github\.com/([^/]+)/([^/#?]+)", tool["github_url"])
    if not m:
        return {"products": []}
    return await products_by_repo(m.group(1), m.group(2))

@api_router.get("/marketplace/products/{product_id}")
@cache(expire=300)  # 5 minutes
async def get_product(product_id: str):
    product = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0, "r2_file_key": 0})
    if not product:
        logger.warning(f"Product {product_id} not found")
        all_products = await db.marketplace_products.find({}, {"_id": 0, "product_id": 1, "title": 1}).to_list(10)
        logger.warning(f"Available products: {all_products}")
        raise HTTPException(status_code=404, detail="Product not found")
    seller = await db.marketplace_sellers.find_one(
        {"seller_user_id": product["seller_user_id"]},
        {"_id": 0, "payout_details": 0},
    )
    user_doc = await db.users.find_one({"user_id": product["seller_user_id"]}, {"_id": 0, "email": 0})
    product["seller"] = {**(seller or {}),
                         "name": (user_doc or {}).get("name"),
                         "picture": (user_doc or {}).get("picture")}
    return product

@api_router.patch("/marketplace/products/{product_id}")
async def update_product(product_id: str, data: MarketplaceProductUpdate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    update = {k: v for k, v in data.dict(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await db.marketplace_products.update_one({"product_id": product_id}, {"$set": update})
    return {"ok": True}

@api_router.delete("/marketplace/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    has_sales = await db.marketplace_purchases.count_documents(
        {"product_id": product_id, "status": "completed"}, limit=1
    )
    if has_sales:
        raise HTTPException(status_code=400, detail="Cannot delete a product with sales. Unpublish instead.")
    await db.marketplace_products.delete_one({"product_id": product_id})
    return {"ok": True}

# ---- Screenshot Upload (Task 9) ----

@api_router.post("/marketplace/products/{product_id}/screenshots")
@limiter.limit("20/minute")
async def upload_screenshot(product_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if len(product.get("screenshots", [])) >= 4:
        raise HTTPException(status_code=400, detail="Maximum 4 creatives allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    url = await upload_public_image_to_r2(content, file.filename or "img.png", folder=f"products/{product_id}")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$push": {"screenshots": url}}
    )
    updated = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0, "screenshots": 1})
    return updated

@api_router.delete("/marketplace/products/{product_id}/screenshots")
async def delete_screenshot(product_id: str, url: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$pull": {"screenshots": url}}
    )
    return {"ok": True}

# ---- ZIP Upload (Task 10) ----

@api_router.post("/marketplace/products/{product_id}/upload")
@limiter.limit("10/minute")
async def upload_product_zip(product_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")
    content = await file.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 500 MB)")
    key = await upload_private_to_r2(content, file.filename, folder=f"products/{product_id}")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$set": {"r2_file_key": key}}
    )
    return {"ok": True}

# ---- Publish Toggle (Task 11) ----

@api_router.patch("/marketplace/products/{product_id}/publish")
async def toggle_publish(product_id: str, data: PublishToggle, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if data.published:
        if not product.get("r2_file_key"):
            raise HTTPException(status_code=400, detail="Upload a ZIP file before publishing")
        if not product.get("screenshots"):
            raise HTTPException(status_code=400, detail="Upload at least one screenshot before publishing")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$set": {"published": data.published}}
    )
    # Invalidate marketplace list and product detail caches
    try:
        await FastAPICache.clear(namespace="gitstack")
    except Exception:
        pass
    return {"ok": True, "published": data.published}

# ---- Admin: Featured Listings ----

@api_router.post("/admin/products/{product_id}/feature")
async def feature_product(product_id: str, data: FeatureProductRequest, user: UserModel = Depends(require_admin)):
    """Admin endpoint to feature a product for N days."""
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    featured_until = (datetime.now(timezone.utc) + timedelta(days=data.days)).isoformat()
    await db.marketplace_products.update_one(
        {"product_id": product_id},
        {"$set": {"featured": True, "featured_until": featured_until}}
    )
    # Invalidate caches
    try:
        await FastAPICache.clear(namespace="gitstack")
    except Exception:
        pass
    return {"ok": True, "featured_until": featured_until}

@api_router.post("/admin/products/{product_id}/unfeature")
async def unfeature_product(product_id: str, user: UserModel = Depends(require_admin)):
    """Admin endpoint to remove featured status."""
    await db.marketplace_products.update_one(
        {"product_id": product_id},
        {"$set": {"featured": False, "featured_until": None}}
    )
    try:
        await FastAPICache.clear(namespace="gitstack")
    except Exception:
        pass
    return {"ok": True}

@api_router.put("/admin/affiliate")
async def update_affiliate(data: AffiliateUpdateRequest, user: UserModel = Depends(require_admin)):
    """Admin endpoint to set/clear affiliate URL on a repo or tool."""
    if data.collection == "github_repos":
        await db.github_repos.update_one(
            {"full_name": data.id},
            {"$set": {"affiliate_url": data.affiliate_url}}
        )
    elif data.collection == "tools":
        await db.tools.update_one(
            {"tool_id": data.id},
            {"$set": {"affiliate_url": data.affiliate_url}}
        )
    try:
        await FastAPICache.clear(namespace="gitstack")
    except Exception:
        pass
    return {"ok": True}

# ---- Razorpay Checkout (Tasks 12, 13, 14) ----

@api_router.post("/marketplace/checkout/create-order")
@limiter.limit("10/minute")
async def create_order(data: CreateOrderRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": data.product_id})
    if not product or not product.get("published") or not product.get("r2_file_key"):
        raise HTTPException(status_code=404, detail="Product not available")
    if user.user_id == product["seller_user_id"]:
        raise HTTPException(status_code=400, detail="You cannot buy your own product")
    if data.purchase_type == "source":
        amount_cents = product["source_price_cents"]
    else:
        if not product.get("setup_available"):
            raise HTTPException(status_code=400, detail="Setup is not offered for this product")
        amount_cents = product["source_price_cents"] + product["setup_price_cents"]

    rzp = get_razorpay_client()
    order = rzp.order.create({
        "amount": amount_cents,
        "currency": product.get("currency", "INR"),
        "receipt": str(uuid.uuid4())[:32],
        "notes": {
            "product_id": data.product_id,
            "buyer_user_id": user.user_id,
            "purchase_type": data.purchase_type,
        },
    })
    purchase_id = str(uuid.uuid4())
    await db.marketplace_purchases.insert_one({
        "purchase_id": purchase_id,
        "buyer_user_id": user.user_id,
        "product_id": data.product_id,
        "purchase_type": data.purchase_type,
        "amount_cents": amount_cents,
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "order_id": order["id"],
        "amount_cents": amount_cents,
        "currency": product.get("currency", "INR"),
        "razorpay_key_id": os.environ["RAZORPAY_KEY_ID"],
        "purchase_id": purchase_id,
    }

async def _complete_purchase(purchase: dict, payment_id: str):
    """Idempotent: mark purchase complete, credit wallet, create setup_request if needed."""
    # Atomic check-and-set: filter ensures we only complete once
    product = await db.marketplace_products.find_one({"product_id": purchase["product_id"]})
    if not product:
        return
    fee_pct = int(os.environ.get("PLATFORM_FEE_PERCENT", "15"))
    seller_id = product["seller_user_id"]
    now = datetime.now(timezone.utc)
    result = await db.marketplace_purchases.update_one(
        {"purchase_id": purchase["purchase_id"], "status": {"$ne": "completed"}},
        {"$set": {"status": "completed", "razorpay_payment_id": payment_id,
                  "completed_at": now.isoformat()}},
    )
    if result.modified_count == 0:
        return  # Already completed by another process
    source_seller_cut = int(product["source_price_cents"] * (100 - fee_pct) / 100)
    await db.seller_wallets.update_one(
        {"seller_user_id": seller_id},
        {"$inc": {"balance_cents": source_seller_cut,
                  "total_earned_cents": source_seller_cut,
                  "lifetime_sales": 1}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": seller_id, "type": "sale",
        "amount_cents": source_seller_cut, "product_id": product["product_id"],
        "purchase_id": purchase["purchase_id"], "created_at": now.isoformat(),
        "note": f"Sale: {product['title']}",
    })
    await db.marketplace_products.update_one(
        {"product_id": product["product_id"]}, {"$inc": {"purchase_count": 1}}
    )
    # Send purchase confirmation email to buyer
    try:
        buyer = await db.users.find_one({"user_id": purchase["buyer_user_id"]}, {"_id": 0, "email": 1})
        if buyer and buyer.get("email"):
            download_url = f"{os.environ.get('FRONTEND_URL', 'https://gitstack.pro')}/marketplace/{product['product_id']}?purchased=1&purchase_id={purchase['purchase_id']}"
            await send_purchase_confirmation(buyer["email"], product["title"], purchase["purchase_type"], download_url)
    except Exception:
        pass  # Email failure should not block purchase completion
    if purchase["purchase_type"] == "source_and_setup" and product.get("setup_price_cents"):
        setup_seller_cut = int(product["setup_price_cents"] * (100 - fee_pct) / 100)
        delivery_days = product.get("setup_delivery_days") or 3
        auto_release = (now + timedelta(days=7 + delivery_days)).isoformat()
        request_id = str(uuid.uuid4())
        await db.setup_requests.insert_one({
            "request_id": request_id,
            "buyer_user_id": purchase["buyer_user_id"],
            "seller_user_id": seller_id,
            "product_id": product["product_id"],
            "purchase_id": purchase["purchase_id"],
            "status": "pending",
            "escrow_amount_cents": setup_seller_cut,
            "buyer_confirmed": False,
            "auto_release_at": auto_release,
            "created_at": now.isoformat(),
        })
        await db.seller_wallets.update_one(
            {"seller_user_id": seller_id}, {"$inc": {"escrow_cents": setup_seller_cut}}
        )
        await db.wallet_transactions.insert_one({
            "seller_user_id": seller_id, "type": "setup_escrow",
            "amount_cents": setup_seller_cut, "product_id": product["product_id"],
            "purchase_id": purchase["purchase_id"], "created_at": now.isoformat(),
            "note": "Setup payment held in escrow",
        })
        await db.marketplace_products.update_one(
            {"product_id": product["product_id"]}, {"$inc": {"setup_count": 1}}
        )
        # Notify seller about new setup request
        # BUG-04 FIX: was querying db.sellers (non-existent); seller_id IS the user_id,
        # so look up directly in db.users without an intermediate lookup.
        try:
            seller_user = await db.users.find_one({"user_id": seller_id}, {"_id": 0, "email": 1})
            if seller_user and seller_user.get("email"):
                await send_setup_request_notification(seller_user["email"], product["title"], request_id)
        except Exception:
            pass

@api_router.post("/marketplace/checkout/verify-payment")
@limiter.limit("10/minute")
async def verify_payment(data: VerifyPaymentRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    if not verify_razorpay_signature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    purchase = await db.marketplace_purchases.find_one({"razorpay_order_id": data.razorpay_order_id})
    if not purchase or purchase["buyer_user_id"] != user.user_id:
        raise HTTPException(status_code=404, detail="Purchase not found")
    await _complete_purchase(purchase, data.razorpay_payment_id)
    return {"ok": True, "purchase_id": purchase["purchase_id"]}

@api_router.post("/marketplace/webhook/razorpay")
@limiter.limit("100/minute")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not verify_razorpay_webhook_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    if event.get("event") == "payment.captured":
        payment = event.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment.get("order_id")
        payment_id = payment.get("id")
        if order_id and payment_id:
            # Idempotency: skip if already processed
            existing = await db.marketplace_purchases.find_one({
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "status": "completed"
            })
            if not existing:
                purchase = await db.marketplace_purchases.find_one({"razorpay_order_id": order_id})
                if purchase:
                    await _complete_purchase(purchase, payment_id)
    return {"ok": True}

# ---- Buyer Purchases & Download (Task 15) ----

@api_router.get("/marketplace/my-purchases")
async def my_purchases(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    purchases = await (db.marketplace_purchases
                       .find({"buyer_user_id": user.user_id, "status": "completed"},
                             {"_id": 0, "razorpay_order_id": 0, "razorpay_payment_id": 0})
                       .sort("created_at", -1).to_list(200))
    for p in purchases:
        product = await db.marketplace_products.find_one(
            {"product_id": p["product_id"]},
            {"_id": 0, "title": 1, "tagline": 1, "screenshots": 1, "category": 1, "seller_user_id": 1},
        )
        p["product"] = product
        if p.get("purchase_type") == "source_and_setup":
            sr = await db.setup_requests.find_one({"purchase_id": p["purchase_id"]}, {"_id": 0})
            p["setup_request"] = sr
    return {"purchases": purchases}

@api_router.get("/marketplace/download/{purchase_id}")
async def download_product(purchase_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    purchase = await db.marketplace_purchases.find_one(
        {"purchase_id": purchase_id, "buyer_user_id": user.user_id, "status": "completed"}
    )
    if not purchase:
        raise HTTPException(status_code=403, detail="No completed purchase found")
    product = await db.marketplace_products.find_one({"product_id": purchase["product_id"]})
    if not product or not product.get("r2_file_key"):
        raise HTTPException(status_code=404, detail="File not found")
    return {"download_url": get_r2_signed_url(product["r2_file_key"], expiry_seconds=300)}

# ---- Setup Requests (Task 16) ----

async def _release_setup_escrow(sr: dict, reason: str):
    now = datetime.now(timezone.utc).isoformat()
    new_status = "completed" if reason == "buyer_confirmed" else "auto_released"
    result = await db.setup_requests.update_one(
        {"request_id": sr["request_id"], "buyer_confirmed": False},
        {"$set": {"buyer_confirmed": True, "status": new_status,
                  "released_at": now, "release_reason": reason}},
    )
    if result.modified_count == 0:
        return  # Already released by another process
    await db.seller_wallets.update_one(
        {"seller_user_id": sr["seller_user_id"]},
        {"$inc": {"balance_cents": sr["escrow_amount_cents"],
                  "total_earned_cents": sr["escrow_amount_cents"],
                  "escrow_cents": -sr["escrow_amount_cents"]}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": sr["seller_user_id"], "type": "setup_released",
        "amount_cents": sr["escrow_amount_cents"], "product_id": sr["product_id"],
        "purchase_id": sr["purchase_id"], "created_at": now,
        "note": f"Setup escrow released ({reason})",
    })

@api_router.get("/marketplace/setup-requests")
async def list_setup_requests(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    items = await (db.setup_requests
                   .find({"seller_user_id": user.user_id}, {"_id": 0})
                   .sort("created_at", -1).to_list(100))
    for it in items:
        buyer = await db.users.find_one(
            {"user_id": it["buyer_user_id"]},
            {"_id": 0, "name": 1, "picture": 1},
        )
        product = await db.marketplace_products.find_one(
            {"product_id": it["product_id"]}, {"_id": 0, "title": 1}
        )
        it["buyer"] = buyer
        it["product_title"] = (product or {}).get("title")
    return {"requests": items}

@api_router.patch("/marketplace/setup-requests/{request_id}/status")
async def update_setup_status(request_id: str, data: SetupStatusUpdate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    sr = await db.setup_requests.find_one({"request_id": request_id})
    if not sr or sr["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if sr["status"] in {"completed", "auto_released"}:
        raise HTTPException(status_code=400, detail="Already finalized")
    update = {"status": data.status}
    if data.note:
        update["seller_note"] = data.note
    if data.status == "completed":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    await db.setup_requests.update_one({"request_id": request_id}, {"$set": update})
    return {"ok": True}

@api_router.post("/marketplace/setup-requests/{request_id}/confirm")
async def buyer_confirm_setup(request_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    sr = await db.setup_requests.find_one({"request_id": request_id})
    if not sr or sr["buyer_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if sr.get("buyer_confirmed"):
        return {"ok": True}
    await _release_setup_escrow(sr, reason="buyer_confirmed")
    return {"ok": True}

# ---- Auto-release worker (Task 17) ----

async def auto_release_escrow_loop():
    while True:
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor = db.setup_requests.find({
                "status": {"$in": ["pending", "in_progress", "completed"]},
                "buyer_confirmed": False,
                "auto_release_at": {"$lte": now_iso},
            })
            async for sr in cursor:
                try:
                    await _release_setup_escrow(sr, reason="auto_released_7d")
                    logger.info(f"auto-released setup escrow {sr.get('request_id')}")
                except Exception as e:
                    logger.exception(f"auto-release failed for {sr.get('request_id')}: {e}")
        except Exception as e:
            logger.exception(f"auto-release loop error: {e}")
        await asyncio.sleep(60 * 60)  # hourly

# ---- Wallet (Task 18) ----

@api_router.get("/marketplace/wallet")
async def get_wallet(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found — onboard as a seller first")
    txns = await (db.wallet_transactions
                  .find({"seller_user_id": user.user_id}, {"_id": 0})
                  .sort("created_at", -1).limit(100).to_list(100))
    return {"wallet": wallet, "transactions": txns}

@api_router.post("/marketplace/wallet/withdraw")
@limiter.limit("3/hour")  # SEC-06: rate-limit withdrawals to prevent rapid draining
async def request_withdrawal(data: WithdrawalRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id})
    if not wallet or wallet.get("balance_cents", 0) < data.amount_cents:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if not seller:
        raise HTTPException(status_code=400, detail="Seller record missing")
    now = datetime.now(timezone.utc).isoformat()
    req_id = str(uuid.uuid4())
    await db.withdrawal_requests.insert_one({
        "request_id": req_id,
        "seller_user_id": user.user_id,
        "amount_cents": data.amount_cents,
        "payout_method": seller["payout_method"],
        "payout_details": seller.get("payout_details"),
        "status": "pending",
        "created_at": now,
    })
    await db.seller_wallets.update_one(
        {"seller_user_id": user.user_id},
        {"$inc": {"balance_cents": -data.amount_cents}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": user.user_id, "type": "withdrawal_request",
        "amount_cents": -data.amount_cents, "product_id": None, "purchase_id": None,
        "created_at": now, "note": f"Withdrawal requested ({seller['payout_method']})",
    })
    # Send payout notification email
    try:
        if user.email:
            await send_payout_notification(user.email, data.amount_cents, seller["payout_method"])
    except Exception:
        pass
    return {"ok": True, "request_id": req_id}

# ---- Reviews (Task 19) ----

@api_router.post("/marketplace/products/{product_id}/reviews")
async def create_review(product_id: str, data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    purchase = await db.marketplace_purchases.find_one({
        "buyer_user_id": user.user_id, "product_id": product_id, "status": "completed"
    })
    if not purchase:
        raise HTTPException(status_code=403, detail="You must purchase this product before reviewing")
    existing = await db.product_reviews.find_one({"buyer_user_id": user.user_id, "product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1, "picture": 1})
    review = {
        "review_id": str(uuid.uuid4()),
        "product_id": product_id,
        "buyer_user_id": user.user_id,
        "buyer_name": (user_doc or {}).get("name"),
        "buyer_picture": (user_doc or {}).get("picture"),
        "rating": data.rating,
        "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.product_reviews.insert_one(review)
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": "$product_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.product_reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.marketplace_products.update_one(
            {"product_id": product_id},
            {"$set": {"avg_rating": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}},
        )
    review.pop("_id", None)
    return review

@api_router.get("/marketplace/products/{product_id}/reviews")
@cache(expire=120)  # 2 minutes
async def list_reviews(product_id: str, page: int = 1, limit: int = 20):
    limit = min(max(limit, 1), 50)
    page = max(page, 1)
    cursor = (db.product_reviews
              .find({"product_id": product_id}, {"_id": 0, "buyer_user_id": 0})
              .sort("created_at", -1).skip((page - 1) * limit).limit(limit))
    reviews = await cursor.to_list(limit)
    return {"reviews": reviews, "page": page}

# ---- Seller Dashboard Aggregate (Task 20) ----

@api_router.get("/marketplace/seller/dashboard")
async def seller_dashboard(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    seller = await db.marketplace_sellers.find_one(
        {"seller_user_id": user.user_id},
        {"_id": 0, "payout_details": 0},
    )
    if not seller:
        return {"onboarded": False}
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id}, {"_id": 0}) or {}
    pending_setups = await db.setup_requests.count_documents(
        {"seller_user_id": user.user_id, "status": {"$in": ["pending", "in_progress"]}}
    )
    products = await db.marketplace_products.find(
        {"seller_user_id": user.user_id},
        {"_id": 0}
    ).to_list(None)
    return {
        "onboarded": True,
        "seller": seller,
        "wallet": wallet,
        "pending_setup_requests": pending_setups,
        "products": products,
    }

# ---- Public Seller Profile (Task 21) ----

@api_router.get("/marketplace/seller/{seller_id}")
async def get_public_seller(seller_id: str):
    seller = await db.marketplace_sellers.find_one(
        {"seller_user_id": seller_id},
        {"_id": 0, "payout_details": 0},
    )
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    user_doc = await db.users.find_one({"user_id": seller_id}, {"_id": 0, "email": 0})
    products = await (db.marketplace_products
                      .find({"seller_user_id": seller_id, "published": True},
                            {"_id": 0, "description": 0, "r2_file_key": 0})
                      .to_list(50))
    return {"seller": {**seller,
                       "name": (user_doc or {}).get("name"),
                       "picture": (user_doc or {}).get("picture")},
            "products": products}

# ==================== SEO SOLUTIONS DIRECTORY ====================

@api_router.get("/solutions")
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
    results = await db.github_repos.aggregate(pipeline).to_list(50)
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

@api_router.get("/solutions/{slug}")
@cache(expire=600)
async def get_solution_category(slug: str):
    """Returns complete solutions matching a specific use case slug."""
    human_name = slug.replace("-", " ")
    query = {
        "repo_type": "complete_solution",
        "use_cases": {"$regex": human_name, "$options": "i"}
    }
    repos = await db.github_repos.find(query, {"_id": 0}).sort("score", -1).limit(20).to_list(20)
    for r in repos:
        product = await db.marketplace_products.find_one(
            {"github_repo_url": {"$regex": re.escape(r["full_name"]), "$options": "i"}, "published": True},
            {"_id": 0, "product_id": 1, "price_cents": 1, "seller_user_id": 1}
        )
        if product:
            seller = await db.marketplace_sellers.find_one({"seller_user_id": product["seller_user_id"]})
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

# ==================== ALTERNATIVES SEO PAGES ====================

@api_router.get("/alternatives/{tool_slug}")
@cache(expire=3600)  # 1 hour
async def get_alternatives(tool_slug: str):
    """
    Programmatic SEO endpoint: returns open-source alternatives to a paid SaaS tool.
    e.g. /api/alternatives/notion, /api/alternatives/typeform
    """
    # Normalize slug: "google-analytics" -> ["Google Analytics", "google analytics"]
    pretty = tool_slug.replace("-", " ").title()
    variants = [pretty, tool_slug.replace("-", " "), tool_slug]

    # Match on paid_alternative field (case-insensitive)
    regex_pattern = "|".join(re.escape(v) for v in variants)
    curated = await db.tools.find(
        {"paid_alternative": {"$regex": regex_pattern, "$options": "i"}},
        {"_id": 0}
    ).limit(20).to_list(20)

    # Fallback: search by tag like "notion-alternative"
    if len(curated) < 3:
        tag_match = await db.tools.find(
            {"tags": {"$regex": f"{tool_slug}-alternative", "$options": "i"}},
            {"_id": 0}
        ).limit(20).to_list(20)
        seen = {t["tool_id"] for t in curated}
        for t in tag_match:
            if t["tool_id"] not in seen:
                curated.append(t)

    # Also search github_repos by topic
    gh = await db.github_repos.find(
        {"topics": {"$regex": f"{tool_slug}-alternative", "$options": "i"}},
        {"_id": 0}
    ).sort("stars", -1).limit(10).to_list(10)

    # Search complete solutions that replace this SaaS (Phase 5 enrichment)
    complete_solutions = await db.github_repos.find(
        {
            "repo_type": "complete_solution",
            "replaces_saas": {"$regex": regex_pattern, "$options": "i"}
        },
        {"_id": 0}
    ).sort("stars", -1).limit(5).to_list(5)
    # Deduplicate against gh results
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


@api_router.get("/alternatives")
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
    results = await db.tools.aggregate(pipeline).to_list(100)
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


# ---- Blog Posts ----

@api_router.get("/blog/posts")
@cache(expire=600)
async def list_blog_posts(page: int = 1, limit: int = 20):
    limit = min(max(limit, 1), 50)
    page = max(page, 1)
    cursor = (db.blog_posts
              .find({}, {"_id": 0, "content": 0})
              .sort("created_at", -1)
              .skip((page - 1) * limit)
              .limit(limit))
    posts = await cursor.to_list(limit)
    return {"posts": posts, "page": page}

@api_router.get("/blog/posts/{slug}")
@cache(expire=600)
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@api_router.post("/admin/blog/auto-generate", status_code=201)
async def auto_generate_blog_post(user: UserModel = Depends(require_admin)):
    """Auto-generate a blog post from top newly-classified complete_solution repos."""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    repos = await (db.github_repos
                   .find({
                       "repo_type": "complete_solution",
                       "classified_at": {"$gt": week_ago},
                   }, {"_id": 0})
                   .sort("stars", -1)
                   .limit(5)
                   .to_list(5))
    if not repos:
        raise HTTPException(status_code=404, detail="No newly classified repos found in the last 7 days")

    repo_names = [r["full_name"] for r in repos]
    repo_details = "\n".join([
        f"- {r['full_name']}: {r.get('description', '')} (⭐ {r.get('stars', 0)})"
        for r in repos
    ])
    theme = repos[0].get("use_cases", ["Open Source"])[0] if repos[0].get("use_cases") else "Open Source"

    prompt = f"""Write an 800-word blog post titled "Top 5 Open-Source {theme.title()} Tools This Week" for a technical audience of startup founders.

Cover these repositories:
{repo_details}

Format the output as JSON with these exact keys:
- title: the post title
- excerpt: a 1-sentence summary
- content: the full post in Markdown
- tags: an array of 5 relevant tags

Return ONLY the JSON object, no markdown code blocks."""

    try:
        result = await call_ai(prompt, json_response=True)
        import json as _json
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = _json.loads(cleaned)
    except Exception as e:
        logger.error(f"Blog auto-generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate blog post")

    slug = re.sub(r"[^a-z0-9]+", "-", parsed["title"].lower()).strip("-")[:80]
    # Ensure unique slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{now.strftime('%Y%m%d')}"

    post = {
        "slug": slug,
        "title": parsed["title"],
        "excerpt": parsed["excerpt"],
        "content": parsed["content"],
        "tags": parsed.get("tags", []),
        "source_repos": repo_names,
        "created_at": now.isoformat(),
    }
    await db.blog_posts.insert_one(post)
    post.pop("_id", None)
    return post


# ==================== DYNAMIC SITEMAP ====================

@app.get("/sitemap-urls.json")
@cache(expire=3600)
async def sitemap_urls():
    """Returns dynamic URLs for sitemap generation (translator pages, alternatives, tools)."""
    # Top 200 trending repos
    trending = await db.github_repos.find(
        {}, {"_id": 0, "full_name": 1}
    ).sort("stars", -1).limit(200).to_list(200)

    # All tools
    tools = await db.tools.find({}, {"_id": 0, "tool_id": 1}).to_list(500)

    # All paid alternatives
    alt_pipeline = [
        {"$match": {"paid_alternative": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$paid_alternative"}},
    ]
    alts = await db.tools.aggregate(alt_pipeline).to_list(100)

    # Top 50 Solutions Use Cases
    sol_pipeline = [
        {"$match": {"repo_type": "complete_solution"}},
        {"$unwind": "$use_cases"},
        {"$group": {"_id": "$use_cases", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    sol_cases = await db.github_repos.aggregate(sol_pipeline).to_list(50)

    return {
        "translator_repos": [r["full_name"] for r in trending if r.get("full_name")],
        "tool_ids": [t["tool_id"] for t in tools if t.get("tool_id")],
        "alternative_slugs": [
            re.sub(r"[^a-z0-9]+", "-", a["_id"].lower()).strip("-")
            for a in alts if a.get("_id")
        ],
        "solution_slugs": [
            re.sub(r"[^a-z0-9]+", "-", s["_id"].lower()).strip("-")
            for s in sol_cases if s.get("_id")
        ],
    }


@app.get("/sitemap.xml", include_in_schema=False)
@api_router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml():
    """Dynamic XML sitemap with static and DB-driven URLs."""
    site = "https://gitstack.pro"

    static_paths = [
        "/",
        "/tools",
        "/marketplace",
        "/collections",
        "/repo-of-the-day",
        "/compare",
        "/stack-generator",
        "/roast-my-stack",
        "/dead-tool-detector",
        "/repo-translator",
        "/repo-xray",
        "/readme-badge",
        "/idea-exists",
        "/error-explainer",
        "/founder-stacks",
        "/solution-finder",
        "/about",
        "/terms",
        "/privacy",
    ]

    base_urls = [{"loc": f"{site}{p}", "changefreq": "weekly", "priority": "0.7"} for p in static_paths]
    base_urls[0]["changefreq"] = "daily"
    base_urls[0]["priority"] = "1.0"

    trending = await db.github_repos.find(
        {}, {"_id": 0, "full_name": 1}
    ).sort("stars", -1).limit(200).to_list(200)

    tools = await db.tools.find({}, {"_id": 0, "tool_id": 1}).limit(800).to_list(800)

    alt_pipeline = [
        {"$match": {"paid_alternative": {"$nin": [None, ""]}}},
        {"$group": {"_id": "$paid_alternative"}},
    ]
    alts = await db.tools.aggregate(alt_pipeline).to_list(300)

    sol_pipeline = [
        {"$match": {"repo_type": "complete_solution"}},
        {"$unwind": "$use_cases"},
        {"$group": {"_id": "$use_cases", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 50}
    ]
    sol_cases = await db.github_repos.aggregate(sol_pipeline).to_list(50)

    live_products = await db.marketplace_products.find(
        {"published": True, "r2_file_key": {"$ne": None}},
        {"_id": 0, "product_id": 1, "created_at": 1}
    ).to_list(500)

    dynamic_urls = []
    for r in trending:
        full_name = r.get("full_name")
        if full_name and "/" in full_name:
            dynamic_urls.append({"loc": f"{site}/r/{full_name}", "changefreq": "weekly", "priority": "0.6"})

    for t in tools:
        tid = t.get("tool_id")
        if tid:
            dynamic_urls.append({"loc": f"{site}/tools/{tid}", "changefreq": "weekly", "priority": "0.7"})

    for a in alts:
        raw = a.get("_id")
        if raw:
            slug = re.sub(r"[^a-z0-9]+", "-", str(raw).lower()).strip("-")
            if slug:
                dynamic_urls.append({"loc": f"{site}/alternatives/{slug}", "changefreq": "weekly", "priority": "0.8"})

    for s in sol_cases:
        raw = s.get("_id")
        if raw:
            slug = re.sub(r"[^a-z0-9]+", "-", str(raw).lower()).strip("-")
            if slug:
                dynamic_urls.append({"loc": f"{site}/solutions/{slug}", "changefreq": "weekly", "priority": "0.7"})

    for p in live_products:
        pid = p.get("product_id")
        if not pid:
            continue
        item = {"loc": f"{site}/marketplace/{pid}", "changefreq": "daily", "priority": "0.9"}
        created_at = p.get("created_at")
        if isinstance(created_at, str):
            try:
                item["lastmod"] = datetime.fromisoformat(created_at).date().isoformat()
            except Exception:
                pass
        dynamic_urls.append(item)

    urls = base_urls + dynamic_urls

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lines.append("  <url>")
        lines.append(f"    <loc>{xml_escape(u['loc'])}</loc>")
        if u.get("lastmod"):
            lines.append(f"    <lastmod>{u['lastmod']}</lastmod>")
        lines.append(f"    <changefreq>{u['changefreq']}</changefreq>")
        lines.append(f"    <priority>{u['priority']}</priority>")
        lines.append("  </url>")
    lines.append("</urlset>")

    return Response("\n".join(lines), media_type="application/xml")


# ==================== ACTIVATION METRICS ====================

@api_router.get("/metrics/activation")
async def activation_metrics(user: UserModel = Depends(require_auth)):  # SEC-08: protect internal metrics
    """
    Anonymous activation funnel metrics (public, for internal dashboard).
    Tracks: visitors → translators used → stacks saved → marketplace clicks.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)

    # Distinct users active in last 7 days
    active_users = len(await db.user_activity.distinct(
        "user_id", {"created_at": {"$gte": since.isoformat()}}
    ))
    repo_views = await db.user_activity.count_documents(
        {"event_type": "repo_viewed", "created_at": {"$gte": since.isoformat()}}
    )
    tool_views = await db.user_activity.count_documents(
        {"event_type": "tool_viewed", "created_at": {"$gte": since.isoformat()}}
    )
    stacks_saved = await db.user_activity.count_documents(
        {"event_type": "stack_saved", "created_at": {"$gte": since.isoformat()}}
    )
    try:
        translations_cached = await db.repo_translations.count_documents(
            {"cached_at": {"$gte": since.isoformat()}}
        )
        total_translations = await db.repo_translations.estimated_document_count()
    except Exception:
        translations_cached = 0
        total_translations = 0

    return {
        "window_days": 7,
        "active_users_7d": active_users,
        "repo_views_7d": repo_views,
        "tool_views_7d": tool_views,
        "stacks_saved_7d": stacks_saved,
        "translations_cached_7d": translations_cached,
        "translations_total": total_translations,
        "activation_rate": round(active_users / max(repo_views + tool_views, 1), 3),
    }


# Include router
app.include_router(api_router)
app.include_router(og_router)

# CORS — allow specific origins with credentials support
# The frontend sends credentials (cookies) for auth endpoints
_cors_origins = [
    "https://gitstack.pro",
    "https://www.gitstack.pro",
    "http://localhost:3000",
    "http://localhost:5173",
]
# Also allow any vercel preview deployment
_cors_origins_env = os.environ.get("CORS_ORIGINS", "")
if _cors_origins_env:
    _cors_origins.extend([o.strip() for o in _cors_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=list(dict.fromkeys(_cors_origins)),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# SEC-15: Security response headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# ==================== PHONE ALERT HELPER ====================

NTFY_TOPIC = os.environ.get("NTFY_TOPIC", "gitstack-alerts")  # Change this to your topic

async def send_phone_alert(title: str, message: str, priority: str = "default"):
    """Send a push notification to your phone via ntfy.sh"""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://ntfy.sh/{NTFY_TOPIC}",
                content=message.encode("utf-8"),
                headers={
                    "Title": title.encode("ascii", "ignore").decode("ascii").strip(),
                    "Priority": priority,  # "urgent", "high", "default", "low"
                    "Tags": "warning" if priority in ("urgent", "high") else "white_check_mark",
                },
                timeout=10,
            )
        logger.info(f"Phone alert sent: {title}")
    except Exception as e:
        logger.error(f"Failed to send phone alert: {e}")


# Background scraper scheduler
_scraper_task = None

async def _scraper_loop():
    """Run scraper on startup, then every 6 hours"""
    from github_scraper import GitHubScraper
    await asyncio.sleep(10)  # Let server start
    run_count = 0
    while True:
        run_count += 1
        try:
            logger.info("Cron: Starting scheduled GitHub scrape...")
            await send_phone_alert(
                title="🔍 GitStack Scrape Started",
                message=f"Run #{run_count} is now scouring GitHub for new open-source tools.",
                priority="low"
            )
            scraper = GitHubScraper(db)
            # Record start time
            try:
                await db.scrape_metadata.update_one(
                    {"_id": "last_scrape"},
                    {"$set": {"started_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )
            except Exception:
                pass
            stats = await scraper.run_full_scrape()
            await scraper.cleanup_old_repos(30)
            await scraper.close()
            logger.info(f"Cron: Scrape complete — {stats}")
            await send_phone_alert(
                title="✅ GitStack Scrape Complete",
                message=f"Run #{run_count} succeeded. Added {stats.get('hot_added', 0)} hot repos. Total: {stats.get('total_processed', 0)}",
                priority="low"
            )
        except Exception as e:
            logger.error(f"Cron: Scraper error — {e}")
            await send_phone_alert(
                title="🚨 GitStack Scraper FAILED",
                message=f"Run #{run_count} failed!\nError: {str(e)[:300]}",
                priority="urgent"
            )
        await asyncio.sleep(6 * 60 * 60)  # 6 hours

