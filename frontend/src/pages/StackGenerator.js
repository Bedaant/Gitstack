import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronRight, Clock, CheckCircle2, Share2, Copy, BookmarkPlus, BookmarkCheck, ExternalLink, Globe, Mail, Terminal, Wand2, FileCode, Download, Rocket, Star, ArrowRight } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { saveStackLocally, isStackSaved } from "../utils/localStacks";
import { trackEvent } from "../utils/analytics";

const LOADING_STEPS = [
  "Parsing your idea...",
  "Matching tools to your use case...",
  "Checking GitHub stars & activity...",
  "Assembling your blueprint...",
];

const DRAFT_KEY = "gitstack_stackgen_draft";
const loadDraft = () => {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); }
  catch { return {}; }
};
const saveDraft = (d) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch {}
};
const clearDraft = () => {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
};

// ── Helper: extract owner/repo from GitHub URL ──
function parseGitHubUrl(url) {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : null;
}

// ── Helper: generate clone commands from tools ──
function generateCloneCommands(tools) {
  return tools
    .map((t) => {
      const repo = parseGitHubUrl(t.githubUrl);
      return repo ? `git clone https://github.com/${repo}.git` : null;
    })
    .filter(Boolean);
}

// ── Helper: generate instant master prompt (frontend template) ──
function generateInstantPrompt(idea, tools) {
  const toolList = tools
    .map((t, i) => `${i + 1}. ${t.name} — ${t.description}`)
    .join("\n");

  const repos = tools
    .map((t) => {
      const repo = parseGitHubUrl(t.githubUrl);
      return repo ? `- ${t.name}: https://github.com/${repo}` : null;
    })
    .filter(Boolean)
    .join("\n");

  const cloneCommands = generateCloneCommands(tools).join("\n");

  return `I want to build: ${idea}

I have selected these open-source repositories as my foundation:
${toolList}

GitHub repositories:
${repos}

Your task: Build me a single, unified, production-ready application for "${idea}". I will copy-paste this prompt into Cursor / ChatGPT / Claude and you must generate the ENTIRE project — every file, complete code, no placeholders.

=== STEP 0 — PREREQUISITES ===
Before starting, ensure you have:
- Node.js 18+ installed (download from https://nodejs.org — click the green "LTS" button)
- A code editor (Cursor, VS Code, or Windsurf)
- Git installed (usually comes with Node.js)
Verify: run \`node --version\` and \`git --version\` in terminal.

=== STEP 1 — CLONE REFERENCE REPOS ===
Run these commands in your terminal FIRST:
${cloneCommands}

These repos are your architectural foundation. Study their code patterns, database schemas, and UI approaches.

=== STEP 2 — PROJECT PLAN ===
First generate a \`PROJECT_PLAN.md\` with:
1. App name and description for "${idea}"
2. Complete file list
3. Database schema inferred from "${idea}" (all tables, columns, foreign keys)
4. API endpoint list
5. Page/component list
6. Color palette and design tokens
7. **MVP vs Phase 2**: If "${idea}" is complex, identify CORE features for MVP and mark advanced features as "Phase 2". Generate ONLY the MVP first.

=== STEP 3 — FRONTEND (Beautiful, Modern UI) ===
Tech Stack:
- React 18 with Vite
- Tailwind CSS for styling
- shadcn/ui or Radix UI for polished components (buttons, modals, tables, forms, cards, dropdowns)
- Lucide React for icons
- React Router for navigation
- Recharts for charts/analytics

Generate ALL of these:
1. Landing/Home page — hero section, features grid, CTA buttons
2. Dashboard — sidebar navigation, KPI stat cards, chart widgets, activity feed
3. Main feature pages — forms, data tables, detail views (whatever "${idea}" needs)
4. Auth pages — Login/Register with clean card design
5. Settings/Profile page with avatar upload
6. Shared components — Navbar, Sidebar, Footer, Modal, Toast, Loading spinner, Empty state, Confirm dialog

Design requirements:
- Modern color palette (slate/blue/indigo base with one accent like emerald/violet/amber)
- Fully responsive (mobile, tablet, desktop)
- Cards with subtle shadows, rounded-xl corners, smooth transitions
- Dark mode toggle with system preference detection
- Forms with real-time validation, error messages, loading states
- Tables with search, sort, pagination, bulk actions
- Every component must be fully styled with Tailwind — no unstyled HTML
- All buttons must have hover and active states

API Client:
- Create \`client/src/lib/api.js\` — Axios instance with baseURL from env
- baseURL: \`import.meta.env.VITE_API_URL\` (default: http://localhost:5000)
- Include JWT interceptor and error handling

=== STEP 4 — BACKEND (Robust API) ===
Tech Stack:
- Node.js + Express
- SQLite database (single file, zero setup) with better-sqlite3
- JWT authentication (jsonwebtoken)
- bcrypt for password hashing
- cors + express-validator + dotenv

Implement ALL endpoints:
1. POST /api/auth/register — Create user (email validation, password min 6 chars)
2. POST /api/auth/login — Return JWT
3. GET /api/auth/me — Current user profile (protected)
4. GET /api/dashboard/stats — KPI data (protected)
5. Full CRUD for main entity: GET /api/items (pagination, search, sort), GET /api/items/:id, POST /api/items, PUT /api/items/:id, DELETE /api/items/:id
6. Any extra endpoints "${idea}" needs

Requirements:
- Error handling: {success: false, error: "message"}
- Input validation on every endpoint
- Auth middleware on private routes
- Auto-create tables on first start
- Seed script (\`server/seed.js\`) with 10-20 realistic demo records
- CORS configured for frontend

=== STEP 5 — DATABASE ===
- SQLite file-based (\`server/database.sqlite\`)
- Infer COMPLETE schema from "${idea}" — all tables needed
- Every table: id (INTEGER PRIMARY KEY), created_at, updated_at
- Foreign keys with ON DELETE CASCADE
- Indexes on searched columns
- Seed data with realistic records

=== STEP 6 — PROJECT STRUCTURE ===
\`\`\`
my-app/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── lib/                # api.js (Axios), utils.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example
├── server/                     # Express backend
│   ├── index.js                # Server entry + DB setup
│   ├── routes/                 # API routes
│   ├── middleware/             # Auth, error handlers
│   ├── models/                 # DB connection, queries
│   ├── config/                 # Schema + migrations
│   ├── seed.js                 # Demo data
│   └── package.json
├── .env.example
├── .cursorrules                # Cursor AI rules
├── PROJECT_PLAN.md             # Complete architecture plan
├── README.md
└── setup.sh                    # One-command setup
\`\`\`

=== STEP 7 — \`.cursorrules\` FILE ===
Generate a \`.cursorrules\` file:
\`\`\`
# Project Rules for Cursor AI
- This is a full-stack app: React frontend + Express backend
- Database: SQLite file at server/database.sqlite
- Always use async/await for API calls
- Always validate user input on both frontend and backend
- When adding a feature, update BOTH frontend and backend
- Use Tailwind CSS for all styling — no inline styles
- Use Lucide React icons — no emoji icons
- Follow existing file structure
\`\`\`

=== STEP 8 — SETUP SCRIPTS ===
Create \`setup.sh\` (Mac/Linux):
\`\`\`bash
#!/bin/bash
set -e
echo "Setting up ${idea}..."
echo "Step 1/5: Cloning reference repos..."
${cloneCommands}
echo "Step 2/5: Installing backend dependencies..."
cd server && npm install && cd ..
echo "Step 3/5: Installing frontend dependencies..."
cd client && npm install && cd ..
echo "Step 4/5: Setting up database..."
node server/seed.js
echo "Step 5/5: Starting servers..."
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:5000"
npm run dev
\`\`\`

Create \`setup.bat\` (Windows):
\`\`\`batch
@echo off
echo Setting up ${idea}...
echo Step 1/5: Cloning reference repos...
${cloneCommands}
echo Step 2/5: Installing backend dependencies...
cd server && npm install && cd ..
echo Step 3/5: Installing frontend dependencies...
cd client && npm install && cd ..
echo Step 4/5: Setting up database...
node server/seed.js
echo Step 5/5: Starting servers...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:5000
npm run dev
\`\`\`

=== STEP 9 — ENVIRONMENT ===
\`.env.example\`:
\`\`\`
# Backend
PORT=5000
JWT_SECRET=change-this-in-production
DATABASE_URL=./database.sqlite
NODE_ENV=development

# Frontend
VITE_API_URL=http://localhost:5000

# APIs (add what "${idea}" needs)
OPENAI_API_KEY=sk-your-key
\`\`\`

=== STEP 10 — DEPLOYMENT ===
Frontend (Vercel):
1. Push to GitHub
2. Import on vercel.com, root directory: client/
3. Add VITE_API_URL env var
4. Deploy

Backend (Render/Railway):
1. Push to GitHub
2. Import on render.com, start command: cd server && npm start
3. Add env vars
4. Deploy

=== STEP 11 — CUSTOMIZATION ===
- App name: edit client/index.html + client/src/components/Navbar.jsx
- Colors: edit client/tailwind.config.js
- Logo: replace client/public/logo.svg
- New fields: edit server/config/database.js + client/src/pages/[Page].jsx

Write COMPLETE code for EVERY file. No placeholders. No TODOs. No "implement later." The app must run with \`./setup.sh\`.`;
}

// ── Helper: estimate total setup time ──
function estimateTotalTime(tools) {
  let totalMinutes = 0;
  for (const t of tools) {
    const match = t.setupTime?.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (t.setupTime.includes("hour")) totalMinutes += num * 60;
      else totalMinutes += num;
    }
  }
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
  }
  return `~${totalMinutes}m`;
}

export default function StackGenerator() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialIdea = params.get('idea') || '';

  const draft = loadDraft();
  const [idea, setIdea] = useState(initialIdea || draft.idea || "");
  const [budget, setBudget] = useState(draft.budget || "");
  const [buildingAlone, setBuildingAlone] = useState(draft.buildingAlone ?? null);
  const [needsPayments, setNeedsPayments] = useState(draft.needsPayments ?? null);
  const [solutionMode, setSolutionMode] = useState(draft.solutionMode || "both");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [stack, setStack] = useState(null);
  const [expandedTool, setExpandedTool] = useState(null);
  const [activeTab, setActiveTab] = useState("stack");
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [publicSlug, setPublicSlug] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [completeSolutions, setCompleteSolutions] = useState([]);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [selectedComplete, setSelectedComplete] = useState(null);
  const [selectedBlocks, setSelectedBlocks] = useState({});

  useEffect(() => {
    if (stack) return;
    saveDraft({ idea, budget, buildingAlone, needsPayments, solutionMode });
  }, [idea, budget, buildingAlone, needsPayments, solutionMode, stack]);

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setStack(null);
    setSaved(false);
    setActiveTab("stack");
    setMasterPrompt("");
    setSelectedComplete(null);
    setSelectedBlocks({});
    try {
      const res = await axios.post(`${API}/ai/stack-generator`, {
        idea,
        ...(budget && { budget }),
        ...(buildingAlone !== null && { building_alone: buildingAlone }),
        ...(needsPayments !== null && { needs_payments: needsPayments }),
        solution_mode: solutionMode,
      });
      const data = res.data;
      // Support both old format (flat array) and new format (categorized)
      const newStack = data.complete_solutions || data.building_blocks
        ? data
        : { mode: "both", complete_solutions: [], building_blocks: (data.stack || []).map((t, i) => ({ category: "Tool " + (i+1), primary: t, alternatives: [] })) };
      setStack(newStack);
      setSaved(isStackSaved(idea));
      clearDraft();
      const toolCount = (newStack.complete_solutions?.length || 0) + (newStack.building_blocks?.length || 0);
      trackEvent("stack_generated", { idea: idea.slice(0, 50), tool_count: toolCount, mode: solutionMode });
      // Phase 4: Also fetch complete solutions in parallel (for "both" mode supplement)
      if (solutionMode === "both" || solutionMode === "complete") {
        setSolutionsLoading(true);
        setCompleteSolutions([]);
        axios.post(`${API}/ai/solution-finder`, { query: idea, limit: 3 })
          .then(r => setCompleteSolutions(r.data.solutions || []))
          .catch(() => {})
          .finally(() => setSolutionsLoading(false));
      }
    } catch (e) {
      toast.error("Failed to generate stack. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  // Derive flat stack array from new categorized format for backward-compat actions
  const flatStack = useMemo(() => {
    if (!stack) return [];
    if (Array.isArray(stack)) return stack;
    const items = [];
    if (stack.complete_solutions && selectedComplete) {
      items.push(selectedComplete);
    } else if (stack.complete_solutions) {
      items.push(...stack.complete_solutions);
    }
    if (stack.building_blocks) {
      stack.building_blocks.forEach(bb => {
        const selected = selectedBlocks[bb.category];
        items.push(selected || bb.primary);
      });
    }
    return items;
  }, [stack, selectedComplete, selectedBlocks]);

  const handleSave = () => {
    if (!stack || saved) return;
    saveStackLocally(idea, flatStack);
    setSaved(true);
    trackEvent("stack_saved", { idea: idea.slice(0, 50), tool_count: flatStack.length });
    toast.success("Stack saved! View it in My Stacks →", {
      action: { label: "View", onClick: () => window.location.href = '/dashboard' },
    });
  };

  const handlePublish = async () => {
    if (!stack || publicSlug || publishing) return;
    setPublishing(true);
    try {
      const name = idea.length > 60 ? idea.slice(0, 57) + '...' : idea;
      const res = await axios.post(`${API}/stacks/publish`, { name, idea, tools: flatStack });
      setPublicSlug(res.data.stack_id);
      trackEvent("stack_published", { idea: idea.slice(0, 50), tool_count: flatStack.length });
      toast.success("Stack published! Share the link →");
    } catch {
      toast.error("Couldn't publish. Try again.");
    }
    setPublishing(false);
  };

  const handleEmailStack = async (e) => {
    e.preventDefault();
    if (!email.trim() || emailSent) return;
    try {
      await axios.post(`${API}/stacks/email-me`, { email: email.trim(), idea, tools: flatStack });
      setEmailSent(true);
      toast.success("Saved! We'll remind you when it's time to build.");
    } catch {
      toast.error("Couldn't save. Check your email and try again.");
    }
  };

  const handleGenerateEnhancedPrompt = async () => {
    if (!stack || generatingPrompt) return;
    setGeneratingPrompt(true);
    try {
      const res = await axios.post(`${API}/ai/stack-master-prompt`, { idea, tools: flatStack });
      setMasterPrompt(res.data.prompt);
      trackEvent("enhanced_prompt_generated", { idea: idea.slice(0, 50), tool_count: flatStack.length });
      toast.success("Enhanced prompt generated!");
    } catch (e) {
      toast.error("Failed to generate enhanced prompt. Using instant prompt instead.");
      setMasterPrompt(generateInstantPrompt(idea, stack));
    }
    setGeneratingPrompt(false);
  };

  useEffect(() => {
    if (initialIdea && !stack) {
      handleGenerate(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-compute tab content data
  const cloneCommands = stack ? generateCloneCommands(stack) : [];
  const totalTime = stack ? estimateTotalTime(stack) : "";
  const instantPrompt = stack ? generateInstantPrompt(idea, stack) : "";

  return (
    <div className="min-h-screen">
      <SEO
        title="Stack Generator — Find Free Tools for Your Idea"
        description="Tell us what you want to build and we'll generate a complete free open-source tech stack for you. No coding required. Used by 1,000+ founders."
        path="/stack-generator"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Generate a Free Tech Stack for Your Startup",
          "description": "Use GitStack's AI Stack Generator to build a complete open-source tech stack for your startup idea in under 5 minutes.",
          "totalTime": "PT5M",
          "tool": [{ "@type": "HowToTool", "name": "GitStack Stack Generator" }],
          "step": [
            {
              "@type": "HowToStep",
              "name": "Describe your startup idea",
              "text": "Enter your business idea in plain English. Example: 'I want to build a marketplace for freelance designers.'",
              "url": "https://www.gitstack.pro/stack-generator"
            },
            {
              "@type": "HowToStep",
              "name": "Set your budget and team size",
              "text": "Choose your monthly budget ($0, $50, $200, or $500+) and whether you're solo or have a team.",
              "url": "https://www.gitstack.pro/stack-generator"
            },
            {
              "@type": "HowToStep",
              "name": "Get AI-generated stack recommendations",
              "text": "GitStack's AI analyzes your idea and recommends the best open-source tools for frontend, backend, database, authentication, payments, and hosting.",
              "url": "https://www.gitstack.pro/stack-generator"
            },
            {
              "@type": "HowToStep",
              "name": "Review and export your stack",
              "text": "Browse detailed explanations for each tool, compare alternatives, and export your stack with one-click clone commands.",
              "url": "https://www.gitstack.pro/stack-generator"
            }
          ]
        }}
      />
      <Header />
      <main id="main-content" className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary border-4 border-foreground neo-shadow-lg mb-6">
              <Sparkles className="w-10 h-10 text-primary-foreground" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="stack-gen-title">
              Stack Generator
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tell us what you want to build. We'll recommend the exact tools you need.
            </p>
          </div>

          <div className="mb-12">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I want to build a SaaS that helps freelancers track their time and send invoices..."
              className="neo-input p-4 h-40 resize-none mb-6"
              data-testid="stack-gen-input"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Monthly Budget</p>
                <div className="flex flex-wrap gap-2">
                  {['$0 (free only)', '$50/mo', '$200/mo', '$500+/mo'].map(b => (
                    <button
                      key={b}
                      onClick={() => setBudget(budget === b ? "" : b)}
                      className={`px-3 py-1.5 border-2 border-foreground text-xs font-bold transition-all ${budget === b ? 'bg-foreground text-primary-foreground' : 'bg-background hover:bg-pastel-yellow hover:text-black'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Team Size</p>
                <div className="flex gap-2">
                  {[{label: 'Solo', val: true}, {label: 'With a Team', val: false}].map(({label, val}) => (
                    <button
                      key={label}
                      onClick={() => setBuildingAlone(buildingAlone === val ? null : val)}
                      className={`px-3 py-1.5 border-2 border-foreground text-xs font-bold transition-all ${buildingAlone === val ? 'bg-foreground text-primary-foreground' : 'bg-background hover:bg-pastel-yellow hover:text-black'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Needs Payments?</p>
                <div className="flex gap-2">
                  {[{label: 'Yes', val: true}, {label: 'No', val: false}].map(({label, val}) => (
                    <button
                      key={label}
                      onClick={() => setNeedsPayments(needsPayments === val ? null : val)}
                      className={`px-3 py-1.5 border-2 border-foreground text-xs font-bold transition-all ${needsPayments === val ? 'bg-foreground text-primary-foreground' : 'bg-background hover:bg-pastel-yellow hover:text-black'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Solution Mode Selector */}
            <div className="neo-card p-4 border-2 border-foreground">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">What do you prefer?</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'complete', label: '🔧 Ready to Deploy', desc: 'Complete apps' },
                  { id: 'diy', label: '🛠️ DIY Blocks', desc: 'Build from components' },
                  { id: 'both', label: '📋 Show Both', desc: 'Compare options' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSolutionMode(mode.id)}
                    className={`p-3 border-2 border-foreground text-left transition-all ${
                      solutionMode === mode.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    <div className="font-bold text-sm">{mode.label}</div>
                    <div className={`text-xs mt-0.5 ${solutionMode === mode.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {mode.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleGenerate(1)}
              disabled={loading || !idea.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg disabled:opacity-50"
              data-testid="stack-gen-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6 mr-2" /> Generate My Stack</>}
            </button>
          </div>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-bold text-lg"
                >
                  {LOADING_STEPS[loadingStep]}
                </motion.p>
              </AnimatePresence>
              <p className="text-muted-foreground text-sm mt-1">Usually takes 10–20 seconds</p>
            </div>
          )}

          {stack && (stack.length > 0 || stack.complete_solutions || stack.building_blocks) && (
            <div className="space-y-4">
              {/* ── Tabs ── */}
              <div className="flex border-b-4 border-foreground mb-6">
                <button
                  onClick={() => setActiveTab("stack")}
                  className={`px-4 py-3 font-black uppercase text-sm border-2 border-b-0 border-foreground -mb-[4px] flex items-center gap-2 ${
                    activeTab === "stack" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <Sparkles className="w-4 h-4" /> Stack
                </button>
                <button
                  onClick={() => setActiveTab("setup")}
                  className={`px-4 py-3 font-black uppercase text-sm border-2 border-b-0 border-foreground -mb-[4px] flex items-center gap-2 ${
                    activeTab === "setup" ? "bg-pastel-mint text-black" : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <Terminal className="w-4 h-4" /> Setup Guide
                </button>
                <button
                  onClick={() => setActiveTab("prompt")}
                  className={`px-4 py-3 font-black uppercase text-sm border-2 border-b-0 border-foreground -mb-[4px] flex items-center gap-2 ${
                    activeTab === "prompt" ? "bg-pastel-lavender text-black" : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <Wand2 className="w-4 h-4" /> Master Prompt
                </button>
              </div>

              {/* ── Stack Tab ── */}
              {activeTab === "stack" && (
                <div className="space-y-6">
                  {/* Legacy flat array fallback */}
                  {Array.isArray(stack) && (
                    <>
                      <p className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-6 font-bold">
                        Here's your tailored stack:
                      </p>
                      <AnimatePresence>
                        {stack.map((tool, i) => (
                          <motion.div
                            key={`${tool.name}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <StackToolCard
                              tool={tool}
                              index={i}
                              expanded={expandedTool === i}
                              onToggle={() => setExpandedTool(expandedTool === i ? null : i)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </>
                  )}

                  {/* New categorized format */}
                  {!Array.isArray(stack) && (
                    <>
                      {/* Complete Solutions */}
                      {stack.complete_solutions && stack.complete_solutions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Rocket className="w-5 h-5" /> Ready to Deploy
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Complete applications you can clone and deploy today. Pick one as your foundation.
                          </p>
                          <div className="space-y-3">
                            {stack.complete_solutions.map((sol, i) => (
                              <motion.div
                                key={sol.name}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`neo-card p-5 border-2 ${selectedComplete?.name === sol.name ? 'border-primary bg-primary/5' : 'border-foreground'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-bold text-lg">{sol.name}</h4>
                                      {sol.stars && (
                                        <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                          <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {sol.stars}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">{sol.description}</p>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      <span className={`px-2 py-0.5 font-bold rounded ${sol.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' : sol.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                        {sol.difficulty}
                                      </span>
                                      <span className="px-2 py-0.5 bg-muted rounded flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {sol.setupTime}
                                      </span>
                                      {sol.is_free && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold">Free</span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => setSelectedComplete(selectedComplete?.name === sol.name ? null : sol)}
                                    className={`neo-btn px-3 py-1.5 text-xs font-black whitespace-nowrap ${selectedComplete?.name === sol.name ? 'neo-btn-primary' : ''}`}
                                  >
                                    {selectedComplete?.name === sol.name ? '✓ Selected' : 'Use This'}
                                  </button>
                                </div>

                                {/* Alternatives */}
                                {sol.alternatives && sol.alternatives.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Alternatives</p>
                                    <div className="flex flex-wrap gap-2">
                                      {sol.alternatives.filter(a => a.githubUrl).map((alt) => (
                                        <button
                                          key={alt.name}
                                          onClick={() => {
                                            const newSol = { ...sol, name: alt.name, githubUrl: alt.githubUrl, description: alt.why || sol.description };
                                            setSelectedComplete(newSol);
                                          }}
                                          className={`text-xs px-3 py-1.5 border-2 border-foreground rounded font-semibold transition-colors ${
                                            selectedComplete?.name === alt.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                          }`}
                                          title={alt.why}
                                        >
                                          {alt.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Building Blocks */}
                      {stack.building_blocks && stack.building_blocks.length > 0 && (
                        <div>
                          <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <Wand2 className="w-5 h-5" /> DIY Building Blocks
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Components to assemble your custom solution. Swap any piece for an alternative.
                          </p>
                          <div className="space-y-3">
                            {stack.building_blocks.map((bb, i) => {
                              const selected = selectedBlocks[bb.category];
                              const active = selected || bb.primary;
                              return (
                                <motion.div
                                  key={bb.category}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="neo-card p-5 border-2 border-foreground"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5">
                                      {bb.category}
                                    </span>
                                  </div>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold">{active.name}</h4>
                                        {active.stars && (
                                          <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                                            <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {active.stars}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground">{active.description}</p>
                                    </div>
                                  </div>

                                  {/* Alternatives */}
                                  {bb.alternatives && bb.alternatives.filter(a => a.githubUrl).length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span className="text-xs text-muted-foreground py-1">Swap for:</span>
                                      <button
                                        onClick={() => setSelectedBlocks(prev => ({ ...prev, [bb.category]: undefined }))}
                                        className={`text-xs px-2 py-1 border-2 border-foreground rounded font-semibold ${!selected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                      >
                                        {bb.primary.name}
                                      </button>
                                      {bb.alternatives.filter(a => a.githubUrl).map((alt) => (
                                        <button
                                          key={alt.name}
                                          onClick={() => setSelectedBlocks(prev => ({ ...prev, [bb.category]: alt }))}
                                          className={`text-xs px-2 py-1 border-2 border-foreground rounded font-semibold transition-colors ${
                                            selected?.name === alt.name ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                          }`}
                                          title={alt.why}
                                        >
                                          {alt.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 mt-8">
                    <button
                      onClick={handleSave}
                      disabled={saved}
                      className={`neo-btn px-6 py-3 flex-1 font-bold ${saved ? 'bg-green-100 border-green-400 text-green-700 cursor-default' : 'neo-btn-primary'}`}
                      data-testid="save-stack"
                    >
                      {saved
                        ? <><BookmarkCheck className="w-5 h-5 mr-2" /> Saved to My Stacks</>
                        : <><BookmarkPlus className="w-5 h-5 mr-2" /> Save Stack</>}
                    </button>
                    <button
                      onClick={() => {
                        const text = `My stack for "${idea}":\n${flatStack.map((t, i) => `${i+1}. ${t.name}`).join(', ')}\n\nBuilt with @GitStackDev: ${window.location.origin}/stack-generator`;
                        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                        trackEvent("stack_shared", { platform: "twitter", idea: idea.slice(0, 50) });
                        window.open(xUrl, '_blank');
                      }}
                      className="neo-btn px-6 py-3 flex-1"
                      style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
                      data-testid="share-twitter"
                    >
                      <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      Share on X
                    </button>
                    <button
                      onClick={() => {
                        const text = flatStack.map((t, i) => `${i+1}. ${t.name}: ${t.description}`).join('\n');
                        navigator.clipboard.writeText(text);
                        toast.success("Details copied!");
                      }}
                      className="neo-btn neo-btn-secondary px-6 py-3"
                      data-testid="copy-stack"
                    >
                      <Copy className="w-5 h-5 mr-2" /> Copy
                    </button>
                  </div>

                  {/* Publish + Email */}
                  <div className="neo-card p-5 bg-pastel-mint border-2 border-black mt-2 text-black">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                          <Globe className="w-4 h-4" /> Share a public link
                        </p>
                        <p className="text-xs text-black">Anyone with the link can view and copy your stack.</p>
                      </div>
                      {publicSlug ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            readOnly
                            value={`${window.location.origin}/s/${publicSlug}`}
                            className="neo-input px-4 py-2 text-sm flex-1 min-w-0 bg-background border-black text-black"
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/s/${publicSlug}`); toast.success("Link copied!"); }}
                            className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black whitespace-nowrap"
                          >
                            Copy link
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handlePublish}
                          disabled={publishing}
                          className="neo-btn neo-btn-primary px-5 py-2 text-sm font-black flex items-center gap-2 disabled:opacity-50"
                          data-testid="publish-stack"
                        >
                          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Globe className="w-4 h-4" /> Publish</>}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="neo-card p-5 bg-pastel-yellow border-2 border-black mt-2 text-black">
                    <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4" /> Save to email
                    </p>
                    <form onSubmit={handleEmailStack} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="neo-input px-4 py-2 text-sm flex-1 bg-background border-black text-foreground"
                        disabled={emailSent}
                      />
                      <button
                        type="submit"
                        disabled={emailSent || !email.trim()}
                        className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black whitespace-nowrap disabled:opacity-50"
                      >
                        {emailSent ? "Saved!" : "Send me this"}
                      </button>
                    </form>
                  </div>

                  {/* Phase 4: Complete Solutions section */}
                  {(completeSolutions.length > 0 || solutionsLoading) && (
                    <div className="neo-card p-5 bg-pastel-lavender/30 border-2 border-black mt-2">
                      <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2 mb-3">
                        <Rocket className="w-4 h-4" /> Or skip assembly — use a complete solution
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        These repos solve your problem end-to-end. No assembly required.
                      </p>
                      {solutionsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Finding complete solutions...
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {completeSolutions.map((sol) => (
                            <Link
                              key={sol.full_name}
                              to={`/r/${sol.full_name}`}
                              className="flex items-start gap-3 p-3 rounded-lg border-2 border-foreground/20 hover:border-foreground hover:bg-background transition-all block"
                            >
                              <div className="w-8 h-8 rounded bg-foreground text-background flex items-center justify-center font-black text-sm flex-shrink-0">
                                {(sol.name || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-sm">{sol.name}</span>
                                  <span className="text-[10px] font-bold bg-foreground text-background px-1.5 py-0.5 flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5" /> {typeof sol.stars === "number" ? sol.stars >= 1000 ? `${(sol.stars/1000).toFixed(1)}k` : sol.stars : sol.stars}
                                  </span>
                                  {sol.language && sol.language !== "Unknown" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted rounded">{sol.language}</span>
                                  )}
                                  {sol.language && sol.language !== "Unknown" && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">{sol.language}</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{sol.description}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1 text-muted-foreground" />
                            </Link>
                          ))}
                          <Link
                            to={`/solution-finder?query=${encodeURIComponent(idea)}`}
                            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline mt-1"
                          >
                            See all solutions for this problem <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Setup Guide Tab ── */}
              {activeTab === "setup" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-sm font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Step-by-step setup for your entire stack
                    </p>
                    <span className="text-xs font-bold bg-pastel-mint text-black border-2 border-black px-2 py-1">
                      Est. time: {totalTime}
                    </span>
                  </div>

                  {/* Step 1: Clone */}
                  {cloneCommands.length > 0 && (
                    <div className="neo-card bg-background overflow-hidden">
                      <div className="p-5">
                        <h3 className="font-black text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center">1</span>
                          Clone all repositories
                        </h3>
                        <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group">
                          <pre className="whitespace-pre">{cloneCommands.join("\n")}</pre>
                          <button
                            onClick={() => { navigator.clipboard.writeText(cloneCommands.join("\n")); toast.success("Clone commands copied!"); }}
                            className="absolute top-2 right-2 bg-background text-foreground px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3 h-3 inline mr-1" /> Copy All
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Install & Start */}
                  <div className="neo-card bg-background overflow-hidden">
                    <div className="p-5">
                      <h3 className="font-black text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center">2</span>
                        Install & Start
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Run these commands in your project folder:
                      </p>
                      <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group mb-3">
                        <pre className="whitespace-pre">npm install</pre>
                        <button
                          onClick={() => { navigator.clipboard.writeText("npm install"); toast.success("Command copied!"); }}
                          className="absolute top-2 right-2 bg-background text-foreground px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Copy
                        </button>
                      </div>
                      <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group">
                        <pre className="whitespace-pre">npm run dev</pre>
                        <button
                          onClick={() => { navigator.clipboard.writeText("npm run dev"); toast.success("Command copied!"); }}
                          className="absolute top-2 right-2 bg-background text-foreground px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3+: Per-tool setup steps */}
                  {flatStack.map((tool, i) => (
                    <div key={`setup-${tool.name}`} className="neo-card bg-background overflow-hidden">
                      <div className="p-5">
                        <h3 className="font-black text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                          <span className="w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center">{i + 3}</span>
                          Configure {tool.name}
                        </h3>
                        <ol className="space-y-2">
                          {tool.setupSteps?.map((step, j) => (
                            <li key={j} className="flex gap-3 items-start text-sm">
                              <span className="w-5 h-5 bg-muted border border-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                {j + 1}
                              </span>
                              <span className="text-foreground">{step}</span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-4 pt-4 border-t border-foreground/10">
                          <a
                            href={tool.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="neo-btn neo-btn-secondary px-4 py-2 text-xs font-bold bg-background inline-flex items-center gap-2"
                          >
                            <ExternalLink className="w-3 h-3" /> View {tool.name} repo
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Copy entire setup guide */}
                  <button
                    onClick={() => {
                      const fullGuide = [
                        `# Setup Guide: ${idea}`,
                        ``,
                        `## Step 1: Clone repositories`,
                        cloneCommands.join("\n"),
                        ``,
                        `## Step 2: Install dependencies`,
                        `npm install`,
                        ``,
                        `## Step 3: Start the app`,
                        `npm run dev`,
                        ``,
                        ...stack.flatMap((t, i) => [
                          `## Step ${i + 4}: Configure ${t.name}`,
                          ...(t.setupSteps || []).map((s, j) => `${j + 1}. ${s}`),
                          ``,
                        ]),
                      ].join("\n");
                      navigator.clipboard.writeText(fullGuide);
                      trackEvent("setup_guide_copied", { idea: idea.slice(0, 50), tool_count: flatStack.length });
                      toast.success("Full setup guide copied!");
                    }}
                    className="neo-btn neo-btn-primary px-6 py-3 w-full font-black"
                  >
                    <Download className="w-5 h-5 mr-2" /> Copy Entire Setup Guide
                  </button>
                </div>
              )}

              {/* ── Master Prompt Tab ── */}
              {activeTab === "prompt" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-mono uppercase tracking-wider text-muted-foreground font-bold">
                        Master Prompt for AI Coding Assistants
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Copy-paste this into Cursor, v0, Replit, Claude, ChatGPT, Bolt, or Lovable
                      </p>
                    </div>
                  </div>

                  {/* Instant Prompt */}
                  <div className="neo-card bg-background overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                          <FileCode className="w-4 h-4" /> Instant Prompt
                        </h3>
                        <span className="text-[10px] font-black bg-pastel-mint text-black border border-black px-2 py-0.5 uppercase">Ready now</span>
                      </div>
                      <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{masterPrompt || instantPrompt}</pre>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(masterPrompt || instantPrompt);
                            trackEvent("master_prompt_copied", { idea: idea.slice(0, 50), enhanced: !!masterPrompt, tool_count: flatStack.length });
                            toast.success("Master prompt copied!");
                          }}
                          className="absolute top-2 right-2 bg-background text-foreground px-3 py-1.5 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Prompt
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Prompt CTA */}
                  {!masterPrompt && (
                    <div className="neo-card p-5 bg-pastel-lavender border-2 border-black text-black">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                            <Wand2 className="w-4 h-4" /> Want a better prompt?
                          </p>
                          <p className="text-xs text-black mt-1">
                            Our AI can generate a more detailed, contextual prompt with inter-service connections, environment variables, and troubleshooting tips.
                          </p>
                        </div>
                        <button
                          onClick={handleGenerateEnhancedPrompt}
                          disabled={generatingPrompt}
                          className="neo-btn neo-btn-primary px-5 py-2 text-sm font-black flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                          {generatingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Generate Enhanced</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {masterPrompt && (
                    <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Enhanced prompt generated! This version includes inter-service connections and troubleshooting tips.
                    </div>
                  )}

                  {/* Supported platforms */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground font-bold uppercase">Works with:</span>
                    {['Cursor', 'v0', 'Replit', 'Claude', 'ChatGPT', 'Bolt', 'Lovable'].map(p => (
                      <span key={p} className="text-xs bg-muted border border-foreground px-2 py-0.5 font-mono">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StackToolCard({ tool, index, expanded, onToggle }) {
  return (
    <motion.div layout className="neo-card bg-background overflow-hidden">
      <div className="flex gap-3 p-6 cursor-pointer" onClick={onToggle}>
        <div className="w-10 h-10 bg-primary text-primary-foreground flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-black text-base leading-tight">{tool.name}</h3>
            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{tool.category}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-bold px-2 py-1 border border-black text-black ${tool.difficulty === 'Beginner' ? 'bg-pastel-mint' : tool.difficulty === 'Intermediate' ? 'bg-pastel-yellow' : 'bg-pastel-orange'}`}>
              {tool.difficulty}
            </span>
            <span className="text-xs text-black flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" /> {tool.setupTime}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <p className="text-foreground mb-4 leading-relaxed">{tool.description}</p>

        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t-2 border-foreground/10 pt-4 mt-4 bg-muted -mx-6 px-6 pb-4">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Setup Blueprint
                </h4>
                <ol className="space-y-3">
                  {tool.setupSteps?.map((step, j) => (
                    <li key={`setup-${tool.name}-${j}`} className="flex gap-3 items-start">
                      <span className="w-6 h-6 bg-foreground text-background text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      <span className="text-sm text-foreground font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-foreground/5">
                  <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-secondary px-6 py-2 text-sm bg-background">
                    <ExternalLink className="w-4 h-4 mr-2" /> View Repo
                  </a>
                  <button onClick={onToggle} className="text-sm font-bold text-muted-foreground hover:text-foreground hover:underline underline-offset-4">
                    Close Blueprint
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={onToggle}
              className="neo-btn neo-btn-secondary px-6 py-2 text-sm font-bold bg-background group"
            >
              Set this up <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
