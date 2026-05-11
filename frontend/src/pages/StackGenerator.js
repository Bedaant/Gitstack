import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronRight, Clock, CheckCircle2, Share2, Copy, BookmarkPlus, BookmarkCheck, ExternalLink, Globe, Mail, Terminal, Wand2, FileCode, Download } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { saveStackLocally, isStackSaved } from "../utils/localStacks";

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

// ── Helper: generate a basic docker-compose template ──
function generateDockerCompose(tools) {
  const services = tools
    .map((t, i) => {
      const name = t.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const repo = parseGitHubUrl(t.githubUrl);
      return repo
        ? `  ${name}:
    image: ${repo.split("/")[0]}/${repo.split("/")[1]}:latest
    container_name: ${name}
    ports:
      - "${3000 + i}:${3000 + i}"
    environment:
      - NODE_ENV=production
    restart: unless-stopped`
        : null;
    })
    .filter(Boolean)
    .join("\n\n");

  return `version: "3.8"

services:
${services}

networks:
  default:
    name: gitstack-network`;
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

  return `I want to build: ${idea}

I have selected these open-source tools:
${toolList}

GitHub repositories:
${repos}

Please generate a complete, production-ready setup:

1. A docker-compose.yml that runs ALL services together with proper networking
2. A .env.example with all required environment variables for each service
3. A setup.sh script that clones repos, builds images, and starts everything with one command
4. Health checks for each service
5. Basic nginx or Caddy reverse proxy config for routing between services
6. Inter-service connection instructions (e.g., how each service talks to the database)
7. A README.md with step-by-step setup instructions that a non-technical person can follow
8. Common pitfalls and troubleshooting tips specific to these tools
9. Default port assignments for each service
10. Security best practices (don't use default passwords in production, etc.)

Make everything work together out of the box. Use realistic port numbers. Include comments explaining what each section does.`;
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

  useEffect(() => {
    if (stack) return;
    saveDraft({ idea, budget, buildingAlone, needsPayments });
  }, [idea, budget, buildingAlone, needsPayments, stack]);

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
    try {
      const res = await axios.post(`${API}/ai/stack-generator`, {
        idea,
        ...(budget && { budget }),
        ...(buildingAlone !== null && { building_alone: buildingAlone }),
        ...(needsPayments !== null && { needs_payments: needsPayments }),
      });
      setStack(res.data.stack || []);
      setSaved(isStackSaved(idea));
      clearDraft();
    } catch (e) {
      toast.error("Failed to generate stack. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!stack || saved) return;
    saveStackLocally(idea, stack);
    setSaved(true);
    toast.success("Stack saved! View it in My Stacks →", {
      action: { label: "View", onClick: () => window.location.href = '/dashboard' },
    });
  };

  const handlePublish = async () => {
    if (!stack || publicSlug || publishing) return;
    setPublishing(true);
    try {
      const name = idea.length > 60 ? idea.slice(0, 57) + '...' : idea;
      const res = await axios.post(`${API}/stacks/publish`, { name, idea, tools: stack });
      setPublicSlug(res.data.stack_id);
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
      await axios.post(`${API}/stacks/email-me`, { email: email.trim(), idea, tools: stack });
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
      const res = await axios.post(`${API}/ai/stack-master-prompt`, { idea, tools: stack });
      setMasterPrompt(res.data.prompt);
      toast.success("Enhanced prompt generated!");
    } catch (e) {
      toast.error("Failed to generate enhanced prompt. Using instant prompt instead.");
      setMasterPrompt(generateInstantPrompt(idea, stack));
    }
    setGeneratingPrompt(false);
  };

  useEffect(() => {
    if (initialIdea && !stack) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pre-compute tab content data
  const cloneCommands = stack ? generateCloneCommands(stack) : [];
  const dockerCompose = stack ? generateDockerCompose(stack) : "";
  const totalTime = stack ? estimateTotalTime(stack) : "";
  const instantPrompt = stack ? generateInstantPrompt(idea, stack) : "";

  return (
    <div className="min-h-screen">
      <SEO
        title="Stack Generator — Find Free Tools for Your Idea"
        description="Tell us what you want to build and we'll generate a complete free open-source tech stack for you. No coding required. Used by 1,000+ founders."
        path="/stack-generator"
      />
      <Header />
      <main className="py-12 px-4">
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

            <button
              onClick={handleGenerate}
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

          {stack && stack.length > 0 && (
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
                <div className="space-y-4">
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
                        const text = `My stack for "${idea}":\n${stack.map((t, i) => `${i+1}. ${t.name}`).join(', ')}\n\nBuilt with @GitStackDev: ${window.location.origin}/stack-generator`;
                        const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
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
                        const text = stack.map((t, i) => `${i+1}. ${t.name}: ${t.description}`).join('\n');
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

                  {/* Step 2: Docker Compose */}
                  <div className="neo-card bg-background overflow-hidden">
                    <div className="p-5">
                      <h3 className="font-black text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 bg-foreground text-background text-xs font-bold flex items-center justify-center">2</span>
                        Start with Docker Compose
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Save this as <code className="font-mono bg-muted px-1">docker-compose.yml</code> and run:
                      </p>
                      <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group mb-3">
                        <pre className="whitespace-pre">{dockerCompose}</pre>
                        <button
                          onClick={() => { navigator.clipboard.writeText(dockerCompose); toast.success("Docker compose copied!"); }}
                          className="absolute top-2 right-2 bg-background text-foreground px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Copy
                        </button>
                      </div>
                      <div className="bg-foreground text-background p-4 font-mono text-sm overflow-x-auto relative group">
                        <pre className="whitespace-pre">docker-compose up -d</pre>
                        <button
                          onClick={() => { navigator.clipboard.writeText("docker-compose up -d"); toast.success("Command copied!"); }}
                          className="absolute top-2 right-2 bg-background text-foreground px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="w-3 h-3 inline mr-1" /> Copy
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Step 3+: Per-tool setup steps */}
                  {stack.map((tool, i) => (
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
                        `## Step 2: Docker Compose`,
                        dockerCompose,
                        ``,
                        `docker-compose up -d`,
                        ``,
                        ...stack.flatMap((t, i) => [
                          `## Step ${i + 3}: Configure ${t.name}`,
                          ...(t.setupSteps || []).map((s, j) => `${j + 1}. ${s}`),
                          ``,
                        ]),
                      ].join("\n");
                      navigator.clipboard.writeText(fullGuide);
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
