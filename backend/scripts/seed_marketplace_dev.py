"""Seed marketplace data with curated products + realistic dev data.

Run:
    cd backend && python scripts/seed_marketplace_dev.py

Production:
    cd backend && python scripts/seed_marketplace_dev.py --production
"""
import asyncio
import os
import sys
import argparse
from datetime import datetime, timezone
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

fake = Faker()
Faker.seed(42)

# Categories must match backend Literal exactly
CATEGORIES = ["saas", "mcp-server", "computer-vision", "template", "skill", "other"]
CATEGORY_LABELS = {
    "saas": "SaaS",
    "mcp-server": "MCP Servers",
    "computer-vision": "Computer Vision",
    "template": "Templates",
    "skill": "Skills",
    "other": "Other",
}
SELLER_NAMES = ["alice_dev", "bob_builder", "charlie_code", "dana_designs", "eve_engineer"]

# ── Curated products from agent_instructions/marketplace-products.md ──
CURATED_PRODUCTS = [
    {
        "title": "OpenCRM",
        "tagline": "A modern, open-source CRM that looks like Pipedrive but costs nothing. Next.js frontend, Prisma ORM, PostgreSQL backend.",
        "description": """OpenCRM is a fully functional customer relationship management system built on top of the Twenty CRM open-source core. It includes contact management, deal pipelines, task tracking, email integration, and a clean dashboard that non-technical founders can actually use. Unlike HubSpot's $45/mo starter plan, you pay once and host it forever on any VPS for $5/mo.

What you get:
- Complete Next.js 14 source code
- Prisma schema + PostgreSQL migrations
- Docker Compose setup (one command deploy)
- Email sync via Nodemailer
- Kanban-style deal pipeline
- Team member roles and permissions
- Mobile-responsive UI

Setup Service: We dockerize it on your DigitalOcean / AWS / Hetzner server, configure your domain SSL, connect your email provider, and import your existing CSV contacts.""",
        "category": "saas",
        "source_price_cents": 2900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Docker deploy on your VPS + SSL + email config + CSV import",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/twentyhq/twenty",
        "purchase_count": 7,
        "avg_rating": 4.6,
        "review_count": 3,
    },
    {
        "title": "BookStack",
        "tagline": "Self-hosted appointment booking that beats Calendly. Stripe payments, Zoom auto-generation, reminder emails.",
        "description": """BookStack gives you a branded booking page where clients schedule appointments, pay deposits, and receive automatic Zoom links — without Calendly's $12/mo fee. Built on the Cal.com open-source core with custom theming so it matches your brand colors and logo.

What you get:
- Full Next.js booking interface
- Stripe checkout integration for paid bookings
- Google Calendar / Outlook two-way sync
- Automatic Zoom/Meet link generation
- SMS + email reminder system
- Custom availability rules and buffer times
- Admin dashboard with analytics

Setup Service: We brand it with your colors/logo, connect your Stripe, sync your calendar, and deploy to your domain with SSL.""",
        "category": "saas",
        "source_price_cents": 2500,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1900,
        "setup_description": "Brand theming + Stripe connect + calendar sync + domain deploy",
        "setup_delivery_days": 3,
        "github_repo_url": "https://github.com/calcom/cal.com",
        "purchase_count": 5,
        "avg_rating": 4.4,
        "review_count": 2,
    },
    {
        "title": "InvoiceForge",
        "tagline": "Self-hosted invoicing for freelancers and agencies. PDF generation, Stripe payments, recurring billing, client portal.",
        "description": """InvoiceForge is a complete invoicing and billing platform based on InvoicePlane. Create beautiful PDF invoices, accept Stripe payments, set up recurring subscriptions, and give clients a portal to view their payment history. No more QuickBooks ($15/mo) or FreshBooks ($17/mo).

What you get:
- Full PHP/MySQL source code
- 5 professional PDF invoice templates
- Stripe + PayPal payment gateway support
- Recurring invoice automation
- Client self-service portal
- Expense tracking and reporting
- Multi-currency and tax support
- REST API for integrations

Setup Service: We install it on your server, configure your tax settings, upload your logo, connect Stripe, and send a test invoice.""",
        "category": "saas",
        "source_price_cents": 1900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1000,
        "setup_description": "Server install + tax config + logo upload + Stripe connect + test invoice",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/InvoicePlane/InvoicePlane",
        "purchase_count": 8,
        "avg_rating": 4.7,
        "review_count": 4,
    },
    {
        "title": "VisionKit",
        "tagline": "Production-ready computer vision API starter. OCR, object detection, and image classification in one Docker container.",
        "description": """VisionKit is a FastAPI-based microservice that wraps YOLOv8 and EasyOCR into a single deployable API. Upload an image, get back detected objects, bounding boxes, confidence scores, and extracted text. Perfect for founders building document scanners, quality control tools, or AI-powered apps.

What you get:
- FastAPI server with async endpoints
- YOLOv8 object detection pre-trained on COCO
- EasyOCR text extraction (80+ languages)
- Image classification pipeline
- Docker + GPU support (CUDA)
- Swagger UI for testing
- Python client SDK
- Rate limiting and API key auth

Setup Service: We deploy to your cloud server (AWS/GCP/Hetzner), configure GPU drivers if available, set up reverse proxy with SSL, and provide API docs.""",
        "category": "computer-vision",
        "source_price_cents": 4900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2900,
        "setup_description": "Cloud deploy + GPU config + SSL reverse proxy + API docs",
        "setup_delivery_days": 3,
        "github_repo_url": "https://github.com/ultralytics/ultralytics",
        "purchase_count": 3,
        "avg_rating": 4.8,
        "review_count": 1,
    },
    {
        "title": "MCP-Notion",
        "tagline": "Let AI agents read and write your Notion workspaces. MCP server with full database, page, and block support.",
        "description": """MCP-Notion is a production-ready Model Context Protocol server that connects Claude, Cursor, and other AI assistants directly to your Notion workspace. Your AI can query databases, create pages, update properties, and manage projects without you copy-pasting context.

What you get:
- Full TypeScript MCP server implementation
- Notion API integration with OAuth
- Database query and CRUD operations
- Page creation and content blocks
- Property type support (rich_text, select, multi_select, date, formula, relation)
- Error handling and rate-limit compliance
- Environment configuration template
- Deployment guide for Cloudflare Workers and Node.js

Setup Service: We create your Notion integration, generate your API token, deploy the MCP server, and verify it works with Claude Desktop.""",
        "category": "mcp-server",
        "source_price_cents": 1500,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1000,
        "setup_description": "Notion integration + API token + MCP deploy + Claude Desktop verify",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/makenotion/notion-mcp-server",
        "purchase_count": 6,
        "avg_rating": 4.3,
        "review_count": 2,
    },
    {
        "title": "MCP-Slack",
        "tagline": "Connect AI agents to your Slack workspace. Send messages, search channels, and manage threads via MCP.",
        "description": """MCP-Slack turns your AI assistant into a team member that can read Slack conversations, send messages, search channels, and summarize threads. Built on the official MCP protocol so it works with Claude, Cursor, and any MCP-compatible client.

What you get:
- TypeScript MCP server with Slack Web API
- Channel listing and message search
- Send messages and thread replies
- User lookup and presence detection
- File upload support
- Slack Bolt framework for Slack-native commands
- OAuth 2.0 installation flow
- Deployment configs for Railway, Render, and self-host

Setup Service: We create your Slack app, configure OAuth scopes, deploy the MCP server, and test message sending from Claude.""",
        "category": "mcp-server",
        "source_price_cents": 1500,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1000,
        "setup_description": "Slack app creation + OAuth scopes + MCP deploy + message test",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
        "purchase_count": 4,
        "avg_rating": 4.2,
        "review_count": 1,
    },
    {
        "title": "SaaS-Boiler",
        "tagline": "The only Next.js starter you need. Auth, Stripe, database, emails, and dashboard — pre-wired and production-ready.",
        "description": """SaaS-Boiler is a battle-tested Next.js 14 starter that eliminates 40+ hours of setup. It includes authentication, Stripe subscriptions, a PostgreSQL database, transactional emails, an admin dashboard, and a landing page. Fork it, brand it, launch in a weekend.

What you get:
- Next.js 14 App Router + TypeScript
- Clerk authentication (magic links + OAuth)
- Stripe Checkout + Customer Portal
- Prisma + PostgreSQL schema
- Resend email templates (welcome, receipt, password reset)
- Tailwind + shadcn/ui component library
- Dark mode support
- Admin dashboard with user analytics
- SEO-optimized landing page
- Docker + docker-compose for local dev
- Deploy guides for Vercel, Railway, Render

Setup Service: We brand the landing page with your copy, configure Stripe products/prices, set up your production database, deploy to Vercel, and connect your custom domain.""",
        "category": "template",
        "source_price_cents": 3900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2500,
        "setup_description": "Brand landing page + Stripe config + database setup + Vercel deploy + custom domain",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/t3-oss/create-t3-app",
        "purchase_count": 12,
        "avg_rating": 4.9,
        "review_count": 5,
    },
    {
        "title": "AI-Agent-Template",
        "tagline": "Build AI agents that actually work. ReAct pattern, tool calling, memory, and multi-step reasoning — all in one Python template.",
        "description": """AI-Agent-Template is a production-ready Python framework for building ReAct-style AI agents using LangGraph. It includes tool calling, conversation memory, human-in-the-loop checkpoints, and streaming responses. Stop building agent demos that break in production.

What you get:
- LangGraph state machine with ReAct pattern
- Tool registry with 5 pre-built tools (search, calculator, API call, file read, database query)
- Conversation memory with SQLite persistence
- Human approval checkpoints for sensitive actions
- Streaming SSE endpoint for real-time responses
- FastAPI server with async support
- Docker container with Python 3.11
- OpenAI + Anthropic + local model support (via LiteLLM)
- Observability with LangSmith tracing
- Deploy configs for Render, Railway, and AWS ECS

Setup Service: We customize the tool set for your use case, connect your LLM provider API keys, deploy the API, and provide a Postman collection.""",
        "category": "template",
        "source_price_cents": 4500,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2900,
        "setup_description": "Custom tools + LLM API keys + API deploy + Postman collection",
        "setup_delivery_days": 3,
        "github_repo_url": "https://github.com/langchain-ai/langgraph",
        "purchase_count": 4,
        "avg_rating": 4.5,
        "review_count": 2,
    },
    {
        "title": "Clerk-Auth-Skill",
        "tagline": "Complete Clerk authentication implementation for Next.js. Organizations, roles, webhooks, and protected routes — explained in plain English.",
        "description": """Clerk-Auth-Skill is not just code — it's a complete implementation guide + working repo that shows exactly how to add enterprise-grade auth to your Next.js app. Includes organizations (multi-tenancy), role-based access control, webhook handling, and protected API routes. All explained like you're 5.

What you get:
- Complete Next.js 14 repo with Clerk integration
- Organization switching and member management
- Role-based access (admin, editor, viewer)
- Middleware for protected routes and API endpoints
- Webhook handlers for user.created, user.updated, organization.created
- Custom sign-in/sign-up pages with your branding
- User profile and account settings components
- Step-by-step PDF guide (30 pages)
- Common pitfalls and debugging checklist

Setup Service: We integrate Clerk into your existing Next.js app, configure your auth flows, set up webhooks, and test every protected route.""",
        "category": "skill",
        "source_price_cents": 1200,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Clerk integration + auth flows + webhooks + route testing",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/clerk/javascript",
        "purchase_count": 9,
        "avg_rating": 4.6,
        "review_count": 3,
    },
    {
        "title": "DeployScript",
        "tagline": "One-command Docker deployments for 5 popular stacks. Next.js, Python API, PostgreSQL, Redis, and Nginx — all wired together.",
        "description": """DeployScript is a collection of production-ready Docker Compose configurations for the most common founder stacks. Stop wrestling with environment variables, reverse proxies, and SSL certificates. One `docker compose up` and you're live.

What you get:
- Stack A: Next.js + PostgreSQL + Redis + Nginx
- Stack B: Python FastAPI + PostgreSQL + Celery + Redis
- Stack C: Node.js Express + MongoDB + Nginx
- Stack D: Static site (Jekyll/Hugo) + Nginx
- Stack E: Full-stack monorepo (Next.js + NestJS + PostgreSQL)
- SSL auto-renewal with Certbot
- Environment variable templates for each stack
- Health checks and restart policies
- Log rotation configuration
- Hetzner / DigitalOcean / AWS deploy guides
- Monitoring with cAdvisor + Prometheus (bonus stack)

Setup Service: We customize the compose file for your project, configure your domain and SSL, deploy to your VPS, and verify all services are healthy.""",
        "category": "other",
        "source_price_cents": 900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1900,
        "setup_description": "Custom compose + domain SSL + VPS deploy + health verification",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/docker/awesome-compose",
        "purchase_count": 11,
        "avg_rating": 4.4,
        "review_count": 4,
    },
]


def make_product(seller_user_id: str, published: bool = True):
    title = fake.catch_phrase()
    return {
        "product_id": str(uuid4()),
        "seller_user_id": seller_user_id,
        "title": title,
        "tagline": fake.sentence(nb_words=8),
        "description": fake.text(max_nb_chars=800),
        "category": fake.random_element(CATEGORIES),
        "source_price_cents": fake.random_int(min=500, max=50000),
        "currency": "INR",
        "setup_price_cents": fake.random_int(min=0, max=20000),
        "setup_available": fake.boolean(chance_of_getting_true=30),
        "setup_description": fake.sentence(nb_words=10) if fake.boolean(chance_of_getting_true=30) else None,
        "setup_delivery_days": fake.random_int(min=1, max=7) if fake.boolean(chance_of_getting_true=30) else None,
        "published": published,
        "screenshots": ["https://placehold.co/600x400/000000/FFF?text=Screenshot"],
        "r2_file_key": f"sources/{uuid4()}.zip" if published else None,
        "github_repo_url": f"https://github.com/{seller_user_id}/{title.lower().replace(' ', '-').replace(',', '')}",
        "purchase_count": fake.random_int(min=0, max=500),
        "setup_count": fake.random_int(min=0, max=50),
        "avg_rating": round(fake.pyfloat(min_value=1.0, max_value=5.0, right_digits=1), 1),
        "review_count": fake.random_int(min=0, max=100),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def seed(production: bool = False):
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("MONGO_URL not set — seed skipped")
        return

    db_name = os.environ.get("DB_NAME", "gitstack")
    print(f"Connecting to MongoDB database: {db_name}")
    if production:
        print("⚠️  PRODUCTION MODE — inserting into live database")

    import ssl
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
    db = client[db_name]

    # ── Curated seller ──
    curated_seller = "gitstack_curated"
    await db.marketplace_sellers.update_one(
        {"seller_user_id": curated_seller},
        {"$set": {
            "seller_user_id": curated_seller,
            "display_name": "GitStack Curated",
            "bio": "Hand-picked open-source tools, templates, and MCP servers reviewed by the GitStack team.",
            "verified": True,
            "payout_method": "upi",
            "payout_details": {"upi_id": "gitstack@upi"},
            "available_for_hire": False,
            "onboarded_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }}, upsert=True
    )
    print(f"  Upserted seller: {curated_seller}")

    # ── Insert curated products ──
    inserted = 0
    for template in CURATED_PRODUCTS:
        UNSPLASH_IMAGES = {
            "OpenCRM": [
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
            ],
            "BookStack": [
                "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1512314889357-e157c22f938d?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop",
            ],
            "InvoiceForge": [
                "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop",
            ],
            "ShopLite": [
                "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop",
            ],
            "VisionKit": [
                "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&h=600&fit=crop",
            ],
            "MCP-Notion": [
                "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop",
            ],
            "MCP-Slack": [
                "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
            ],
            "SaaS-Boiler": [
                "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop",
            ],
            "AI-Agent-Template": [
                "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&h=600&fit=crop",
            ],
            "Clerk-Auth-Skill": [
                "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop",
            ],
            "DeployScript": [
                "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1667372393119-c8f473882e8e?w=800&h=600&fit=crop",
                "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=600&fit=crop",
            ],
        }
        doc = {
            "product_id": str(uuid4()),
            "seller_user_id": curated_seller,
            **template,
            "published": True,
            "sold_out": True,
            "max_purchases": 50,
            "screenshots": UNSPLASH_IMAGES.get(template['title'], [f"https://placehold.co/600x400/2563EB/FFF?text={template['title'].replace(' ', '+')}"]),
            "r2_file_key": f"sources/{template['title'].lower().replace(' ', '-')}.zip",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.marketplace_products.update_one(
            {"title": doc["title"], "seller_user_id": curated_seller},
            {"$set": doc},
            upsert=True
        )
        inserted += 1
    print(f"  Seeded {inserted} curated products.")

    # ── Premium open-source alternatives ──
    premium_seller = "gitstack_admin"
    await db.marketplace_sellers.update_one(
        {"seller_user_id": premium_seller},
        {"$set": {
            "seller_user_id": premium_seller,
            "display_name": "GitStack Admin",
            "bio": "Official GitStack listings for popular open-source alternatives.",
            "verified": True,
            "payout_method": "bank",
            "available_for_hire": False,
            "onboarded_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }}, upsert=True
    )

    premium_repos = [
        ("n8n Ready-to-Deploy", "n8n-io/n8n", "Fair-code workflow automation. The Zapier alternative.", 2900, 14900, "saas"),
        ("Appwrite Ready-to-Deploy", "appwrite/appwrite", "Secure open-source backend server. The Firebase alternative.", 1900, 9900, "saas"),
        ("Supabase Ready-to-Deploy", "supabase/supabase", "The open source Firebase alternative.", 1900, 9900, "saas"),
        ("Cal.com Ready-to-Deploy", "calcom/cal.com", "Scheduling infrastructure for everyone. Calendly alternative.", 2900, 12900, "saas"),
        ("Plausible Ready-to-Deploy", "plausible/analytics", "Simple, privacy-friendly Google Analytics alternative.", 1900, 4900, "saas"),
    ]

    for title, repo, tagline, source_price, setup_price, cat in premium_repos:
        p = make_product(premium_seller, published=True)
        p.update({
            "title": title,
            "tagline": tagline,
            "github_repo_url": f"https://github.com/{repo}",
            "source_price_cents": source_price,
            "setup_price_cents": setup_price,
            "setup_available": True,
            "setup_description": f"Production deployment of {title.split()[0]} on your VPS with SSL",
            "setup_delivery_days": 2,
            "category": cat,
            "currency": "INR",
        })
        await db.marketplace_products.update_one(
            {"title": p["title"], "seller_user_id": premium_seller},
            {"$set": p},
            upsert=True
        )
    print(f"  Seeded {len(premium_repos)} premium open-source products.")

    # ── Random sellers with fake products ──
    for name in SELLER_NAMES:
        seller_doc = {
            "seller_user_id": name,
            "display_name": name.replace("_", " ").title(),
            "bio": fake.sentence(nb_words=12),
            "verified": fake.boolean(chance_of_getting_true=50),
            "payout_method": fake.random_element(["bank", "upi", "paypal"]),
            "payout_details": {"upi_id": f"{name}@upi"},
            "available_for_hire": fake.boolean(chance_of_getting_true=30),
            "hire_contact": fake.email(),
            "onboarded_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.marketplace_sellers.update_one(
            {"seller_user_id": name}, {"$set": seller_doc}, upsert=True
        )
        products = [make_product(name, published=fake.boolean(chance_of_getting_true=80)) for _ in range(fake.random_int(min=3, max=8))]
        for p in products:
            await db.marketplace_products.update_one(
                {"product_id": p["product_id"]}, {"$set": p}, upsert=True
            )
        print(f"  Seeded {len(products)} products for {name}")

    print("\nDone seeding marketplace data.")
    print(f"Total curated products: {inserted}")
    print(f"Total premium products: {len(premium_repos)}")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed GitStack marketplace data")
    parser.add_argument("--production", action="store_true", help="Confirm production database seed")
    args = parser.parse_args()
    asyncio.run(seed(production=args.production))
