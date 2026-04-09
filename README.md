# GitStack — GitHub, Simplified for Founders

> The layer between GitHub tools existing and you actually using them.  
> Discover, understand, and build your idea — without writing code.

![GitStack](frontend/public/logo.svg)

**1100+ tools indexed** | **12 categories** | **AI-powered translations** | **Live GitHub data**

---

## What is GitStack?

GitStack is a SaaS platform that curates open-source GitHub tools and explains them in plain English for non-technical founders. Instead of scrolling through READMEs full of jargon, you get:

- **Stack Generator** — Tell us your idea, get the exact tools you need
- **Dead Tool Detector** — Find free alternatives to paid SaaS (Typeform → Formbricks, Calendly → Cal.com)
- **Repo Translator** — Paste any GitHub URL, understand it in 10 seconds
- **Roast My Stack** — Get brutally honest feedback on your tool choices
- **Your Idea Already Exists** — Find repos to fork instead of building from scratch
- **Repo of the Day** — Daily curated tool with newsletter digest

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS, shadcn/ui |
| Backend | FastAPI (Python), Motor (async MongoDB) |
| Database | MongoDB |
| AI | Google Gemini 3 Flash (via [Emergent Integrations](https://emergentagent.com)) |
| Auth | Google OAuth (Emergent-managed) |
| Scraping | GitHub API + BeautifulSoup (background cron every 6 hours) |

---

## Prerequisites

Before you begin, make sure you have:

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **MongoDB** — [Install locally](https://www.mongodb.com/docs/manual/installation/) or use [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Yarn** — `npm install -g yarn`
- **Emergent LLM Key** (for AI features) — Get one at [emergentagent.com](https://emergentagent.com) → Profile → Universal Key

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/gitstack.git
cd gitstack
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Install Emergent integrations (for AI features)
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### 3. Configure environment variables

Create `/backend/.env`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=gitstack
CORS_ORIGINS=*
EMERGENT_LLM_KEY=your_emergent_key_here
```

> **Note:** The `EMERGENT_LLM_KEY` powers all AI features (Stack Generator, Dead Tool Detector, Repo Translator, Roast My Stack, Idea Exists). Get one at [emergentagent.com](https://emergentagent.com) → Profile → Universal Key.
>
> Without this key, the app still works for browsing/searching tools — only AI features will fail.

### 4. Frontend setup

```bash
cd ../frontend

# Install dependencies
yarn install
```

Create `/frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 5. Start MongoDB

```bash
# If installed locally
mongod

# Or use Docker
docker run -d -p 27017:27017 --name gitstack-mongo mongo:7
```

### 6. Start the app

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
yarn start
```

The app will be available at **http://localhost:3000**

### 7. Seed the database

The database seeds automatically on first visit. You can also trigger it manually:

```bash
curl -X POST http://localhost:8001/api/seed
```

This creates:
- 44 curated tools with plain English descriptions
- 12 topic categories
- 6 goal-oriented collections
- 6 featured founder stacks

---

## Project Structure

```
gitstack/
├── backend/
│   ├── server.py              # FastAPI app — all API endpoints, AI integration, seed data
│   ├── github_scraper.py      # Background GitHub scraper (trending + search)
│   ├── smart_search.py        # Search ranking & autocomplete
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend environment variables
│
├── frontend/
│   ├── public/
│   │   ├── index.html         # HTML with OG meta tags
│   │   ├── logo.svg           # GitStack logo
│   │   └── favicon.svg        # Browser favicon
│   ├── src/
│   │   ├── App.js             # Router (thin — ~65 lines)
│   │   ├── context/
│   │   │   └── AuthContext.js  # Auth provider + useAuth hook
│   │   ├── utils/
│   │   │   ├── api.js         # API base URL
│   │   │   └── sanitize.js    # HTML sanitization (DOMPurify)
│   │   ├── components/
│   │   │   ├── Header.js      # Navigation header
│   │   │   ├── Footer.js      # Full footer with team info
│   │   │   ├── AuthCallback.js
│   │   │   └── sections/      # Homepage sections
│   │   │       ├── Hero.js
│   │   │       ├── ViralFeatures.js
│   │   │       ├── RepoOfTheDay.js
│   │   │       ├── TopicsGrid.js
│   │   │       ├── TrendingSection.js
│   │   │       ├── CommunityStacks.js
│   │   │       └── NewsletterSignup.js
│   │   └── pages/             # 14 page components
│   │       ├── HomePage.js
│   │       ├── DeadToolDetector.js
│   │       ├── StackGenerator.js
│   │       ├── RoastMyStack.js
│   │       ├── RepoTranslator.js
│   │       ├── IdeaExists.js
│   │       ├── FounderStacks.js
│   │       ├── ToolsPage.js
│   │       ├── ToolDetailPage.js
│   │       ├── CollectionsPage.js
│   │       ├── CollectionDetailPage.js
│   │       ├── GitHubRepoPage.js
│   │       ├── TopicToolsPage.js
│   │       └── Dashboard.js
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/tools` | List all curated tools |
| GET | `/api/tools/{tool_id}` | Tool detail |
| GET | `/api/topics` | List all 12 categories |
| GET | `/api/topics/{topic_id}/tools` | Tools in a category |
| GET | `/api/collections` | List collections |
| GET | `/api/collections/{id}` | Collection detail with tools |
| GET | `/api/stacks/featured` | Featured founder stacks |
| GET | `/api/tools/trending/list` | Trending repos (tabs: top_week, top_day, etc.) |
| GET | `/api/repo-of-the-day` | Daily featured repo |
| GET | `/api/search/autocomplete?q=` | Search autocomplete |
| GET | `/api/scraper/status` | Scraper status + cron info |
| POST | `/api/newsletter/subscribe` | Subscribe to newsletter |
| POST | `/api/seed` | Seed database (runs once) |

### AI-Powered (requires Emergent LLM Key)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/dead-tool-detector` | Find free alternatives to paid SaaS |
| POST | `/api/ai/stack-generator` | Generate tool stack from idea |
| POST | `/api/ai/repo-translator` | Translate GitHub repo to plain English |
| POST | `/api/ai/roast-my-stack` | Roast your tool stack |
| POST | `/api/ai/idea-exists` | Find similar open-source projects |
| GET | `/api/ai/translate-repo/{owner}/{repo}` | Translate specific repo |

### Auth (Google OAuth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/session` | Exchange session token |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

---

## Environment Variables

### Backend (`/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name |
| `CORS_ORIGINS` | Yes | Allowed origins (`*` for dev) |
| `EMERGENT_LLM_KEY` | For AI features | Emergent Universal Key for Gemini 3 Flash |

### Frontend (`/frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | Backend API URL (e.g., `http://localhost:8001`) |

---

## GitHub Scraper

The app includes a background scraper that indexes GitHub repos every 6 hours. It:

1. Fetches trending repos from GitHub Trending page
2. Searches GitHub API across 20+ categories (AI, SaaS, DevOps, etc.)
3. Scores and tiers repos (Hot/Warm) based on stars, recency, and activity
4. Cleans up repos older than 30 days

**Check scraper status:**
```bash
curl http://localhost:8001/api/scraper/status
```

**Manually trigger a scrape:**
```bash
curl -X POST http://localhost:8001/api/scraper/run
```

---

## Deployment

### Docker (recommended)

```bash
# Backend
cd backend
docker build -t gitstack-backend .
docker run -p 8001:8001 --env-file .env gitstack-backend

# Frontend
cd frontend
yarn build
# Serve the build/ folder with nginx, Vercel, or Netlify
```

### Vercel (Frontend)

1. Push to GitHub
2. Import in Vercel
3. Set root directory to `frontend`
4. Add env var: `REACT_APP_BACKEND_URL=https://your-backend-url.com`

### Railway / Render (Backend)

1. Push to GitHub
2. Create new service, point to `backend/` directory
3. Set env vars: `MONGO_URL`, `DB_NAME`, `EMERGENT_LLM_KEY`
4. Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add my feature"`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## Team

**Bedaant Srivastav** — Creator  
[Email](mailto:bedaantsrivastav2001@gmail.com) | [LinkedIn](https://www.linkedin.com/in/bedaant-srivastav-18510a120/)

**Atul Raj Sharan** — Working Partner  
[LinkedIn](https://www.linkedin.com/in/atul-raj-sharan-03b356a2/)

---

## License

MIT License — feel free to use, modify, and distribute.
