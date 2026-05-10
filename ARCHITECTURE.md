# Architecture

## Overview

GitStack (`gitstack.pro`) is a two-tier web application that curates open-source GitHub tools and explains them in plain English for non-technical founders. The system consists of a Python/FastAPI backend and a React single-page application, deployed as two separate services on Render.com.

---

## High-Level Structure

```
┌─────────────────────────────────────────────────┐
│                  React SPA (frontend/)           │
│          React Router · Axios · Tailwind         │
└───────────────────┬─────────────────────────────┘
                    │ HTTP / REST  (REACT_APP_BACKEND_URL)
┌───────────────────▼─────────────────────────────┐
│              FastAPI API (backend/)              │
│         Uvicorn · SlowAPI · Motor (async)        │
├────────────────┬────────────────────────────────┤
│  MongoDB Atlas │  Google Gemini API  │  GitHub   │
└────────────────┴────────────────────────────────┘
```

---

## Backend (`backend/`)

### Framework & Runtime
- **FastAPI** served by **Uvicorn**
- **Motor** (async MongoDB driver) for all database I/O
- **SlowAPI** for per-IP rate limiting on AI endpoints (10–15 req/min)
- **Pydantic** models with `Field(min_length, max_length)` validation at every API boundary

### Key Files

| File | Responsibility |
|------|----------------|
| `server.py` | All FastAPI routes, Pydantic models, AI helpers, startup logic, scraper loop |
| `github_scraper.py` | Background scraper — fetches GitHub Trending every 6 h, quality-filters repos, runs AI topic discovery |
| `app.py` | Application entry / wiring |

### Database Collections (MongoDB Atlas)

| Collection | Content |
|------------|---------|
| `tools` | Hand-curated tool records |
| `github_repos` | Scraped GitHub trending repos |
| `topics` | Topic/category records with tool counts |
| `collections` | Curated tool collections |
| `stacks` | Published community stacks |
| `sessions` | User auth sessions (7-day TTL) |
| `subscribers` | Newsletter emails |
| Various cache docs | Trending list (6 h), repo translations (7 d), repo-of-the-day (daily) |

### Caching Strategy

All expensive external calls are stored back into MongoDB with a TTL field:

| Data | TTL |
|------|-----|
| GitHub Trending list | 6 hours |
| Topics with counts | 6 hours |
| AI repo translations | 7 days |
| Repo of the Day | Calendar day |

### AI Engine (Google Gemini)

AI features attempt a **fallback chain** of five model variants (`gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-pro` → …) so features degrade gracefully rather than hard-failing.

### Background Task

`_scraper_loop()` runs inside the FastAPI process every **6 hours**, writing scraped repos into `github_repos`. On startup, `seed_database()` runs and a boot alert is sent via **ntfy.sh** (`NTFY_TOPIC=gitstack-alerts`).

### REST API (`/api/*`)

<details>
<summary>Auth</summary>

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/session` | Exchange Emergent OAuth session_id → HttpOnly cookie + DB record |
| `GET` | `/auth/me` | Return current user (auth required) |
| `POST` | `/auth/logout` | Delete session cookie + DB record |

</details>

<details>
<summary>Tools & Discovery</summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tools` | List / filter / search curated tools (+ `github_repos` fallback) |
| `GET` | `/tools/{tool_id}` | Single tool detail |
| `GET` | `/tools/trending/list` | Live GitHub Trending page (cached 6 h) |
| `GET` | `/topics` | All topic categories with live tool counts (cached 6 h) |
| `GET` | `/topics/{topic_id}/tools` | Tools filtered by topic (curated + repos merged) |
| `GET` | `/collections` | Curated collections list |
| `GET` | `/collections/{collection_id}` | Collection detail with embedded tools |
| `GET` | `/search/autocomplete` | Prefix search across tools, repos, categories |
| `POST` | `/search` | AI-powered smart search |

</details>

<details>
<summary>AI Features (rate-limited 10–15 req/min per IP)</summary>

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai/dead-tool-detector` | Free open-source alternatives to a paid SaaS tool |
| `POST` | `/ai/stack-generator` | Recommend 4–6 tools for an idea + budget |
| `POST` | `/ai/repo-translator` | Plain-English explanation of a GitHub repo |
| `POST` | `/ai/error-explainer` | Explain a developer error in plain English |
| `POST` | `/ai/roast-my-stack` | AI critique of a list of tools |
| `POST` | `/ai/idea-exists` | Find similar existing GitHub projects |
| `POST` | `/ai/compare` | Side-by-side comparison of two tools |
| `GET` | `/ai/translate-repo/{owner}/{repo}` | Cached repo translation by owner/repo path |

</details>

<details>
<summary>Stacks</summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/my-stacks` | Authenticated user's saved stacks |
| `POST` | `/my-stacks` | Save a stack (auth required) |
| `GET` | `/stacks/public` | Community stacks sorted by copy count |
| `GET` | `/stacks/featured` | Hardcoded famous open-source project stacks |
| `GET` | `/stacks/{stack_id}` | Single public stack |
| `POST` | `/stacks/{stack_id}/copy` | Increment copy counter |
| `POST` | `/stacks/publish` | Publish anonymously → returns shareable slug |
| `POST` | `/stacks/email-me` | Save email + stack for a "remind me" nudge |

</details>

<details>
<summary>Misc</summary>

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/repo-of-the-day` | Daily featured repo (AI-translated, cached per day) |
| `POST` | `/newsletter/subscribe` | Email subscription |
| `GET` | `/newsletter/count` | Subscriber count for social proof |
| `GET` | `/stats` | Live counters (stacks generated, repos translated, etc.) |
| `GET` | `/api/health` | Render health probe |

</details>

---

## Frontend (`frontend/`)

### Framework & Libraries

| Concern | Library |
|---------|---------|
| UI framework | React 19 |
| Routing | React Router v7 |
| Build tooling | CRACO (custom Webpack) |
| Styling | Tailwind CSS v3 |
| Component primitives | Radix UI + shadcn/ui patterns |
| Animation | Framer Motion |
| HTTP client | Axios (`src/utils/api.js` — reads `REACT_APP_BACKEND_URL`) |
| Markdown rendering | Marked + DOMPurify (XSS-safe) |

### Directory Layout

```
frontend/src/
├── App.js                  # Router + all route definitions
├── pages/                  # One component per route
├── components/
│   ├── sections/           # Homepage section components (Hero, Trending, …)
│   ├── ui/                 # Full shadcn/ui component library (~40 components)
│   ├── Header.js
│   ├── Footer.js
│   ├── SEO.js
│   └── AuthCallback.js
├── context/
│   └── AuthContext.js      # Auth stub (currently guest-only)
├── hooks/
│   └── use-toast.js
├── utils/
│   ├── api.js              # Exports Axios base URL from env
│   ├── localStacks.js      # localStorage persistence for saved stacks
│   └── sanitize.js
└── lib/
    └── utils.js            # Tailwind class merge helper (cn)
```

### Routes

| Path | Page | Description |
|------|------|-------------|
| `/` | `HomePage` | Landing — Hero, Viral Features, Trending, Topics grid |
| `/tools` | `ToolsPage` | Browse / search all curated tools |
| `/tools/:toolId` | `ToolDetailPage` | Single tool deep-dive |
| `/repo/:owner/:repo` | `GitHubRepoPage` | GitHub repo detail + AI translation |
| `/repo-of-the-day` | `RepoOfTheDayPage` | Daily featured repo |
| `/dead-tool-detector` | `DeadToolDetector` | Find free alternatives to paid SaaS |
| `/stack-generator` | `StackGenerator` | Multi-step AI stack builder |
| `/roast-my-stack` | `RoastMyStack` | AI critique of a tool list |
| `/repo-translator` | `RepoTranslator` | Plain-English repo explainer |
| `/idea-exists` | `IdeaExists` | Find similar existing projects |
| `/compare` | `ComparisonPage` | Side-by-side tool comparison |
| `/error-explainer` | `ErrorExplainer` | Developer error explainer |
| `/founder-stacks` | `FounderStacks` | Browse community / featured stacks |
| `/collections` | `CollectionsPage` | Curated tool collections |
| `/collections/:id` | `CollectionDetailPage` | Collection detail |
| `/topics/:topicId` | `TopicToolsPage` | All tools for a topic |
| `/dashboard` | `Dashboard` | User's locally-saved stacks (localStorage) |
| `/s/:slug` | `PublicStackPage` | Shared public stack via URL slug |

### Authentication State

The `AuthContext` is currently a **guest-only stub** — `user` is always `null` and `login()`/`logout()` only log to the console. Full auth infrastructure exists on the backend (Emergent OAuth, HttpOnly session cookies, 7-day TTL), but is intentionally disabled on the frontend. The `/dashboard` page operates entirely off `localStorage` with no server auth required.

---

## Data Flow

### Typical AI Feature Request

```
User fills form (e.g. Stack Generator)
        │
        ▼
React page  ──── POST /api/ai/stack-generator ────►  FastAPI route
                                                            │
                                                     validate with Pydantic
                                                            │
                                                     call Gemini API
                                                     (fallback chain)
                                                            │
                                                     return JSON array
        ◄──────────────────────────────────────────────────┘
React renders tool cards
```

### Tool Discovery Flow

```
User visits /tools
        │
        ▼
GET /api/tools
        │
        ├── MongoDB `tools` (curated)
        └── MongoDB `github_repos` (scraped)
                merged + deduplicated
        ◄─────────────────────────────
React renders merged list
```

### Background Scraper

```
Every 6 hours (inside FastAPI process)
        │
        ▼
Fetch github.com/trending  (httpx + BeautifulSoup4)
        │
        ▼
Quality filter (stars, activity, description length)
        │
        ▼
Gemini: classify topic + generate plain-English summary
        │
        ▼
Upsert into MongoDB `github_repos`
```

---

## Deployment

Two services on **Render.com**, defined in [render.yaml](render.yaml):

| Service | Type | Start Command |
|---------|------|---------------|
| `gitstack-api` | Python web service | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| `gitstack-app` | Static site | `npm install && npm run build` → serves `build/` |

The static site uses a catch-all rewrite (`/*` → `/index.html`) for client-side routing. The environment variable `REACT_APP_BACKEND_URL` must point to the API service URL.

### Required Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `MONGODB_URL` | API | MongoDB Atlas connection string |
| `GEMINI_API_KEY` | API | Google Gemini API key |
| `GITHUB_TOKEN` | API | GitHub API token (avoids rate limiting) |
| `NTFY_TOPIC` | API | ntfy.sh topic for boot/alert notifications |
| `REACT_APP_BACKEND_URL` | Frontend build | Base URL of the API service |

---

## Key Design Decisions

**Dual data source** — Every tool listing transparently merges the hand-curated `tools` collection with scraped `github_repos`, giving breadth without manual curation overhead.

**Auth-free public stacks** — `POST /stacks/publish` creates shareable `/s/:slug` URLs with zero login friction, maximising virality.

**Local-first dashboard** — Saved stacks live in `localStorage` via `localStacks.js`, so the dashboard works without any backend session.

**Aggressive MongoDB caching** — Trending data, topic counts, repo translations, and the daily repo are all cached in MongoDB so GitHub API rate limits are rarely hit under normal traffic.

**Gemini fallback chain** — Five model variants are tried in sequence, so AI features degrade gracefully rather than returning a hard error when a model is unavailable.

**Input validation at boundaries** — All AI endpoints use Pydantic `Field` constraints (min/max length). GitHub URLs are validated by regex before any external call, preventing prompt injection and SSRF.
