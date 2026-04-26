# Gitstack — Global Agent Context

Read this file before opening any phase file. It provides the full codebase context every agent needs.

---

## What is Gitstack?

Gitstack (`gitstack.dev`) is a two-tier web app that curates open-source GitHub tools and explains them in plain English for non-technical founders. It consists of a Python/FastAPI backend and a React SPA, deployed on Render.com.

---

## Repo Structure

```
/
├── backend/
│   ├── server.py          ← ALL FastAPI routes, Pydantic models, AI helpers, scraper loop
│   ├── github_scraper.py  ← Background scraper (runs every 6 h inside FastAPI process)
│   ├── app.py             ← Uvicorn entry point
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.js                  ← BrowserRouter + all Route definitions
│       ├── index.css               ← CSS custom properties (:root) + global styles
│       ├── App.css                 ← Additional global styles
│       ├── pages/                  ← One component per route (flat, no nesting)
│       ├── components/
│       │   ├── Header.js           ← Sticky nav, desktop + mobile
│       │   ├── Footer.js
│       │   ├── SEO.js              ← react-helmet-async wrapper for og: tags
│       │   ├── AuthCallback.js     ← Handles OAuth hash redirect, calls /api/auth/session
│       │   ├── sections/           ← Homepage section components
│       │   └── ui/                 ← Full shadcn/ui component library (~40 components)
│       ├── context/
│       │   └── AuthContext.js      ← Auth state (currently a guest-only stub)
│       ├── hooks/use-toast.js
│       ├── utils/
│       │   ├── api.js              ← exports API = `${REACT_APP_BACKEND_URL}/api`
│       │   ├── localStacks.js      ← localStorage helpers for saved stacks
│       │   └── sanitize.js
│       └── lib/utils.js            ← cn() Tailwind class merge helper
├── render.yaml                     ← Defines two Render.com services
└── agent_instructions/             ← This folder
```

---

## Tech Stack

### Backend
| Concern | Choice |
|---------|--------|
| Framework | FastAPI + Uvicorn |
| DB driver | Motor (async MongoDB) |
| DB | MongoDB Atlas (`gitstack` database) |
| AI | Google Gemini (fallback chain: `gemini-2.0-flash` → `gemini-1.5-flash` → `gemini-pro` → …) |
| Rate limiting | SlowAPI (10–15 req/min per IP on AI endpoints) |
| Validation | Pydantic v2 with `Field(min_length, max_length)` on every API boundary |
| Background | `_scraper_loop()` runs in-process every 6 h |

### Frontend
| Concern | Choice |
|---------|--------|
| Framework | React 19 |
| Routing | React Router v7 |
| Build | CRACO (custom Webpack) |
| Styling | Tailwind CSS v3 — `darkMode: ["class"]` already configured |
| Components | Radix UI + shadcn/ui patterns |
| Animation | Framer Motion |
| HTTP client | Axios (base URL from `REACT_APP_BACKEND_URL` env) |
| Markdown | `marked` + `DOMPurify` (XSS-safe) |
| Toast | `sonner` |
| Theme | `next-themes ^0.4.6` installed, NOT yet wired to a ThemeProvider |
| Icons | `lucide-react ^0.507.0` |

---

## Existing MongoDB Collections

| Collection | Content |
|------------|---------|
| `tools` | Hand-curated tool records |
| `github_repos` | Scraped GitHub trending repos |
| `topics` | Topic/category records |
| `collections` | Curated tool collections |
| `stacks` | Published community stacks |
| `users` | User profiles (user_id, email, name, picture, created_at) |
| `user_sessions` | HttpOnly session tokens (7-day TTL) |
| `subscribers` | Newsletter emails |
| `trending_cache` | 6-h TTL trending snapshot |
| `repo_translations` | AI translations (7-day TTL) |
| `repo_of_the_day` | Daily featured repo cache |

---

## All Existing Routes

### Backend (`backend/server.py`)

**Auth**
- `POST /api/auth/session` — exchange `session_id` from Emergent OAuth → HttpOnly cookie
- `GET /api/auth/me` — return current user (auth required)
- `POST /api/auth/logout` — delete session cookie + DB record

**Tools & Discovery**
- `GET /api/tools` — list/filter/search curated tools + github_repos fallback
- `GET /api/tools/{tool_id}`
- `GET /api/tools/trending/list`
- `GET /api/topics`
- `GET /api/topics/{topic_id}/tools`
- `GET /api/collections`
- `GET /api/collections/{collection_id}`
- `GET /api/search/autocomplete`
- `POST /api/search`

**AI (rate-limited 10–15 req/min per IP)**
- `POST /api/ai/dead-tool-detector`
- `POST /api/ai/stack-generator`
- `POST /api/ai/repo-translator`
- `POST /api/ai/error-explainer`
- `POST /api/ai/roast-my-stack`
- `POST /api/ai/idea-exists`
- `POST /api/ai/compare`
- `GET /api/ai/translate-repo/{owner}/{repo}` — cached translation

**Stacks**
- `GET /api/my-stacks` (auth)
- `POST /api/my-stacks` (auth)
- `GET /api/stacks/public`
- `GET /api/stacks/featured`
- `GET /api/stacks/{stack_id}`
- `POST /api/stacks/{stack_id}/copy`
- `POST /api/stacks/publish`
- `POST /api/stacks/email-me`

**Misc**
- `GET /api/repo-of-the-day`
- `POST /api/newsletter/subscribe`
- `GET /api/newsletter/count`
- `GET /api/stats`
- `GET /api/health`

### Frontend (`frontend/src/App.js`)

| Path | Component |
|------|-----------|
| `/` | `HomePage` |
| `/dead-tool-detector` | `DeadToolDetector` |
| `/stack-generator` | `StackGenerator` |
| `/roast-my-stack` | `RoastMyStack` |
| `/repo-translator` | `RepoTranslator` |
| `/idea-exists` | `IdeaExists` |
| `/founder-stacks` | `FounderStacks` |
| `/error-explainer` | `ErrorExplainer` |
| `/tools` | `ToolsPage` |
| `/tools/:toolId` | `ToolDetailPage` |
| `/repo/:owner/:repo` | `GitHubRepoPage` |
| `/repo-of-the-day` | `RepoOfTheDayPage` |
| `/compare` | `ComparisonPage` |
| `/collections` | `CollectionsPage` |
| `/collections/:collectionId` | `CollectionDetailPage` |
| `/topics/:topicId` | `TopicToolsPage` |
| `/dashboard` | `Dashboard` |
| `/s/:slug` | `PublicStackPage` |
| `*` | `NotFound` |

---

## Key Existing Code Patterns

### Auth helper (backend)
```python
async def get_current_user(request: Request) -> Optional[UserModel]:
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    if not session_token:
        return None
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session or session["expires_at"] < datetime.now(timezone.utc):
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return UserModel(**user) if user else None
```

### API call pattern (frontend)
```js
// All API calls use the exported API base URL:
import { API } from '../utils/api';
// API = `${process.env.REACT_APP_BACKEND_URL}/api`

const res = await axios.get(`${API}/tools`, { withCredentials: true });
```

### Auth context (currently a stub — Phase 0 replaces this)
```js
// frontend/src/context/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user] = useState(null);
  const login = () => console.log("Login disabled");
  const logout = () => console.log("Logout disabled");
  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, checkAuth: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### SEO component usage
```jsx
// Already used on most pages — just pass props:
<SEO
  title="Page Title — GitStack"
  description="..."
  image="https://..." // optional, for og:image
/>
```

### Markdown rendering (used in RepoTranslator.js)
```js
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const html = DOMPurify.sanitize(marked.parse(markdownString));
// Then render: <div dangerouslySetInnerHTML={{ __html: html }} />
```

### CSS variables (frontend/src/index.css)
```css
:root {
  --background: #FFFFFF;
  --foreground: #0A0A0A;
  --primary: #2563EB;
  --danger: #EF4444;
  --success: #10B981;
  --warning: #F59E0B;
  --pastel-mint: #A7F3D0;
  --pastel-yellow: #FEF08A;
  --pastel-lavender: #E9D5FF;
  --pastel-pink: #FBCFE8;
}
```
Note: `tailwind.config.js` also defines HSL-based CSS variables (`--background`, `--foreground`, etc.) used by shadcn/ui — check that file for the full list before overriding.

### Neo-brutalist design system
The app uses a neo-brutalist design: thick black borders (`border-4 border-black`), offset box shadows (`.neo-shadow` = `box-shadow: 4px 4px 0px 0px rgba(9,9,11,1)`), bold typography (`Bricolage Grotesque` for headings, `DM Sans` for body).

---

## Environment Variables

### Backend (Render — `gitstack-api` service)
| Variable | Purpose |
|----------|---------|
| `MONGO_URL` | MongoDB Atlas connection string |
| `DB_NAME` | `gitstack` |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GITHUB_TOKEN` | GitHub API token |
| `CORS_ORIGINS` | Frontend URL |
| `NTFY_TOPIC` | ntfy.sh alerts topic |

### Frontend (Render — `gitstack-app` service, build-time)
| Variable | Purpose |
|----------|---------|
| `REACT_APP_BACKEND_URL` | API service base URL |

---

## Deployment

Two services defined in `render.yaml`:
- **`gitstack-api`** — Python web service, rootDir: `backend/`, starts with `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **`gitstack-app`** — Static site, rootDir: `frontend/`, build: `npm install && npm run build`, serves `build/`, catch-all rewrite `/* → /index.html`

---

## Phase Dependency Map

```
Phase 0 (auth re-enable)
   ├── Phase 3 (marketplace backend)
   │       └── Phase 4 (marketplace frontend)
   ├── Phase 6 (personalized recommendations)
   └── Phase 7 (user profile page)

Phase 1 (dark/light mode)    ← fully independent
Phase 2 (gitstack.pro URLs)  ← fully independent
Phase 5 (MCP server)         ← fully independent
```

**Phases that can start immediately (no blockers):** 1, 2, 5
**Phases that require Phase 0 first:** 3, 6, 7
**Phase that requires Phase 3 first:** 4

---

## Coding Conventions

- **Backend**: All new endpoints go in `backend/server.py`. Follow existing patterns: `async def`, Motor for all DB I/O, Pydantic models for request/response, `get_current_user()` for auth checks, SlowAPI `@limiter.limit()` on AI/expensive endpoints.
- **Frontend**: New pages go in `frontend/src/pages/`. New shared components go in `frontend/src/components/`. New UI primitives go in `frontend/src/components/ui/`. Import `{ API }` from `../utils/api` for all backend calls. Use `axios` with `{ withCredentials: true }` on authenticated calls.
- **Styling**: Use Tailwind classes. Follow neo-brutalist pattern for interactive surfaces. Avoid inline styles. Do not add hardcoded color values — use CSS custom properties via Tailwind (`bg-background`, `text-foreground`, etc.) so dark mode works automatically.
- **Security**: Validate all inputs at API boundaries with Pydantic `Field`. Use `DOMPurify.sanitize()` before any `dangerouslySetInnerHTML`. Never expose `_id` from MongoDB — always project `{"_id": 0}`.
