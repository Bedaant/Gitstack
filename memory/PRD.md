# GitStack PRD - Product Requirements Document

## Project Overview
GitStack is a SaaS platform that helps non-technical founders discover, understand, and use open-source GitHub tools. Built for non-tech founders by **Bedaant Srivastav** and **Atul Raj Sharan**.

**Version:** 1.2
**Date:** April 2026
**Status:** MVP Complete + Code Quality Complete + Feature Polish Complete

## Architecture

### Tech Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python) + MongoDB
- **AI:** Gemini 3 Flash via Emergent integrations (Universal Key)
- **Auth:** Google OAuth via Emergent Auth
- **Scraper:** Background cron every 6 hours (GitHub API + BeautifulSoup)

### Key Files
```
/app/frontend/src/
├── App.js                          # Thin router (~65 lines)
├── utils/api.js, sanitize.js       # Shared utilities
├── context/AuthContext.js           # Auth provider
├── components/
│   ├── Header.js, Footer.js        # Layout components
│   ├── AuthCallback.js             # OAuth handler
│   └── sections/                   # Homepage sections (7 components)
├── pages/                          # 14 page components
/app/backend/
├── server.py                       # FastAPI endpoints + seed + cron
├── github_scraper.py               # GitHub trending scraper
├── smart_search.py                 # Search ranking
/app/frontend/public/
├── logo.svg, favicon.svg           # Custom SVG logo
├── index.html                      # OG meta tags
```

## Implemented Features (All Tested)

### Core
1. Homepage with Hero, search with autocomplete, topic chips
2. Browse by Topic — **12 categories** (AI Agents, UI/UX, Automation, Data & Analytics, Payments, Auth, Email & Messaging, CMS & Content, Mobile Dev, Testing & QA, Web3 & Blockchain, Self-Hosted)
3. Trending Now — 4 tabs with live GitHub data
4. Community Stacks — Real founder tech stacks
5. Repo of the Day + Newsletter subscription

### AI Tools
6. Dead Tool Detector — Find free alternatives with annual savings
7. Stack Generator — Generate tool stacks from business ideas
8. Repo Translator — Plain English explanations of GitHub repos
9. Roast My Stack — Brutally honest stack feedback
10. Your Idea Already Exists — Find similar open-source projects

### Discovery
11. Tools Page with **Filters** (difficulty, language, sort by stars/name/difficulty)
12. Tool Detail Page with setup guides
13. **Collection Detail Pages** — Numbered tools with Quick Setup steps
14. **Founder Stacks Page** — Real stacks with GitHub star counts
15. Topic Tools Pages — Browse repos by category

### Infrastructure
16. Google OAuth (Emergent-managed)
17. Dashboard / My Stack (protected)
18. Background scraper cron (every 6 hours)
19. **1100+ repos** indexed across 12 categories
20. Custom SVG logo + OG meta tags + proper SEO
21. **Footer** with team info, AI Tools links, Explore links

## API Endpoints
- Public: `/api/tools`, `/api/topics`, `/api/collections`, `/api/collections/{id}`, `/api/stacks/featured`, `/api/tools/trending/list`, `/api/repo-of-the-day`, `/api/scraper/status`
- AI: `/api/ai/dead-tool-detector`, `/api/ai/stack-generator`, `/api/ai/repo-translator`, `/api/ai/roast-my-stack`, `/api/ai/idea-exists`, `/api/ai/translate-repo/{owner}/{repo}`
- Auth: `/api/auth/session`, `/api/auth/me`, `/api/auth/logout`
- Search: `/api/search`, `/api/search/autocomplete`

## Team
- **Bedaant Srivastav** — bedaantsrivastav2001@gmail.com — [LinkedIn](https://www.linkedin.com/in/bedaant-srivastav-18510a120/)
- **Atul Raj Sharan** (Working Partner) — [LinkedIn](https://www.linkedin.com/in/atul-raj-sharan-03b356a2/)

## Backlog
1. Shareable result URLs for AI tools (viral growth)
2. "Explain This Error" feature
3. User tool bookmarking/saving
4. Pro plan / monetization / pricing page
5. Community reviews/ratings on tools
6. Backend function refactoring (server.py large functions)
