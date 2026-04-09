# GitStack PRD - Product Requirements Document

## Project Overview
GitStack is a SaaS platform that helps non-technical founders discover, understand, and use open-source GitHub tools. It bridges the gap between GitHub tools existing and founders actually using them.

**Version:** 1.0 MVP
**Date:** April 2026
**Status:** MVP Complete

## Original Problem Statement
Build a fully functional SaaS where every screen and feature works. Users need to discover GitHub tools without technical knowledge, understand them in plain English, and build their ideas without writing code.

## Architecture

### Tech Stack
- **Frontend:** React 19 + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **AI:** Gemini 3 Flash via Emergent integrations
- **Auth:** Google OAuth via Emergent Auth

### Key Files
- `/app/backend/server.py` - FastAPI backend with all endpoints
- `/app/frontend/src/App.js` - React SPA with all pages
- `/app/frontend/src/index.css` - Neo-brutalist design system

## User Personas
1. **Non-Tech Founder** - Has business ideas, knows tools exist, but doesn't know which ones or how to use them
2. **Indie Hacker** - Building side projects, wants to save money with open-source alternatives
3. **SaaS Founder** - Wants to reduce costs and find tool stacks that work

## Core Features (Implemented)

### 1. Home Page ✅
- Hero section with search bar
- 6 goal chips (AI agent, SaaS starter, etc.)
- Live count badge "127 tools"
- Build Stack CTA button

### 2. Viral Feature Strip ✅
- Dead Tool Detector (HIGHEST PRIORITY)
- Roast My Stack
- Your Idea Exists (placeholder)
- What Founders Used (placeholder)
- Explain Error (placeholder)

### 3. Browse by Topic Grid ✅
- 6 categories with icons
- AI Agents, UI/UX Tools, Automation, Data & Analytics, Payments, Authentication

### 4. Trending Now Section ✅
- 4 tabs (Top this week, Most starred, New & rising, PH picks)
- Tool cards with rank, name, description, language, stars, difficulty

### 5. Community Stacks ✅
- 3 pre-seeded public stacks
- Copy count for social proof
- One-click copy functionality

### 6. Dead Tool Detector ✅ (AI-Powered)
- Input: Paid SaaS tools (comma-separated)
- Output: Free alternatives with annual savings
- Shareable result card

### 7. Stack Generator ✅ (AI-Powered)
- Input: Business idea description
- Output: 4-6 tools in setup order
- Each tool has: name, description, difficulty, setup time, steps

### 8. Repo Translator ✅ (AI-Powered)
- Input: GitHub URL
- Output: Plain English explanation
- What it does, who it's for, what you can build, difficulty, steps

### 9. Roast My Stack ✅ (AI-Powered)
- Input: Selected tools (clickable chips)
- Output: Brutal but helpful feedback
- What's redundant, overpriced, missing, smarter alternatives

### 10. Tools Page ✅
- 44+ seeded tools with plain English descriptions
- Search functionality
- Grid layout with difficulty badges

### 11. Tool Detail Page ✅
- Full tool information
- Who it's for, what you can build
- Paid alternative comparison
- Step-by-step setup guide
- Related tools

### 12. Collections Page ✅
- 6 curated collections
- Goal-oriented titles
- Difficulty and time estimates
- Pastel color backgrounds

### 13. My Stack (Dashboard) ✅
- Google OAuth protected
- User's saved stacks
- Share functionality (placeholder)

### 14. Google OAuth ✅
- Sign in with Google button
- Session management
- Protected routes

## Database Schema

### Collections
- `tools` - 44+ seeded tools
- `topics` - 6 categories
- `collections` - 6 curated stacks
- `users` - Authenticated users
- `user_sessions` - Auth sessions
- `user_stacks` - User saved stacks

### Tool Schema
```javascript
{
  tool_id: string,
  name: string,
  description: string,
  who_its_for: string,
  what_you_can_build: string[],
  difficulty: "Beginner" | "Intermediate" | "Advanced",
  setup_time: string,
  setup_steps: string[],
  related_tools: string[],
  github_url: string,
  stars: string,
  language: string,
  category: string,
  tags: string[],
  paid_alternative: string,
  monthly_cost: string
}
```

## API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/tools` - List tools
- `GET /api/tools/{tool_id}` - Tool detail
- `GET /api/topics` - List topics
- `GET /api/collections` - List collections
- `GET /api/stacks/public` - Public stacks

### AI Endpoints
- `POST /api/ai/dead-tool-detector` - Find free alternatives
- `POST /api/ai/stack-generator` - Generate tool stack
- `POST /api/ai/repo-translator` - Translate GitHub repo
- `POST /api/ai/roast-my-stack` - Get stack roasted

### Auth Endpoints
- `POST /api/auth/session` - Exchange OAuth token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Protected Endpoints
- `GET /api/my-stacks` - User's stacks
- `POST /api/my-stacks` - Save stack

## Design System
- **Style:** Neo-Brutalist with pastel accents
- **Fonts:** Bricolage Grotesque (headings), DM Sans (body), IBM Plex Mono (code)
- **Colors:** Black/white core, pastel accents (mint, yellow, lavender, pink)
- **Shadows:** Hard 4px offset black shadows

## What's Not Implemented (P1 Backlog)
1. "Your Idea Already Exists" feature
2. "What Founders Actually Used" feature  
3. "Explain This Error" feature
4. Share functionality (generate shareable URLs)
5. Newsletter signup
6. Pro plan / monetization
7. Detailed collection pages with tool lists
8. Community notes on tools

## Next Action Items
1. Implement share functionality for results
2. Build collection detail pages
3. Add "Your Idea Exists" feature
4. Implement newsletter signup
5. Add analytics tracking

## Success Metrics
- Dead Tool Detector uses/day
- Stack Generator completions/day
- Share button clicks
- Tool card views per session
