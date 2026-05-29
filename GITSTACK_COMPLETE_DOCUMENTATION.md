# GitStack — Complete Technical Documentation

> **Version:** 1.5 (Phases 0–12 Complete)  
> **Last Updated:** May 3, 2026  
> **Project:** gitstack.pro — Open-source tool discovery platform for non-technical founders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack Deep Dive](#3-tech-stack-deep-dive)
4. [Phase-by-Phase Implementation](#4-phase-by-phase-implementation)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [User Flows](#7-user-flows)
8. [Frontend Components](#8-frontend-components)
9. [Authentication & Security](#9-authentication--security)
10. [Deployment Configuration](#10-deployment-configuration)
11. [Environment Variables](#11-environment-variables)
12. [Development Guidelines](#12-development-guidelines)
13. [Appendix A: File Manifest](#appendix-a-file-manifest)
14. [Appendix B: Performance Considerations](#appendix-b-performance-considerations)
15. [Appendix C: Third-Party Integrations](#appendix-c-third-party-integrations)
16. [Appendix D: SEO Keyword Strategy](#appendix-d-seo-keyword-strategy)

---

## 1. Executive Summary

GitStack is a **two-tier web application** that helps non-technical founders discover, understand, and acquire open-source alternatives to expensive SaaS tools.

### Core Value Proposition

- **Discovery:** Curated database of 200+ open-source tools organized by category
- **Understanding:** AI-powered translation of GitHub repositories into plain English
- **Acquisition:** Marketplace for buying/selling indie dev tools with source code + setup services
- **Community:** Founder stacks, reviews, and hiring capabilities

### Business Model

- **Free Tier:** Browse tools, generate stacks, use AI features
- **Marketplace:** 15% platform fee on all sales
- **Setup Services:** Escrow-held payments for installation help

---

## 2. System Architecture

### 2.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  React SPA   │  │  Clerk Auth  │  │  AI Agents   │            │
│  │  (Frontend)  │  │  (OAuth)     │  │  (MCP)       │            │
│  └──────┬───────┘  └──────────────┘  └──────────────┘            │
└─────────┼───────────────────────────────────────────────────────┘
          │ HTTPS / WebSocket
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API GATEWAY                               │
│              FastAPI + Uvicorn (Python)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  Rate Limiter│  │  Auth Middle │  │  CORS        │            │
│  │  (SlowAPI)   │  │  (Clerk JWT) │  │  Handler     │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────┬───────────────────────────────────────────────────────┘
          │
          ├──────────────────┬──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   AI Services   │ │  Data Storage   │ │  External APIs  │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  Gemini   │  │ │  │  MongoDB  │  │ │  │  GitHub   │  │
│  │  (Google) │  │ │  │  (Atlas)  │  │ │  │  API      │  │
│  └───────────┘  │ │  └───────────┘  │ │  └───────────┘  │
│                 │ │                 │ │                 │
│  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌───────────┐  │
│  │  Rate:    │  │ │  │  Redis    │  │ │  │  Razorpay │  │
│  │  10-15    │  │ │  │  (Cache)  │  │ │  │  Payments │  │
│  │  req/min  │  │ │  └───────────┘  │ │  └───────────┘  │
│  └───────────┘  │ │                 │ │                 │
└─────────────────┘ │  ┌───────────┐  │ │  ┌───────────┐  │
                    │  │  Cloudflare│  │ │  │  R2       │  │
                    │  │  Storage   │  │ │  │  (Files)  │  │
                    │  └───────────┘  │ │  └───────────┘  │
                    └─────────────────┘ └─────────────────┘
```

### 2.2 Service Boundaries

| Service | Responsibility | Technology |
|---------|---------------|------------|
| `gitstack-app` | Static React frontend | React 19 + CRACO |
| `gitstack-api` | FastAPI backend + scraper | Python 3.11 + Uvicorn |
| MongoDB Atlas | Primary data store | Document DB |
| Redis | Caching + Rate limiting | In-memory/Redis |
| Cloudflare R2 | File storage (ZIPs, screenshots) | S3-compatible |
| Clerk | Authentication provider | OAuth 2.0 + JWT |

---

## 3. Tech Stack Deep Dive

### 3.1 Backend (Python/FastAPI)

| Component | Library | Purpose |
|-----------|---------|---------|
| Web Framework | FastAPI 0.115+ | API routing, validation, docs |
| ASGI Server | Uvicorn | HTTP server with async support |
| Database Driver | Motor 1.3+ | Async MongoDB driver |
| Validation | Pydantic v2 | Request/response models |
| Rate Limiting | SlowAPI | Per-IP throttling |
| AI Integration | Google Gemini API | Content generation |
| HTTP Client | httpx | GitHub API calls |
| Caching | fastapi-cache2 | Redis/in-memory caching |
| Logging | Loguru | Structured logging |
| Email | fastapi-mail | SMTP notifications |
| Health Checks | fastapi-health | /health endpoint |

### 3.2 Frontend (React)

| Component | Library | Purpose |
|-----------|---------|---------|
| Core Framework | React 19 | UI rendering |
| Router | React Router v7 | Client-side routing |
| Build Tool | CRACO | Webpack customization |
| Styling | Tailwind CSS v3 | Utility-first CSS |
| UI Components | Radix UI + shadcn/ui | Accessible primitives |
| Animation | Framer Motion | Page transitions |
| State Management | Zustand | Global state (wizard) |
| Auth | @clerk/clerk-react | OAuth integration |
| Theme | next-themes | Dark/light mode |
| Tables | @tanstack/react-table | Sortable data tables |
| Virtualization | react-window | Large list rendering |
| Error Handling | react-error-boundary | Crash boundaries |
| Toast Notifications | sonner | User feedback |
| Markdown | marked + DOMPurify | Safe content rendering |
| Icons | lucide-react | Consistent iconography |

### 3.3 MCP Server (TypeScript)

| Component | Library | Purpose |
|-----------|---------|---------|
| Runtime | Node.js 20+ | Server execution |
| Language | TypeScript | Type safety |
| Protocol | @modelcontextprotocol/sdk | MCP standard |
| HTTP Client | axios | API calls |
| Validation | zod + zod-to-json-schema | Input validation |

---

## 4. Phase-by-Phase Implementation

### Phase 0 — Auth Re-Enable ✅

**Goal:** Replace guest-only stub with real Clerk OAuth authentication.

**Components:**
- `AuthContext.js` — Clerk integration with JWT interceptor
- `RequireAuth.js` — Route protection wrapper
- `Header.js` — Login/logout buttons + user avatar
- `App.js` — Protected routes (`/dashboard`, `/sell`)

**Key Features:**
- Automatic JWT attachment to API calls
- User sync to backend on login
- `/u/me` redirect to user's profile
- Mobile-responsive auth UI

**Status:** All 5 tasks completed

---

### Phase 1 — Dark/Light Mode ✅

**Goal:** Add theme toggle with next-themes.

**Components:**
- `ThemeProvider` in `App.js` (attribute="class", defaultTheme="system")
- `ThemeToggle.js` — Sun/Moon button with resolved theme detection
- `index.css` — Full HSL variable system with `.dark` overrides

**Design System:**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 4%;
  --primary: 221.2 83.2% 53.3%;
  /* ... 20+ variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... inverted colors */
}
```

**Status:** All 5 tasks completed

---

### Phase 2 — gitstack.pro URLs ✅

**Goal:** Support clean repo shortlinks.

**Routes:**
- `/repo/:owner/:repo` → Redirects to `/r/:owner/:repo`
- `/:owner/:repo` → Catch-all shortlink for gitstack.pro

**Implementation:**
```jsx
const RepoShortlink = () => {
  const { owner, repo } = useParams();
  return <Navigate to={`/r/${owner}/${repo}`} replace />;
};
```

**Status:** All redirect logic implemented

---

### Phase 3 — Marketplace Backend ✅

**Goal:** Complete marketplace infrastructure with payments.

**Collections:**
- `marketplace_sellers` — Seller profiles & onboarding
- `marketplace_products` — Product listings (draft/published)
- `marketplace_purchases` — Transaction records
- `setup_requests` — Escrow-hold setup services
- `product_reviews` — Buyer reviews (1-5 stars)
- `seller_wallets` — Balance & transaction history

**Key Endpoints:**
```
POST   /marketplace/sellers/onboard
POST   /marketplace/products
POST   /marketplace/products/{id}/screenshots
POST   /marketplace/products/{id}/zip
PATCH  /marketplace/products/{id}/publish
POST   /marketplace/orders
POST   /marketplace/verify-payment
POST   /marketplace/webhook/razorpay
GET    /marketplace/download/{purchase_id}
GET    /marketplace/my-purchases
GET    /marketplace/seller/dashboard
POST   /marketplace/setup-requests/{id}/status
```

**Payment Flow:**
1. Create Razorpay order (2x amount for setup)
2. Buyer pays via Checkout
3. Verify signature on backend
4. Credit seller wallet (85% after 15% fee)
5. Hold setup amount in escrow
6. Auto-release after 7 days or buyer confirmation

**Status:** All 22 tasks completed

---

### Phase 4 — Marketplace Frontend ✅

**Goal:** Complete marketplace UI.

**Pages:**
- `MarketplacePage.js` — Browse with filters, search, virtual grid
- `MarketplaceProductPage.js` — Product detail with reviews
- `SellPage.js` — Seller dashboard (3 tabs)

**Components:**
- `ProductCard.jsx` — Grid display with seller info
- `VirtualProductGrid.jsx` — react-window virtualized grid
- `CreateProductWizard.jsx` — 5-step product creation (Zustand)
- `MyListingsTab.jsx` — TanStack Table for seller products
- `SetupRequestsTab.jsx` — Incoming setup jobs
- `WalletTab.jsx` — Balance, transactions, withdraw
- `ReviewsSection.jsx` — Star ratings with comments
- `MarketplaceTeaser.jsx` — Cross-page promotion

**Integration Points:**
- GitHubRepoPage — "Sell on Marketplace" CTA
- DeadToolDetector — Marketplace promo in results
- Dashboard — "My Purchases" tab
- HomePage — 3-pillar value strip

**Status:** All 17 tasks completed

---

### Phase 5 — MCP Server ✅

**Goal:** AI coding agent integration.

**Package:** `@gitstack/mcp` v0.1.0

**Tools:**
- `get_trending_repos` — Fetch trending from GitHub
- `search_repos` — Search by keywords
- `find_alternatives` — Get OSS alternatives
- `translate_repo` — AI summary of any repo
- `compare_tools` — Side-by-side comparison
- `get_tool_details` — Full tool information

**Usage:**
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "gitstack": {
      "command": "npx",
      "args": ["-y", "@gitstack/mcp"],
      "env": { "GITSTACK_API_URL": "https://gitstack.pro/api" }
    }
  }
}
```

**Status:** All 5 tasks completed, published to npm

---

### Phase 6 — Personalized Recommendations ✅

**Goal:** AI-powered tool recommendations based on activity.

**Collection:** `user_activity`
```json
{
  "user_id": "string",
  "event_type": "tool_viewed|repo_viewed|stack_saved|topic_visited",
  "entity_id": "string",
  "created_at": "ISO datetime"
}
```

**Features:**
- TTL index: 90-day auto-cleanup
- Activity tracking: `POST /api/activity`
- Gemini-powered recommendations: `GET /api/recommendations`
- 2-hour cache on user record
- Deduplication (excludes already-viewed)

**Frontend:**
- `RecommendationsSection.js` — 6-card grid
- HomePage: "For You" section (logged-in only)
- Dashboard: Personalized recommendations

**Status:** All 6 tasks completed

---

### Phase 7 — User Profile Page ✅

**Goal:** Shareable resume-like profiles at `/u/:userId`.

**Extended UserModel:**
```python
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
```

**Endpoints:**
```
PATCH /api/users/me
GET   /api/users/{user_id}
GET   /api/users/{user_id}/repos
```

**Features:**
- Edit mode for profile owner
- GitHub repo fetch (live + AI summary)
- Skills chips
- "Hire Me" button with contact
- Verified seller badge
- Published stacks display
- Marketplace products listing

**Status:** All 5 tasks completed

---

### Phase 8 — Repo X-Ray (CodeFlow Integration) ✅

**Goal:** Rebrand CodeFlow as Repo X-Ray and embed it into GitStack for architecture visualization.

**Files:**
- `frontend/public/xray.html` — Static rebranded viewer (generated via `scripts/build-xray.js`)
- `frontend/src/pages/GitHubRepoPage.js` — Tabbed interface: "Plain English" vs "Repo X-Ray"
- `frontend/src/pages/RepoXrayPage.js` — Standalone landing page with input form
- `frontend/src/pages/RepoTranslator.js` — X-Ray CTA card after translation
- `scripts/build-xray.js` — Automated rebranding pipeline (colors, text, logos)

**Key Features:**
- Deeplink support: `?tab=xray` lands directly on X-Ray tab
- Rebranded CodeFlow embedded as iframe sourced from `/xray.html`
- External fullscreen link
- Cleaned nested `.git` in `xray/` directory

**Status:** All tasks completed

---

### Phase 9 — GitStack README Badge GitHub Action ✅

**Goal:** Create a reusable GitHub Action that auto-injects GitStack tech-stack badges into any repo's README.md.

**Files:**
- `actions/readme-badge/action.yml` — Action metadata
- `actions/readme-badge/index.js` — Core logic: inject/update badge block between HTML markers
- `actions/readme-badge/dist/index.js` — Bundled via `@vercel/ncc` (589KB)
- `actions/readme-badge/README.md` — Marketplace docs with usage example
- `actions/readme-badge/PUBLISH.md` — Step-by-step publish guide
- `frontend/src/pages/ReadmeBadgePage.js` — Landing page with one-click workflow deeplink

**Key Features:**
- Two install paths: GitHub Action (auto-updates) or static markdown snippet
- Uses `<!-- GITSTACK-BADGE:START/END -->` markers for safe updates
- Three shields.io badges: Stack Analysis (purple), Plain English (green), Repo X-Ray (orange)
- One-click "Open pre-filled workflow on GitHub" button via `new file + value=` deeplink

**Status:** All tasks completed — publish to GitHub Marketplace is a manual step for the owner

---

### Phase 10 — User Flow & Navigation Audit ✅

**Goal:** Systematic end-to-end user flow review and navigation fixes.

**Issues Found & Fixed:**
1. **Header avatar had no menu** — only "Logout" button, no quick links
2. **"Sell" link invisible** — no way to discover seller onboarding from header/footer/mobile menu
3. **Buyer/Seller dashboards disconnected** — no cross-links between them
4. **Footer broken link** — `#trending` anchor had no matching element on HomePage
5. **Hero mode detection duplicated logic** — `handleSearch` and `detectMode` diverged
6. **Repo Translator fetch failed silently** — no guidance when backend wasn't running

**Fixes Applied:**
- `frontend/src/components/UserMenu.js` — New dropdown: Profile, Buyer Dashboard, Seller Dashboard, Marketplace, Logout
- `frontend/src/components/Header.js` — "Sell" in desktop nav + mobile menu; wired `UserMenu` for logged-in users
- `frontend/src/components/Footer.js` — Sell, README Badge, Terms, Privacy, About links; removed broken `#trending`
- `frontend/src/pages/Dashboard.js` — "Become a Seller" cross-link CTA card
- `frontend/src/pages/RepoTranslator.js` — X-Ray CTA card + better error messaging
- `frontend/src/components/sections/Hero.js` — Consolidated `handleSearch` to use `detectMode` helper

**Status:** All tasks completed

---

### Phase 11 — Legal, Trust & Production Readiness ✅

**Goal:** Add legal pages and production-ready trust signals.

**Files:**
- `frontend/src/pages/LegalPage.js` — Shared `LegalShell` component for Terms, Privacy, About
  - `TermsPage` — 8 sections: Acceptance, Accounts, AI Output, Marketplace, Prohibited Content, Refunds, Liability, Contact
  - `PrivacyPage` — Data collection, usage, third parties, user rights, cookies
  - `AboutPage` — Mission statement, feature overview, team credits
- `frontend/src/components/Footer.js` — Legal links in bottom bar
- `frontend/src/App.js` — Routes for `/terms`, `/privacy`, `/about`
- `frontend/public/sitemap.xml` — Added legal page URLs

**Key Decisions:**
- Used `neo-card` layout consistent with design DNA on every section
- Email hardcoded as `hello@gitstack.pro` — update to real address before launch
- Terms mention 15% platform fee and escrow auto-release — keep in sync with actual backend policy

**Status:** All tasks completed

---

### Phase 12 — SEO, AEO & GEO Optimization ✅

**Goal:** Systematic SEO audit and improvements to hit 80+ Lighthouse SEO score.

**Already Strong:**
- **Sitemap**: `frontend/public/sitemap.xml` — static + dynamic AI tools pages
- **JSON-LD**: Homepage has `@context` structured data (WebSite, SoftwareApplication)
- **Canonical URLs**: SEO component generates `https://gitstack.pro` canonical
- **Open Graph**: Title, description, image (1200×630), type, site_name on all SEO-wrapped pages
- **Twitter Cards**: `summary_large_image` on all pages
- **Breadcrumbs**: JSON-LD breadcrumb schema on tool/repo detail pages

**Fixes Applied:**
- `frontend/src/pages/ToolDetailPage.js` — Dynamic `<SEO>` with `tool.name` and `description` (was completely missing — critical for long-tail search)
- `CollectionDetailPage.js`, `TopicToolsPage.js`, `ComparisonPage.js`, `RepoOfTheDayPage.js`, `PublicStackPage.js`, `EmbedRepoPage.js` — Added `<SEO>` with targeted keywords:
  - Collections: `{title} — Open Source Tool Collection`
  - Topics: `{name} — Open Source Tools` with tool count + self-hosted alternatives keywords
  - Comparison: `{t1} vs {t2} — Open Source Tool Comparison` with pricing/setup/founder keywords
  - Repo of the Day: `Repo of the Day — {repo.name}` with daily discovery keywords
  - Public Stack: `{idea} — Tech Stack` with tool names and open-source stack keywords
  - Embed: `{owner}/{repo} — AI Summary` with embed/README keywords
- `frontend/public/sitemap.xml` — Added `/about`, `/terms`, `/privacy`, `/readme-badge`
- `backend/.env` — Fixed `PORT=8000` to match frontend expectations

**Remaining Gaps (lower priority):**
- No SSR — crawlers may not see client-rendered meta; consider Next.js or prerender.io
- No `robots.txt` reference needed (already exists and is correct)
- No Core Web Vitals optimization yet (LCP, CLS)
- No hreflang tags (single-language site)

**Status:** High-impact pages done; 80+ score achievable with SSR or prerender.io

---

## 5. Database Schema

### 5.1 Collections Overview

| Collection | Documents | Indexes | TTL |
|------------|-----------|---------|-----|
| `tools` | 200+ curated | tool_id (unique), category, tags | None |
| `github_repos` | 10,000+ scraped | repo_id, topics, tier, score | None |
| `topics` | 50+ categories | topic_id (unique) | None |
| `collections` | 20+ curated | collection_id (unique) | None |
| `users` | User profiles | user_id (unique), email (unique) | None |
| `user_sessions` | Active sessions | session_token (unique) | 7 days |
| `user_stacks` | Saved/generated | stack_id (unique), is_public | None |
| `user_activity` | Activity events | user_id + created_at | 90 days |
| `trending_cache` | GitHub cache | _id | 6 hours |
| `repo_translations` | AI summaries | repo_id (unique) | 7 days |
| `marketplace_sellers` | Seller profiles | seller_user_id (unique) | None |
| `marketplace_products` | Product listings | product_id (unique), seller, published | None |
| `marketplace_purchases` | Transactions | purchase_id, buyer, razorpay_order_id (sparse) | None |
| `setup_requests` | Setup jobs | seller + status, auto_release_at | None |
| `product_reviews` | Reviews | product_id + buyer (unique) | None |
| `seller_wallets` | Wallet balances | seller_user_id (unique) | None |
| `wallet_transactions` | Transaction log | seller_user_id + created_at | None |
| `newsletter_subscribers` | Emails | email (unique), status | None |
| `repo_of_the_day` | Daily feature | date (unique) | None |

### 5.2 Key Indexes

```python
# Startup index creation (server.py)
await db.tools.create_index("tool_id", unique=True)
await db.tools.create_index("category")
await db.tools.create_index("tags")
await db.github_repos.create_index("repo_id", unique=True)
await db.github_repos.create_index("topics")
await db.github_repos.create_index("score")
await db.users.create_index("user_id", unique=True)
await db.user_sessions.create_index("session_token", unique=True)
await db.user_sessions.create_index("expires_at", expireAfterSeconds=7*24*3600)
await db.user_activity.create_index("created_at", expireAfterSeconds=90*24*3600)
await db.marketplace_products.create_index("product_id", unique=True)
await db.marketplace_purchases.create_index("razorpay_order_id", unique=True, sparse=True)
```

---

## 6. API Reference

### 6.1 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/sync` | Bearer | Sync Clerk user to backend |
| GET | `/api/auth/me` | Required | Get current user |
| POST | `/api/auth/logout` | Required | Clear session |

### 6.2 Discovery

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tools` | - | List/filter tools |
| GET | `/api/tools/{tool_id}` | - | Get tool details |
| GET | `/api/tools/trending/list` | - | Trending repos |
| GET | `/api/topics` | - | All categories |
| GET | `/api/topics/{topic_id}/tools` | - | Tools by topic |
| GET | `/api/collections` | - | Curated collections |
| GET | `/api/collections/{collection_id}` | - | Collection details |
| GET | `/api/search/autocomplete` | - | Search suggestions |
| POST | `/api/search` | - | Full-text search |

### 6.3 AI Features (Rate Limited)

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| POST | `/api/ai/dead-tool-detector` | 10/min | Find OSS alternatives |
| POST | `/api/ai/stack-generator` | 10/min | Generate tech stack |
| POST | `/api/ai/repo-translator` | 10/min | Explain GitHub repo |
| POST | `/api/ai/error-explainer` | 15/min | Explain errors |
| POST | `/api/ai/roast-my-stack` | 10/min | Critique stack |
| POST | `/api/ai/idea-exists` | 10/min | Find similar projects |
| POST | `/api/ai/compare` | 10/min | Compare two tools |
| GET | `/api/ai/translate-repo/{owner}/{repo}` | 10/min | Cached translation |

### 6.4 Stacks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/my-stacks` | Required | User's stacks |
| POST | `/api/my-stacks` | Required | Save stack |
| GET | `/api/stacks/public` | - | Community stacks |
| GET | `/api/stacks/featured` | - | Famous stacks |
| GET | `/api/stacks/{stack_id}` | - | Get stack |
| POST | `/api/stacks/{stack_id}/copy` | - | Copy count |
| POST | `/api/stacks/publish` | - | Publish anonymously |
| POST | `/api/stacks/email-me` | - | Email reminder |

### 6.5 Marketplace

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/marketplace/sellers/onboard` | Required | Become seller |
| GET | `/marketplace/sellers/me` | Required | Seller profile |
| POST | `/marketplace/products` | Required | Create product |
| GET | `/marketplace/products` | - | List products |
| GET | `/marketplace/products/{id}` | - | Product detail |
| PATCH | `/marketplace/products/{id}` | Required | Update product |
| DELETE | `/marketplace/products/{id}` | Required | Delete product |
| POST | `/marketplace/products/{id}/screenshots` | Required | Upload image |
| POST | `/marketplace/products/{id}/zip` | Required | Upload ZIP |
| PATCH | `/marketplace/products/{id}/publish` | Required | Toggle publish |
| POST | `/marketplace/orders` | Required | Create order |
| POST | `/marketplace/verify-payment` | Required | Verify payment |
| POST | `/marketplace/webhook/razorpay` | - | Webhook handler |
| GET | `/marketplace/download/{purchase_id}` | Required | Get signed URL |
| GET | `/marketplace/my-purchases` | Required | Buyer's purchases |
| GET | `/marketplace/seller/dashboard` | Required | Seller stats |
| POST | `/marketplace/reviews` | Required | Leave review |
| GET | `/marketplace/products/{id}/reviews` | - | Get reviews |

### 6.6 User Profiles

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| PATCH | `/api/users/me` | Required | Update profile |
| GET | `/api/users/{user_id}` | - | Public profile |
| GET | `/api/users/{user_id}/repos` | - | GitHub repos |
| POST | `/api/activity` | Required | Track activity |
| GET | `/api/recommendations` | Required | Personalized tools |

### 6.7 Misc

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/repo-of-the-day` | - | Daily feature |
| GET | `/api/stats` | - | Live counters |
| GET | `/api/health` | - | Health check |
| POST | `/api/newsletter/subscribe` | - | Subscribe |
| GET | `/api/newsletter/count` | - | Subscriber count |

---

## 7. User Flows

### 7.1 Anonymous Visitor Flow

```
HomePage
  ├── Browse Tools → ToolsPage → ToolDetailPage
  ├── Search → Search Results
  ├── Generate Stack → StackGenerator → PublicStackPage (shareable URL)
  ├── Translate Repo → RepoTranslator (paste GitHub URL)
  ├── Dead Tool Detector → DeadToolDetector (enter paid tools)
  ├── View Collections → CollectionsPage → CollectionDetailPage
  └── View Repo of the Day → GitHubRepoPage

GitHubRepoPage (from external link)
  ├── AI Summary (cached 7 days)
  ├── MarketplaceTeaser (if product exists)
  ├── Related Tools
  └── "Sell on Marketplace" CTA
```

### 7.2 Authenticated User Flow

```
Login (Clerk OAuth)
  ├── Dashboard
  │   ├── My Stacks (local + cloud)
  │   └── My Purchases (marketplace downloads)
  ├── User Profile (/u/me)
  │   ├── Edit Profile (bio, skills, website, GitHub)
  │   └── View Public Profile
  └── Seller Onboarding (/sell)
      ├── Complete Profile (payout method)
      ├── Create Product (5-step wizard)
      ├── My Listings (TanStack Table)
      ├── Setup Requests (escrow jobs)
      └── Wallet & Payouts (transactions, withdraw)
```

### 7.3 Marketplace Buyer Flow

```
MarketplacePage
  ├── Browse/Filter/Search products
  ├── View Product → MarketplaceProductPage
  │   ├── Screenshots carousel
  │   ├── AI Summary (if linked to repo)
  │   ├── Reviews (stars + comments)
  │   ├── Seller card (verified badge)
  │   └── "Buy Source" / "Buy + Setup" buttons
  │
  └── Purchase
      ├── Not logged in → Clerk modal
      ├── Create Razorpay Order
      ├── Razorpay Checkout modal
      ├── Verify Payment (backend signature check)
      ├── Redirect with ?purchased=1
      └── Download (5-min signed R2 URL)
          └── Leave Review (if not done)
```

### 7.4 Marketplace Seller Flow

```
Onboarding
  ├── POST /marketplace/sellers/onboard
  ├── Display name, bio, payout method
  └── Auto-create seller_wallets doc

Product Creation
  ├── Step 1: Basic info (title, tagline, category)
  ├── Step 2: Description (markdown editor)
  ├── Step 3: Screenshots (up to 5 images)
  ├── Step 4: ZIP upload (source code)
  ├── Step 5: Pricing & Setup options
  └── Toggle LIVE when ready

Order Management
  ├── Setup Requests tab
  │   ├── pending → in_progress → completed
  │   └── Buyer confirms (or 7-day auto-release)
  └── Wallet tab
      ├── Balance view
      ├── Transaction history
      └── Withdrawal request (manual admin process)
```

### 7.5 Recommendation Flow

```
Activity Tracking
  ├── tool_viewed → POST /api/activity
  ├── repo_viewed → POST /api/activity
  ├── stack_saved → POST /api/activity
  └── topic_visited → POST /api/activity

Recommendation Generation
  ├── Fetch last 30 activities
  ├── Check 2-hour cache
  ├── Query available tools (excluding viewed)
  ├── Gemini prompt with activity context
  ├── Parse numbered recommendations
  ├── Cache results on user doc
  └── Display in RecommendationsSection
```

---

## 8. Frontend Components

### 8.1 Page Structure

```
frontend/src/
├── App.js                    # Router + providers
├── index.css                 # CSS variables + neo-brutalist
├── pages/
│   ├── HomePage.js           # Hero + features + recommendations
│   ├── ToolsPage.js          # Tool directory with filters
│   ├── ToolDetailPage.js     # Tool information
│   ├── GitHubRepoPage.js     # Repo translator + marketplace teaser
│   ├── MarketplacePage.js    # Product grid (virtualized)
│   ├── MarketplaceProductPage.js  # Product detail
│   ├── SellPage.js           # Seller dashboard
│   ├── Dashboard.js          # User dashboard + purchases
│   ├── UserProfilePage.js    # Public profile + edit
│   ├── StackGenerator.js     # AI stack builder
│   ├── DeadToolDetector.js   # OSS alternative finder
│   ├── RepoTranslator.js     # GitHub explainer
│   ├── RepoXrayPage.js       # Standalone X-Ray landing page
│   ├── ErrorExplainer.js     # AI error explanation
│   ├── IdeaExists.js         # Similar project finder
│   ├── RoastMyStack.js       # AI stack critique
│   ├── ComparisonPage.js     # Tool comparison (vs mode)
│   ├── CollectionsPage.js    # Curated collections browser
│   ├── CollectionDetailPage.js  # Collection detail view
│   ├── TopicToolsPage.js     # Tools by topic/category
│   ├── PublicStackPage.js    # Shareable stack URLs
│   ├── StackGenerator.js     # AI stack builder (with draft persistence)
│   ├── RepoOfTheDayPage.js   # Daily featured repo
│   ├── AlternativesPage.js   # SEO alternatives landing
│   ├── EmbedRepoPage.js      # Embeddable widget
│   ├── ReadmeBadgePage.js    # README Badge Action landing
│   ├── LegalPage.js          # Terms, Privacy, About shell
│   ├── NotFound.js           # 404 page
│   ├── UserProfilePage.js    # Public user profiles
│   ├── FounderStacks.js      # Famous founder stacks
│   └── Dashboard.js          # Buyer + seller dashboard
├── components/
│   ├── Header.js             # Nav + auth + theme toggle + UserMenu
│   ├── Footer.js             # Legal links, navigation, social
│   ├── UserMenu.js           # Logged-in user dropdown
│   ├── AuthCallback.js       # OAuth callback handler
│   ├── RequireAuth.js        # Route guard
│   ├── SEO.js                # react-helmet-async meta tags
│   ├── Breadcrumbs.js        # JSON-LD breadcrumb navigation
│   ├── ThemeToggle.js        # Dark/light switch
│   ├── marketplace/
│   │   ├── ProductCard.jsx
│   │   ├── VirtualProductGrid.jsx
│   │   ├── CreateProductWizard.jsx
│   │   ├── MyListingsTab.jsx
│   │   ├── SetupRequestsTab.jsx
│   │   ├── WalletTab.jsx
│   │   ├── ReviewsSection.jsx
│   │   └── MarketplaceTeaser.jsx
│   ├── sections/
│   │   ├── RecommendationsSection.js
│   │   ├── Hero.js           # Dual-mode search (URL vs idea)
│   │   ├── NewsletterSignup.js
│   │   └── [homepage sections]
│   └── ui/                   # 40+ shadcn components
├── context/
│   └── AuthContext.js         # Clerk auth state
├── stores/
│   └── wizardStore.js         # Zustand for product wizard
└── utils/
    ├── api.js                 # API base URL
    ├── localStacks.js         # localStorage helpers
    └── sanitize.js            # XSS protection
```

### 8.2 Component Patterns

**Neo-Brutalist Design System:**
```jsx
// Cards
<div className="neo-card p-6">
  <h2 className="font-black uppercase">Title</h2>
</div>

// Buttons
<button className="neo-btn neo-btn-primary">
  Primary Action
</button>
<button className="neo-btn neo-btn-secondary">
  Secondary
</button>

// Inputs
<input className="neo-input" placeholder="Type here..." />

// All use CSS variables for dark mode
// Borders: 2px-4px solid black
// Shadows: 4px 4px 0px 0px (hard offset)
```

---

## 9. Authentication & Security

### 9.1 Auth Flow

```
1. User clicks Login
2. Clerk opens OAuth modal (Google/GitHub/etc.)
3. User authenticates with provider
4. Clerk redirects with session token
5. Frontend calls POST /api/auth/sync (Bearer token)
6. Backend verifies JWT with Clerk SDK
7. Backend creates/updates user record
8. Clerk SDK maintains session automatically
9. Axios interceptor attaches JWT to API calls
```

### 9.2 Security Measures

| Layer | Implementation |
|-------|---------------|
| Auth | Clerk JWT + session management |
| API Security | Rate limiting (SlowAPI) |
| XSS | DOMPurify on all user content |
| CORS | Whitelist origins only |
| Input Validation | Pydantic on all endpoints |
| File Uploads | Size limits, type validation |
| Payments | Razorpay signature verification |
| Database | Never expose `_id`, project `{"_id": 0}` |

### 9.3 Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| AI endpoints | 10-15 req/min per IP |
| Search | 20 req/min |
| Marketplace | 60 req/min |
| Activity tracking | 60 req/min |
| Recommendations | 10 req/min |

---

## 10. Deployment Configuration

### 10.1 Render.yaml

```yaml
services:
  # Backend API Service
  - type: web
    name: gitstack-api
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
      - key: MONGO_URL
        sync: false
      - key: NVIDIA_NIM_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: RAZORPAY_KEY_ID
        sync: false
      - key: RAZORPAY_KEY_SECRET
        sync: false

  # Frontend Static Site
  - type: static
    name: gitstack-app
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    envVars:
      - key: REACT_APP_BACKEND_URL
        value: https://gitstack-api.onrender.com
```

### 10.2 Build Process

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port $PORT
```

**Frontend:**
```bash
cd frontend
npm install
npm run build  # Creates production build/
```

---

## 11. Environment Variables

### 11.1 Backend (.env)

```bash
# Database
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/gitstack
DB_NAME=gitstack

# AI
NVIDIA_NIM_API_KEY=nvapi-your_nvidia_key_here
GROQ_API_KEY=gsk-your_groq_key_here

# GitHub
GITHUB_TOKEN=ghp_your_token

# Auth (Clerk)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
PLATFORM_FEE_PERCENT=15

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# File Storage (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=gitstack-marketplace
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Cache
REDIS_URL=redis://localhost:6379  # Optional, falls back to in-memory

# Misc
CORS_ORIGINS=https://gitstack.pro,https://www.gitstack.pro
FRONTEND_URL=https://gitstack.pro
NTFY_TOPIC=gitstack-alerts
```

### 11.2 Frontend (.env)

```bash
# API
REACT_APP_BACKEND_URL=https://gitstack-api.onrender.com

# Auth
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## 12. Development Guidelines

### 12.1 Backend Patterns

```python
# 1. Use async/await everywhere
async def get_tool(tool_id: str):
    tool = await db.tools.find_one({"tool_id": tool_id}, {"_id": 0})
    return tool

# 2. Validate with Pydantic
class CreateProductRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    price_cents: int = Field(..., ge=100, le=1000000)

# 3. Rate limit expensive endpoints
@api_router.post("/ai/generate")
@limiter.limit("10/minute")
async def generate(request: Request):
    ...

# 4. Check auth with dependency
async def require_auth(request: Request) -> UserModel:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

# 5. Never expose MongoDB _id
return await db.tools.find_one({"_id": 0})  # Always project _id: 0
```

### 12.2 Frontend Patterns

```jsx
// 1. Use API base URL
import { API } from '../utils/api';
const res = await axios.get(`${API}/tools`);

// 2. Auth calls need credentials
const res = await axios.get(`${API}/auth/me`, { withCredentials: true });

// 3. Use neo-brutalist classes
<button className="neo-btn neo-btn-primary">Click</button>

// 4. Sanitize user content
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />

// 5. Use CSS variables for colors
<div className="bg-background text-foreground">
  {/* Works in both light and dark mode */}
</div>
```

### 12.3 Testing

```bash
# Backend tests (mongomock)
cd backend
pytest tests/test_marketplace_mongomock.py

# Frontend build check
cd frontend
npm run build

# Linting
npm run lint
```

---

## Appendix A: File Manifest

### Key Backend Files
- `backend/server.py` — Main application (4,000+ lines)
- `backend/github_scraper.py` — Background scraper
- `backend/app.py` — Uvicorn entry point
- `backend/.env` — Environment variables (PORT=8000, API keys, DB URLs)
- `backend/requirements.txt` — Dependencies
- `backend/utils/email.py` — Email utilities
- `backend/scripts/seed_marketplace_dev.py` — Dev data seeder
- `backend/tests/test_marketplace_mongomock.py` — Unit tests

### Key Frontend Files
- `frontend/src/App.js` — Router and providers (28+ routes)
- `frontend/src/index.css` — Design system (neo-brutalist CSS variables)
- `frontend/src/context/AuthContext.js` — Clerk authentication + JWT interceptor
- `frontend/src/components/Header.js` — Navigation + UserMenu + theme toggle
- `frontend/src/components/Footer.js` — Navigation + legal links + social
- `frontend/src/components/UserMenu.js` — Logged-in user dropdown
- `frontend/src/components/SEO.js` — react-helmet-async meta tag wrapper
- `frontend/src/components/Breadcrumbs.js` — JSON-LD breadcrumb navigation
- `frontend/src/components/RequireAuth.js` — Route guard with Clerk modal
- `frontend/src/pages/` — 28 page components (Phases 0-12)
- `frontend/src/components/marketplace/` — 8 marketplace components
- `frontend/src/components/sections/` — Homepage sections (Hero, Newsletter, etc.)
- `frontend/src/stores/wizardStore.js` — Zustand for product creation wizard
- `frontend/public/sitemap.xml` — SEO sitemap
- `frontend/public/robots.txt` — Crawler directives
- `frontend/public/xray.html` — Rebranded CodeFlow X-Ray viewer

### GitHub Action (README Badge)
- `actions/readme-badge/action.yml` — GitHub Action metadata
- `actions/readme-badge/index.js` — Core badge injection logic
- `actions/readme-badge/dist/index.js` — Bundled via `@vercel/ncc` (589KB)
- `actions/readme-badge/README.md` — Marketplace documentation
- `actions/readme-badge/PUBLISH.md` — Step-by-step publish guide
- `.github/workflows/gitstack-badge.yml` — Example workflow

### MCP Server
- `mcp/package.json` — NPM package config
- `mcp/src/index.ts` — MCP server entry
- `mcp/src/api.ts` — GitStack API client
- `mcp/README.md` — Installation guide

---

## Appendix B: Performance Considerations

| Feature | Optimization |
|---------|-------------|
| Tool Lists | MongoDB projection `{"_id": 0}` |
| Trending | 6-hour cache in `trending_cache` |
| Repo Translations | 7-day TTL cache |
| Recommendations | 2-hour user cache |
| Product Images | Cloudflare R2 + CDN |
| Marketplace Grid | `react-window` virtualization |
| Tables | TanStack Table pagination |

---

## Appendix C: Third-Party Integrations

| Service | Purpose |
|---------|---------|
| Clerk | Authentication |
| Google Gemini | AI content generation |
| Razorpay | Payment processing |
| Cloudflare R2 | File storage |
| MongoDB Atlas | Database |
| Redis | Caching (optional) |
| GitHub API | Repo metadata |
| SMTP | Email notifications |
| shields.io | Badge generation (README Badge Action) |
| Vercel ncc | Action bundling (`@vercel/ncc`) |

---

## Appendix D: SEO Keyword Strategy

### Target Keywords by Page

| Page | Title Template | Description Keywords |
|------|---------------|----------------------|
| Home | `GitStack — Free Tools for Founders, No Code Needed` | open source tools, non-technical founders, self-hosted alternatives |
| Tool Detail | `{name} — {category} Tool` | open source, self-hosted, free alternative, GitHub, setup guide |
| Topic | `{name} — Open Source Tools` | self-hosted alternatives, free for founders, curated, setup guides |
| Collection | `{title} — Open Source Tool Collection` | curated tools, free alternatives, founder toolkit |
| Comparison | `{t1} vs {t2} — Open Source Tool Comparison` | pricing, setup time, founder-friendliness, self-hosting difficulty |
| Repo Translator | `{owner}/{repo} — Explained in Plain English` | GitHub repo explained, plain English, architecture, open source |
| Repo of the Day | `Repo of the Day — {name}` | daily open source project, GitHub spotlight |
| Stack | `{idea} — Tech Stack` | open-source tech stack, free tools, non-technical founders |
| Marketplace | `Indie Dev Tools Marketplace — GitStack` | buy source code, indie tools, setup services |
| Badge | `GitStack README Badge — GitHub Action` | auto-inject badges, shields.io, open source marketing |
| Legal | `Terms of Service / Privacy Policy / About — GitStack` | — |

### AEO/GEO Signals
- All pages include `<SEO>` component with canonical URLs
- Sitemap.xml submitted to search engines via `robots.txt`
- JSON-LD structured data on homepage (WebSite, SoftwareApplication)
- Breadcrumbs with JSON-LD on detail pages
- Open Graph images (1200×630) on all social-share pages
- `next-themes` attribute="class" for crawler-readable content

---

*End of Complete Documentation*
