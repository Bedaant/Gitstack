<!-- AGENTS.md — GitStack Project Context for AI Coding Agents -->
<!-- Last updated: 2026-05-29 -->

## Project Overview

**GitStack** (`gitstack.pro`) is a SaaS platform that curates open-source GitHub tools and explains them in plain English for non-technical founders. It is a two-tier web application consisting of a Python/FastAPI backend and a React single-page application, deployed as separate services.

Key product features:
- **Stack Generator** — Multi-step AI tool orchestrator. Build an entire tech stack from a single idea.
- **Comparison Engine** — Side-by-side battle reports (cost, setup, "vibe" analysis).
- **Dead Tool Detector** — Find open-source alternatives to expensive SaaS tools.
- **Repo Translator** — Plain-English explanation of any GitHub repo in ~10 seconds.
- **Roast My Stack** — Brutally honest AI feedback on a list of tools.
- **Your Idea Already Exists** — Find existing engines and blueprints to fork.
- **Repo of the Day** — Daily curated discovery with AI-generated explanation.
- **Marketplace** — Buy and sell code/MCP servers (Razorpay payments, Cloudflare R2 file storage).
- **Repo X-Ray** — Rebranded CodeFlow static app that visualizes codebase architecture from a GitHub URL or local files.

> **4300+ tools indexed** | **12 categories** | **Live GitHub data**

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7, Tailwind CSS v3, Framer Motion, Radix UI primitives |
| Build Tool | CRACO (Create React App Configuration Override) |
| Backend | FastAPI (Python 3.11), Uvicorn, Motor (async MongoDB driver) |
| Database | MongoDB Atlas |
| Caching | fastapi-cache2 (in-memory dev / Redis prod), MongoDB TTL docs |
| AI Engine | Google Gemini (fallback chain across 5 model variants) |
| Auth | Clerk (JWT via JWKS), guest-only mode also supported |
| Payments | Razorpay (India-focused) |
| File Storage | Cloudflare R2 (marketplace artifacts) |
| Scraping | GitHub API + BeautifulSoup4 (background cron every 6 hours) |
| MCP Server | TypeScript/Node.js 18+ with `@modelcontextprotocol/sdk` |
| OG Images | `@vercel/og` (dev dependency) |

---

## Project Structure

```
gitstack/
├── backend/
│   ├── server.py              # FastAPI app — all routes, Pydantic models, AI helpers, scraper loop
│   ├── github_scraper.py      # Background GitHub scraper (trending + search)
│   ├── og_image.py            # OG image generation routes
│   ├── smart_search.py        # Search ranking & autocomplete (if present)
│   ├── app.py                 # Production entry point (uvicorn runner)
│   ├── requirements.txt       # Python dependencies
│   ├── .env / .env.example    # Backend environment variables
│   ├── scripts/
│   │   └── seed_marketplace_dev.py   # Database seeding script
│   ├── tests/
│   │   ├── test_marketplace_mongomock.py   # Marketplace endpoint tests (mongomock)
│   │   └── test_mongomock_basic.py         # Basic DB tests
│   └── utils/
│       └── email.py           # fastapi-mail helpers
│
├── frontend/
│   ├── public/                # Static assets (logo, favicon, xray.html)
│   ├── src/
│   │   ├── App.js             # Router + all route definitions (~65 lines)
│   │   ├── pages/             # One component per route (25+ pages)
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui component library (~40 components)
│   │   │   ├── sections/      # Homepage section components (Hero, Trending, Topics, …)
│   │   │   ├── marketplace/   # Marketplace-specific components
│   │   │   ├── Header.js, Footer.js, SEO.js, AuthCallback.js, …
│   │   ├── context/
│   │   │   └── AuthContext.js # Clerk auth provider + useAuth hook
│   │   ├── hooks/
│   │   │   ├── use-toast.js
│   │   │   └── useRazorpay.js
│   │   ├── stores/
│   │   │   └── wizardStore.js # Zustand store for wizard state
│   │   ├── utils/
│   │   │   ├── api.js         # Axios base URL from env
│   │   │   ├── localStacks.js # localStorage persistence for saved stacks
│   │   │   ├── sanitize.js    # DOMPurify XSS-safe markdown
│   │   │   └── getApiErrorMessage.js
│   │   └── lib/
│   │       └── utils.js       # Tailwind class merge helper (`cn`)
│   ├── package.json
│   ├── craco.config.js        # Webpack alias, ESLint rules, visual-edits plugin
│   ├── tailwind.config.js     # Custom theme (pastel colors, chart palette)
│   ├── vercel.json            # Vercel deployment config (SPA rewrite + security headers)
│   └── .env / .env.example    # Frontend environment variables
│
├── mcp/                       # Model Context Protocol server
│   ├── src/
│   │   ├── index.ts           # MCP server setup (stdio transport)
│   │   └── api.ts             # Axios client to GitStack backend
│   ├── package.json
│   └── tsconfig.json
│
├── xray/                      # Upstream CodeFlow (MIT) — repo visualization
│   ├── index.html             # Source HTML (rebranded by build script)
│   ├── tests/                 # Node.js test suite for xray logic
│   └── card/                  # GitHub Action SVG card generator
│
├── scripts/
│   └── build-xray.js          # Rebrands xray/index.html → frontend/public/xray.html
│
├── actions/
│   └── readme-badge/          # GitHub Action for dynamic README badge
│
├── test_reports/              # Iteration-based integration test summaries (JSON)
├── render.yaml                # Render.com Blueprint (backend + frontend services)
└── .github/workflows/
    └── gitstack-badge.yml     # Workflow that runs the readme-badge action
```

---

## Build and Test Commands

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Run server (development)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Run server (production)
uvicorn server:app --host 0.0.0.0 --port $PORT

# Run tests
pytest backend/tests/
```

### Frontend

```bash
cd frontend

# Install dependencies (project uses yarn)
yarn install

# Start development server
yarn start

# Build for production (also builds xray)
yarn build

# Run tests
yarn test
```

### MCP Server

```bash
cd mcp

# Install dependencies
npm install

# Development (hot reload via tsx)
npm run dev

# Build
npm run build

# Start
npm start
```

### X-Ray Build

```bash
# Rebrand upstream CodeFlow into GitStack's Repo X-Ray
node scripts/build-xray.js
```

This outputs `frontend/public/xray.html`, which is served by the React app at `/xray.html`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name (default: `gitstack`) |
| `NVIDIA_NIM_API_KEY` | Yes | NVIDIA NIM API key (primary AI) |
| `GROQ_API_KEY` | Strongly recommended | Groq API key (fallback AI) |
| `GITHUB_TOKEN` | Strongly recommended | Raises GitHub API rate limit from 60 → 5000 req/hr |
| `CLERK_JWKS_URL` | For auth | Clerk JWKS endpoint |
| `CORS_ORIGINS` | Yes | Allowed origins (`*` for dev, comma-separated for prod) |
| `NTFY_TOPIC` | Optional | ntfy.sh topic for boot/alert notifications |
| `REDIS_URL` | Optional | Redis for fastapi-cache (e.g., `redis://localhost:6379/0`) |
| `RAZORPAY_KEY_ID` | For marketplace | Razorpay test/live key |
| `RAZORPAY_KEY_SECRET` | For marketplace | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | For marketplace | Razorpay webhook secret |
| `PLATFORM_FEE_PERCENT` | For marketplace | Platform fee % (default: `15`) |
| `R2_ACCOUNT_ID` | For marketplace | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | For marketplace | R2 API token key |
| `R2_SECRET_ACCESS_KEY` | For marketplace | R2 API token secret |
| `R2_BUCKET_NAME` | For marketplace | R2 bucket (default: `gitstack-marketplace`) |
| `R2_PUBLIC_URL` | For marketplace | Public URL for R2 screenshots |
| `FRONTEND_URL` | For marketplace | Frontend URL for Razorpay redirects |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` | Optional | fastapi-mail SMTP config |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL (e.g., `http://localhost:8001`) |
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | For auth | Clerk publishable key |

---

## Runtime Architecture

### High-Level Flow

```
┌─────────────────────────────────────────┐
│           React SPA (frontend/)          │
│    React Router · Axios · Tailwind       │
└──────────────────┬──────────────────────┘
                   │ HTTP / REST
┌──────────────────▼──────────────────────┐
│          FastAPI API (backend/)          │
│      Uvicorn · SlowAPI · Motor           │
├────────────┬─────────────┬──────────────┤
│ MongoDB    │ Google      │ GitHub API   │
│ Atlas      │ Gemini      │ + Trending   │
└────────────┴─────────────┴──────────────┘
```

### Background Scraper

`_scraper_loop()` runs inside the FastAPI process every **6 hours**:
1. Fetches `github.com/trending` via `httpx` + `BeautifulSoup4`
2. Quality-filters repos (stars, activity, description length)
3. Classifies topic + generates plain-English summary via Gemini
4. Upserts into MongoDB `github_repos`
5. Cleans up repos older than 30 days

### Caching Strategy

All expensive external calls are cached in MongoDB with TTL:

| Data | TTL |
|------|-----|
| GitHub Trending list | 6 hours |
| Topics with counts | 6 hours |
| AI repo translations | 7 days |
| Repo of the Day | Calendar day |

### AI Engine Fallback Chain

AI endpoints use NVIDIA NIM (Llama 3.3 70B) as primary, with Groq (Llama 3.3 70B) as fallback if NVIDIA is unavailable.

---

## Code Organization and Module Divisions

### Backend (`backend/`)

- **`server.py`** (~190K) — The monolithic backend file containing:
  - FastAPI app initialization, CORS, rate limiter, lifespan manager
  - Pydantic request/response models with `Field(min_length, max_length)` validation
  - All REST API routes (`/api/health`, `/api/tools`, `/api/ai/*`, `/api/auth/*`, `/api/marketplace/*`, etc.)
  - AI helper functions (Gemini prompt construction, response parsing)
  - Background scraper loop and seeding logic
  - Marketplace order/payout/webhook handlers

- **`github_scraper.py`** — Standalone scraper module imported by `server.py`. Handles GitHub Trending page parsing, GitHub API search across 20+ categories, and AI topic discovery.

- **`og_image.py`** — FastAPI router for generating social-share OG images using `@vercel/og` patterns.

- **`utils/email.py`** — SMTP email helpers for marketplace purchase confirmations and payout notifications.

### Frontend (`frontend/src/`)

- **`App.js`** — Thin router file defining all client-side routes.
- **`pages/`** — 25+ page components, one per route. Examples:
  - `HomePage.js`, `ToolsPage.js`, `ToolDetailPage.js`, `GitHubRepoPage.js`
  - `StackGenerator.js`, `DeadToolDetector.js`, `RoastMyStack.js`, `RepoTranslator.js`, `IdeaExists.js`, `ComparisonPage.js`
  - `MarketplacePage.js`, `MarketplaceProductPage.js`, `SellPage.js`
  - `Dashboard.js`, `PublicStackPage.js`, `UserProfilePage.js`
  - `RepoXrayPage.js`, `EmbedRepoPage.js`, `ReadmeBadgePage.js`
- **`components/ui/`** — Reusable shadcn/ui-style components (Button, Card, Dialog, Input, Badge, Accordion, etc. ~40 files).
- **`components/sections/`** — Homepage sections (Hero, ViralFeatures, TrendingSection, TopicsGrid, CommunityStacks, NewsletterSignup, RepoOfTheDay).
- **`components/marketplace/`** — Marketplace-specific components.
- **`context/AuthContext.js`** — Clerk auth provider. Can be stubbed to guest-only.
- **`stores/wizardStore.js`** — Zustand store for multi-step wizard state.
- **`utils/localStacks.js`** — localStorage abstraction for saved stacks (dashboard works without server auth).

### MCP Server (`mcp/`)

- **`src/index.ts`** — MCP server using stdio transport. Exposes tools: `search_tools`, `get_trending_repos`, `find_alternatives`, `translate_repo`, `get_repo_of_day`.
- **`src/api.ts`** — Axios client that calls the GitStack backend REST API.

---

## Testing Strategies

### Backend Tests (`backend/tests/`)

- **Framework**: `pytest` + `mongomock` + `fastapi.testclient.TestClient`
- **Approach**: Motor's async `AsyncIOMotorClient` is patched with `mongomock.MongoClient` before importing `server`. This allows testing without a real MongoDB instance.
- **Cache**: `fastapi-cache` is initialized with `InMemoryBackend` for tests.
- **Fixtures**: `clean_db` drops all collections before each test.
- **Files**:
  - `test_marketplace_mongomock.py` — Tests marketplace endpoints (list products, get product, 404 handling).
  - `test_mongomock_basic.py` — Basic DB connectivity and seed tests.

### Frontend Tests

- Uses `react-scripts test` (Jest + React Testing Library) via `yarn test`.
- No explicit test files were found in `frontend/src/` at the time of writing; the project appears to rely on manual/integration testing.

### Integration Tests

- `backend_test.py` — Standalone Python script that hits a live backend API and reports pass/fail for health, tools, topics, collections, AI endpoints, and auth.
- `test_reports/` — Contains JSON summaries (`iteration_1.json` through `iteration_5.json`) documenting frontend and backend test results across iterations.

### X-Ray Tests (`xray/tests/`)

- Node.js test suite using native `node:test` / `assert` or similar.
- Tests cover markdown extractors, HTML sync, golden-file comparison, repo smoke tests, and brain-vault verification.

---

## Deployment Process

### Primary: Render.com

The repo includes a `render.yaml` Blueprint. Pushing to the connected GitHub repo auto-deploys two services:

| Service | Type | Start Command |
|---------|------|---------------|
| `gitstack-api` | Python web service | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| `gitstack-app` | Static site | `npm install && npm run build` → serves `build/` |

- The static site uses a catch-all rewrite (`/*` → `/index.html`) for client-side routing.
- After the backend deploys, copy its URL into the frontend service's `REACT_APP_BACKEND_URL` env var and redeploy the frontend.

### Alternative: Vercel (Frontend only)

- `vercel.json` configures the build command, output directory, SPA rewrite, and security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).
- Set `REACT_APP_BACKEND_URL` to the backend API URL in Vercel project settings.

### GitHub Actions

- `.github/workflows/gitstack-badge.yml` — On every push to `main`, runs the `actions/readme-badge` action to update a dynamic README badge.

---

## Code Style Guidelines

### JavaScript / React

- **ESLint**: Configured in `craco.config.js` with `plugin:react-hooks/recommended`.
  - `react-hooks/rules-of-hooks`: `error`
  - `react-hooks/exhaustive-deps`: `warn`
- **Import alias**: `@/` maps to `frontend/src/`. Use `import { cn } from "@/lib/utils"` etc.
- **Styling**: Tailwind CSS utility classes. Use the `cn()` helper from `lib/utils.js` for conditional class merging.
- **Component patterns**: Follow shadcn/ui conventions in `components/ui/` — functional components, forwardRef where appropriate, `class-variance-authority` for variants.
- **State**: Zustand for global state (wizard), React Context for auth, `localStorage` for user-saved stacks.

### Python / FastAPI

- **Validation**: Every AI endpoint uses Pydantic `BaseModel` with `Field(min_length=..., max_length=...)` constraints.
- **Rate limiting**: SlowAPI `@limiter.limit("10/minute")` or similar on AI and scraper endpoints.
- **Logging**: `loguru` is used for structured logging. Format: `{time:YYYY-MM-DD at HH:mm:ss!UTC} | {level} | {message}`
- **Async**: All DB I/O uses `motor` (async MongoDB). Do not use synchronous MongoDB drivers in `server.py`.
- **Security**: GitHub URLs are validated by regex before any external call. DOMPurify is used on the frontend for XSS prevention.

### TypeScript / MCP

- Strict TypeScript with `tsconfig.json`.
- Uses ES modules (`"type": "module"`).
- Follows MCP SDK patterns (`Server`, `StdioServerTransport`, `CallToolRequestSchema`).

---

## Security Considerations

- **Input validation at boundaries**: All AI endpoints validate input length and format via Pydantic. GitHub URLs are regex-validated before external calls to prevent SSRF and prompt injection.
- **Rate limiting**: SlowAPI enforces per-IP rate limits (10–15 req/min) on AI endpoints.
- **XSS prevention**: Markdown rendered in the frontend is sanitized with DOMPurify before insertion into the DOM.
- **Auth**: Clerk JWTs are verified via JWKS. Session cookies are HttpOnly. Backend sessions have a 7-day TTL in MongoDB.
- **CORS**: Configured via `CORS_ORIGINS` env var. Do not use `*` in production.
- **Secrets**: Never commit `.env` files. `backend/.env.example` and `frontend/.env.example` document required variables.
- **Payment webhooks**: Razorpay webhooks are verified with HMAC-SHA256 using `RAZORPAY_WEBHOOK_SECRET`.

---

## Key Design Decisions

1. **Dual data source** — Every tool listing transparently merges the hand-curated `tools` collection with scraped `github_repos`, giving breadth without manual curation overhead.
2. **Auth-free public stacks** — `POST /stacks/publish` creates shareable `/s/:slug` URLs with zero login friction.
3. **Local-first dashboard** — Saved stacks live in `localStorage` via `localStacks.js`, so the dashboard works without any backend session.
4. **Aggressive MongoDB caching** — Trending data, topic counts, repo translations, and the daily repo are all cached in MongoDB so GitHub API rate limits are rarely hit.
5. **Gemini fallback chain** — Five model variants are tried in sequence so AI features degrade gracefully.
6. **Monolithic backend** — All backend logic lives in `server.py` and `github_scraper.py` for simplicity given the project's scale. If adding major new domains, consider splitting routers into separate files.

---

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
