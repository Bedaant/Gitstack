# GitStack PRD - Product Requirements Document

## Project Overview
GitStack is a SaaS platform that helps non-technical founders discover, understand, and use open-source GitHub tools. It bridges the gap between GitHub tools existing and founders actually using them.

**Version:** 1.1
**Date:** April 2026
**Status:** MVP Complete + Code Quality Refactoring Complete

## Original Problem Statement
Build a fully functional SaaS where every screen and feature works. Users need to discover GitHub tools without technical knowledge, understand them in plain English, and build their ideas without writing code.

## Architecture

### Tech Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** Gemini 3 Flash via Emergent integrations
- **Auth:** Google OAuth via Emergent Auth

### Key Files (Post-Refactoring)
```
/app/frontend/src/
├── App.js                          # Thin router (~60 lines)
├── utils/
│   ├── api.js                      # API base URL constant
│   └── sanitize.js                 # HTML sanitization utilities
├── context/
│   └── AuthContext.js              # Auth provider + useAuth hook
├── components/
│   ├── Header.js                   # Navigation header
│   ├── AuthCallback.js             # OAuth callback handler
│   └── sections/
│       ├── Hero.js                 # Hero section with search
│       ├── ViralFeatures.js        # Feature cards strip
│       ├── RepoOfTheDay.js         # Daily repo highlight
│       ├── TopicsGrid.js           # Browse by topic grid
│       ├── TrendingSection.js      # Trending repos with tabs
│       ├── CommunityStacks.js      # Founder stacks section
│       └── NewsletterSignup.js     # Newsletter subscription
├── pages/
│   ├── HomePage.js                 # Main landing page
│   ├── DeadToolDetector.js         # AI-powered SaaS alternative finder
│   ├── StackGenerator.js           # AI stack generator
│   ├── RoastMyStack.js             # AI stack roaster
│   ├── RepoTranslator.js           # GitHub repo translator
│   ├── IdeaExists.js               # Similar project finder
│   ├── ToolsPage.js                # All tools listing
│   ├── ToolDetailPage.js           # Individual tool detail
│   ├── CollectionsPage.js          # Curated collections
│   ├── GitHubRepoPage.js           # GitHub repo AI translation
│   ├── TopicToolsPage.js           # Tools by topic
│   ├── Dashboard.js                # User's saved stacks
│   ├── FounderStacks.js            # Placeholder page
│   └── ErrorExplainer.js           # Placeholder page

/app/backend/
├── server.py                       # FastAPI backend with all endpoints
├── github_scraper.py               # GitHub trending scraper
└── smart_search.py                 # AI-powered search service
```

## User Personas
1. **Non-Tech Founder** - Has business ideas, knows tools exist, but doesn't know which ones or how to use them
2. **Indie Hacker** - Building side projects, wants to save money with open-source alternatives
3. **SaaS Founder** - Wants to reduce costs and find tool stacks that work

## Core Features (All Implemented)

### 1. Home Page - Hero, search, topic chips, tool count badge
### 2. Viral Feature Strip - Dead Tool Detector, Roast My Stack, Idea Exists, Repo Translator, Founder Stacks
### 3. Browse by Topic Grid - 6 categories with filtered tools
### 4. Trending Now Section - 4 tabs with live GitHub data
### 5. Community Stacks - Real founder tech stacks
### 6. Dead Tool Detector (AI) - Finds free alternatives with annual savings
### 7. Stack Generator (AI) - Generates tool stacks from business ideas
### 8. Repo Translator (AI) - Plain English explanations of GitHub repos
### 9. Roast My Stack (AI) - Brutally honest stack feedback
### 10. Tools Page - 44+ curated + live GitHub tools with search
### 11. Tool Detail Page - Full info, setup guide, related tools
### 12. Collections Page - 6 curated goal-oriented collections
### 13. Your Idea Already Exists (AI) - Finds similar open-source projects
### 14. Repo of the Day + Newsletter - Daily featured repo with email digest
### 15. Dashboard / My Stack - Google OAuth protected user stacks
### 16. Google OAuth - Emergent-managed auth

## API Endpoints

### Public
- `GET /api/health`, `GET /api/tools`, `GET /api/tools/{tool_id}`, `GET /api/topics`, `GET /api/collections`
- `GET /api/stacks/public`, `GET /api/tools/trending/list`, `GET /api/stacks/featured`
- `GET /api/repo-of-the-day`, `GET /api/newsletter/count`
- `POST /api/search`, `GET /api/search/autocomplete`, `POST /api/newsletter/subscribe`

### AI
- `POST /api/ai/dead-tool-detector`, `POST /api/ai/stack-generator`
- `POST /api/ai/repo-translator`, `POST /api/ai/roast-my-stack`
- `POST /api/ai/idea-exists`, `GET /api/ai/translate-repo/{owner}/{repo}`

### Auth
- `POST /api/auth/session`, `GET /api/auth/me`, `POST /api/auth/logout`

### Protected
- `GET /api/my-stacks`, `POST /api/my-stacks`

## Design System
- **Style:** Neo-Brutalist with pastel accents
- **Fonts:** Bricolage Grotesque (headings), DM Sans (body), IBM Plex Mono (code)
- **Colors:** Black/white core, pastel accents (mint, yellow, lavender, pink)
- **Shadows:** Hard 4px offset black shadows

## Code Quality Fixes (April 2026)
- [x] XSS: Replaced dangerouslySetInnerHTML with DOMPurify sanitization
- [x] Empty catch blocks: Added proper error logging
- [x] React Keys: Replaced all index-as-key with stable unique identifiers
- [x] React Hooks: Fixed use-toast.js dependency array
- [x] Complexity: Split monolithic App.js (~2100 lines) into 20+ focused component files

## What's Not Implemented (Backlog)
1. Background cron job scheduling for scraper (currently startup-triggered)
2. "What Founders Actually Used" full page (currently placeholder)
3. "Explain This Error" feature (placeholder)
4. Share functionality (generate shareable URLs)
5. Pro plan / monetization
6. Community notes on tools
7. Backend function refactoring (server.py, github_scraper.py large functions)

## Success Metrics
- Dead Tool Detector uses/day
- Stack Generator completions/day
- Share button clicks
- Tool card views per session
