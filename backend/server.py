from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

class UserStack(BaseModel):
    stack_id: str
    user_id: str
    name: str
    tools: List[str]
    is_public: bool = True
    copy_count: int = 0
    created_at: datetime

class DeadToolRequest(BaseModel):
    paid_tools: str

class StackGeneratorRequest(BaseModel):
    idea: str
    budget: Optional[str] = None
    needs_payments: Optional[bool] = None
    building_alone: Optional[bool] = None

class RepoTranslatorRequest(BaseModel):
    github_url: str

class RoastRequest(BaseModel):
    tools: List[str]

class SaveStackRequest(BaseModel):
    name: str
    tools: List[str]
    is_public: bool = True

# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> Optional[UserModel]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        return None
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    return UserModel(**user)

async def require_auth(request: Request) -> UserModel:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# ==================== AI HELPERS ====================

async def call_gemini(prompt: str, json_response: bool = False) -> str:
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gitstack_{uuid.uuid4().hex[:8]}",
            system_message="You are a helpful assistant for GitStack, a platform helping non-technical founders discover GitHub tools."
        ).with_model("gemini", "gemini-3-flash-preview")
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return response
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail="AI service temporarily unavailable")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = resp.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
    else:
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(user: UserModel = Depends(require_auth)):
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}

# ==================== TOOLS ROUTES ====================

@api_router.get("/tools")
async def get_tools(category: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}}
        ]
    tools = await db.tools.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return tools

@api_router.get("/tools/{tool_id}")
async def get_tool(tool_id: str):
    tool = await db.tools.find_one({"tool_id": tool_id}, {"_id": 0})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool

@api_router.get("/tools/trending/list")
async def get_trending_tools(tab: str = "top_week"):
    tools = await db.tools.find({}, {"_id": 0}).limit(10).to_list(10)
    return tools

# ==================== TOPICS ROUTES ====================

@api_router.get("/topics")
async def get_topics():
    topics = await db.topics.find({}, {"_id": 0}).to_list(20)
    return topics

@api_router.get("/topics/{topic_id}/tools")
async def get_topic_tools(topic_id: str):
    topic = await db.topics.find_one({"topic_id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    tools = await db.tools.find({"category": topic["name"]}, {"_id": 0}).to_list(50)
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
async def dead_tool_detector(req: DeadToolRequest):
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

    result = await call_gemini(prompt, json_response=True)
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
async def stack_generator(req: StackGeneratorRequest):
    context = f"Idea: {req.idea}"
    if req.budget:
        context += f"\nBudget: {req.budget}"
    if req.needs_payments is not None:
        context += f"\nNeeds payments: {'Yes' if req.needs_payments else 'No'}"
    if req.building_alone is not None:
        context += f"\nBuilding alone: {'Yes' if req.building_alone else 'No'}"

    prompt = f"""Help a non-technical founder build: {context}

Recommend 4-6 free/open-source GitHub tools to build this idea.

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

    result = await call_gemini(prompt, json_response=True)
    try:
        import json
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        data = json.loads(cleaned)
        return {"stack": data}
    except:
        return {"stack": [], "raw": result}

@api_router.post("/ai/repo-translator")
async def repo_translator(req: RepoTranslatorRequest):
    prompt = f"""Translate this GitHub repository for a non-technical founder: {req.github_url}

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

    result = await call_gemini(prompt)
    return {"translation": result}

@api_router.post("/ai/roast-my-stack")
async def roast_my_stack(req: RoastRequest):
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

    result = await call_gemini(prompt)
    return {"roast": result}

@api_router.post("/ai/idea-exists")
async def idea_exists(idea: str):
    prompt = f"""A founder wants to build: {idea}

Find 3-5 existing open-source GitHub projects that are building something similar.

Return ONLY a valid JSON array:
[
  {{
    "name": "Project Name",
    "description": "What it does (plain English)",
    "githubUrl": "https://github.com/...",
    "stars": "Xk",
    "howToGoFurther": "How the founder can differentiate or build on top of this"
  }}
]

Be accurate with real repositories. Frame it positively - show existing work as a foundation, not competition."""

    result = await call_gemini(prompt, json_response=True)
    try:
        import json
        cleaned = result.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]
        data = json.loads(cleaned)
        return {"similar_projects": data}
    except:
        return {"similar_projects": [], "raw": result}

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

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed the database with initial tools, topics, and collections"""
    
    # Check if already seeded
    existing = await db.tools.count_documents({})
    if existing > 50:
        return {"message": "Database already seeded", "tools_count": existing}
    
    # Seed Topics
    topics = [
        {"topic_id": "ai-agents", "name": "AI Agents", "icon": "Bot", "color": "text-blue-600", "bg_color": "bg-blue-100", "tool_count": 28},
        {"topic_id": "ui-ux", "name": "UI/UX Tools", "icon": "Palette", "color": "text-pink-600", "bg_color": "bg-pink-100", "tool_count": 52},
        {"topic_id": "automation", "name": "Automation", "icon": "Zap", "color": "text-yellow-600", "bg_color": "bg-yellow-100", "tool_count": 61},
        {"topic_id": "data-analytics", "name": "Data & Analytics", "icon": "LineChart", "color": "text-emerald-600", "bg_color": "bg-emerald-100", "tool_count": 44},
        {"topic_id": "payments", "name": "Payments & Billing", "icon": "CreditCard", "color": "text-orange-600", "bg_color": "bg-orange-100", "tool_count": 19},
        {"topic_id": "auth", "name": "Authentication", "icon": "Shield", "color": "text-purple-600", "bg_color": "bg-purple-100", "tool_count": 15},
    ]
    await db.topics.delete_many({})
    await db.topics.insert_many(topics)
    
    # Seed Tools (100+ curated tools with plain English descriptions)
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
    ]
    
    await db.tools.delete_many({})
    await db.tools.insert_many(tools)
    
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
    
    await db.collections.delete_many({})
    await db.collections.insert_many(collections)
    
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
    
    await db.user_stacks.delete_many({"user_id": "system"})
    await db.user_stacks.insert_many(public_stacks)
    
    return {"message": "Database seeded successfully", "tools_count": len(tools), "topics_count": len(topics), "collections_count": len(collections)}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "GitStack API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
