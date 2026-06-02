import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Search, Loader2, Star, ExternalLink, Container, Globe,
  Code, Monitor, ChevronDown, ChevronUp, ArrowRight,
  Sparkles, Database, Zap, ThumbsUp, Copy, Check, Shield
} from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { trackEvent } from "../utils/analytics";
import { ShareButtons } from "../components/ShareButtons";

const PLACEHOLDERS = [
  "AI-powered LinkedIn outreach that finds leads automatically",
  "Self-hosted email marketing platform like Mailchimp",
  "Open source CRM with deal tracking and pipelines",
  "Invoice management for freelancers",
  "AI chatbot builder with RAG support",
  "Self-hosted project management like Jira",
  "Open source analytics like Google Analytics",
  "Video conferencing platform like Zoom",
];

const LOADING_MESSAGES = [
  { layer: 1, text: "Searching our database...", icon: Database },
  { layer: 2, text: "Searching GitHub live...", icon: Globe },
  { layer: 3, text: "Asking AI for suggestions...", icon: Sparkles },
];

function HealthBar({ score }) {
  const color = score >= 70 ? "bg-green-500" : score >= 40 ? "bg-yellow-500" : "bg-red-500";
  const label = score >= 70 ? "Healthy" : score >= 40 ? "Fair" : "Stale";
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase border-2 border-foreground ${className}`}>
      {children}
    </span>
  );
}

function SolutionCard({ sol, onUpvote, query, position }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [localUpvoted, setLocalUpvoted] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(sol.upvotes || 0);

  // Send click feedback to backend
  const sendFeedback = (action) => {
    try {
      axios.post(`${API}/search/feedback`, {
        query: query || "",
        full_name: sol.full_name || sol.name || "",
        action,
        position: position || 1,
        session_id: localStorage.getItem("gitstack_session") || "anonymous",
      });
    } catch (e) {
      // Silent fail
    }
  };

  // Track impression when card mounts
  useEffect(() => {
    const timer = setTimeout(() => sendFeedback("impression"), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGitHubClick = () => {
    sendFeedback("click");
  };

  const dockerCmd = sol.has_docker
    ? `docker run -d -p 3000:3000 ${sol.full_name?.split("/")[1] || sol.name}`
    : null;

  const copyDocker = () => {
    navigator.clipboard.writeText(dockerCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const starsDisplay = typeof sol.stars === "number"
    ? sol.stars >= 1000 ? `${(sol.stars / 1000).toFixed(1)}k` : sol.stars
    : sol.stars;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="neo-card p-5 relative group"
    >
      {/* Source badge */}
      {(sol.match_source || sol.source) && (
        <div className="absolute top-3 right-3">
          <Badge className={
            (sol.match_source === "local_db" || sol.source === "bm25" || sol.source === "curated") ? "bg-green-100 text-green-800" :
            (sol.match_source === "github_live" || sol.source === "github_live") ? "bg-blue-100 text-blue-800" :
            (sol.match_source === "ai_discovered" || sol.source === "llm") ? "bg-purple-100 text-purple-800" :
            "bg-gray-100 text-gray-800"
          }>
            {(sol.match_source === "local_db" || sol.source === "bm25" || sol.source === "curated") ? "📦 In Database" :
             (sol.match_source === "github_live" || sol.source === "github_live") ? "🔍 Found on GitHub" :
             (sol.match_source === "ai_discovered" || sol.source === "llm") ? "🤖 AI Discovered" :
             "⭐ Trending"}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3 pr-16 sm:pr-28">
        <div className="w-10 h-10 rounded-lg bg-foreground text-background flex items-center justify-center font-black text-lg flex-shrink-0">
          {(sol.name || "?")[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-black truncate">{sol.name}</h3>
          <p className="text-xs text-muted-foreground truncate">{sol.full_name}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{sol.description}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 text-xs font-bold">
          <Star className="w-3 h-3 text-yellow-500" /> {starsDisplay}
        </span>
        {sol.language && sol.language !== "Unknown" && (
          <span className="text-xs font-bold px-2 py-0.5 bg-muted rounded">{sol.language}</span>
        )}
        {sol.health_score > 0 && <HealthBar score={sol.health_score} />}
        {sol._score > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded" title="Search relevance score">
            Score: {sol._score}
          </span>
        )}
      </div>

      {/* Capability badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {sol.has_docker && <Badge className="bg-blue-50"><Container className="w-3 h-3" /> Docker</Badge>}
        {sol.has_api && <Badge className="bg-green-50"><Code className="w-3 h-3" /> API</Badge>}
        {sol.has_ui && <Badge className="bg-purple-50"><Monitor className="w-3 h-3" /> UI</Badge>}
        {sol.license && <Badge className="bg-gray-50"><Shield className="w-3 h-3" /> {sol.license}</Badge>}
      </div>

      {/* Use case pills */}
      {sol.use_cases && sol.use_cases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sol.use_cases.slice(0, 4).map((uc, i) => (
            <span key={i} className="px-2 py-0.5 text-[10px] font-bold bg-primary/10 text-primary rounded-full">
              {uc}
            </span>
          ))}
        </div>
      )}

      {/* Replaces SaaS */}
      {sol.replaces_saas && sol.replaces_saas.length > 0 && (
        <div className="text-xs text-muted-foreground mb-3">
          <span className="font-bold">Replaces:</span>{" "}
          {sol.replaces_saas.join(", ")}
        </div>
      )}

      {/* Match reason */}
      {sol.match_reason && (
        <p className="text-xs italic text-muted-foreground mb-3">💡 {sol.match_reason}</p>
      )}

      {/* Expandable section */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-bold text-primary flex items-center gap-1 mb-3 hover:underline"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Less" : "More details"}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Docker deploy */}
            {dockerCmd && (
              <div className="mb-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-bold mb-1">🐳 Quick Deploy:</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 overflow-x-auto">{dockerCmd}</code>
                  <button onClick={copyDocker} className="p-1 hover:bg-background rounded">
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            )}

            {/* Deploy links */}
            {sol.has_docker && (
              <div className="flex gap-2 mb-3">
                <a
                  href={`https://railway.app/template/${sol.full_name}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-bold px-2 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                >
                  Deploy on Railway →
                </a>
                <a
                  href={`https://render.com/deploy?repo=https://github.com/${sol.full_name}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Deploy on Render →
                </a>
              </div>
            )}

            {/* Complementary tools */}
            {sol.complementary_tools && sol.complementary_tools.length > 0 && (
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-bold">Works well with:</span>{" "}
                {sol.complementary_tools.join(", ")}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Link
          to={`/repo-translator?url=${encodeURIComponent('https://github.com/' + (sol.full_name || sol.name))}&auto=true`}
          className="neo-btn neo-btn-primary px-3 py-1.5 text-xs font-black flex items-center gap-1"
        >
          Translate <ArrowRight className="w-3 h-3" />
        </Link>
        <a
          href={sol.affiliate_url || sol.html_url || `https://github.com/${sol.full_name}`}
          target="_blank" rel="noopener noreferrer"
          onClick={handleGitHubClick}
          className="neo-btn px-3 py-1.5 text-xs font-black flex items-center gap-1"
        >
          {sol.affiliate_url ? "Get Started" : "GitHub"} <ExternalLink className="w-3 h-3" />
        </a>
        {sol.affiliate_url && (
          <span className="text-[9px] text-muted-foreground">Affiliate link</span>
        )}
        <ShareButtons
          url={`https://gitstack.pro/r/${sol.full_name}`}
          title={`Check out ${sol.name} on GitStack`}
          className="ml-auto"
        />
        <button
          onClick={() => {
            if (localUpvoted) return;
            onUpvote(sol.full_name);
            setLocalUpvoted(true);
            setLocalUpvotes(u => u + 1);
          }}
          disabled={localUpvoted}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors border-2 border-black ${localUpvoted ? "text-primary bg-primary/10" : "hover:bg-muted bg-background"}`}
          title="Upvote this solution"
        >
          <ThumbsUp className={`w-4 h-4 ${localUpvoted ? "fill-current" : ""}`} />
          <span>{localUpvotes}</span>
        </button>
      </div>
    </motion.div>
  );
}

function CompareTable({ solutions }) {
  const [open, setOpen] = useState(false);
  if (solutions.length < 2) return null;

  const cols = solutions.slice(0, 4);
  return (
    <div className="neo-card p-5 mt-6">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-lg font-black uppercase w-full"
      >
        {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        Compare Solutions ({cols.length})
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-x-auto mt-4"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-foreground">
                  <th className="text-left py-2 font-black">Feature</th>
                  {cols.map(s => (
                    <th key={s.full_name} className="text-left py-2 font-black">{s.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="py-2 font-bold">Stars</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{typeof s.stars === "number" ? s.stars.toLocaleString() : s.stars}</td>)}
                </tr>
                <tr className="border-b"><td className="py-2 font-bold">Language</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{s.language}</td>)}
                </tr>
                <tr className="border-b"><td className="py-2 font-bold">Docker</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{s.has_docker ? "✅" : "❌"}</td>)}
                </tr>
                <tr className="border-b"><td className="py-2 font-bold">API</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{s.has_api ? "✅" : "❌"}</td>)}
                </tr>
                <tr className="border-b"><td className="py-2 font-bold">UI</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{s.has_ui ? "✅" : "❌"}</td>)}
                </tr>
                <tr className="border-b"><td className="py-2 font-bold">Health</td>
                  {cols.map(s => <td key={s.full_name} className="py-2"><HealthBar score={s.health_score || 0} /></td>)}
                </tr>
                <tr><td className="py-2 font-bold">License</td>
                  {cols.map(s => <td key={s.full_name} className="py-2">{s.license || "—"}</td>)}
                </tr>
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SolutionFinder() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLayer, setLoadingLayer] = useState(0);
  const [results, setResults] = useState(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const inputRef = useRef(null);

  // Rotate placeholder
  useEffect(() => {
    const iv = setInterval(() => setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length), 4000);
    return () => clearInterval(iv);
  }, []);

  // Auto-search from URL query param (e.g. /solution-finder?query=AI+outreach)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const q = searchParams.get("query");
    if (q && !results && !loading) {
      setQuery(q);
      // Trigger search on next tick after state updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-search when query is set from URL param
  const [autoSearched, setAutoSearched] = useState(false);
  useEffect(() => {
    const q = searchParams.get("query");
    if (q && query === q && !autoSearched && !loading && !results) {
      setAutoSearched(true);
      handleSearch(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSearch = async (pageNum = 1, isPageChange = false) => {
    if (!query.trim() || loading) return;
    setLoading(true);
    if (!isPageChange) {
      setResults(null);
      setLoadingLayer(1);
    }
    trackEvent("solution_finder_search", { query, page: pageNum });

    // Simulate layer progression for UX (only on new search, not page change)
    let layerTimer1, layerTimer2;
    if (!isPageChange) {
      layerTimer1 = setTimeout(() => setLoadingLayer(2), 1500);
      layerTimer2 = setTimeout(() => setLoadingLayer(3), 4000);
    }

    try {
      const res = await axios.post(`${API}/ai/solution-finder`, {
        query: query.trim(),
        limit: 100,
        page: pageNum,
        per_page: perPage
      });
      setResults(res.data);
      setPage(pageNum);
    } catch (err) {
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingLayer(0);
      if (layerTimer1) clearTimeout(layerTimer1);
      if (layerTimer2) clearTimeout(layerTimer2);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage === page) return;
    setPage(newPage);
    handleSearch(newPage, true);
  };

  const handleUpvote = async (fullName) => {
    try {
      await axios.post(`${API}/ai/solution-finder/upvote`, {
        full_name: fullName,
        use_case: query.trim().slice(0, 100),
      }, { withCredentials: true });
      toast.success("Upvoted!");
    } catch {
      toast.error("Login to upvote");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(1);
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Solution Finder — Find Ready-to-Deploy Open Source Projects | GitStack"
        description="Describe your business problem and instantly find complete, ready-to-deploy open-source solutions. No assembly required."
        path="/solution-finder"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Find Ready-to-Deploy Open Source Solutions",
          "description": "Describe your business need and GitStack's AI finds complete open-source projects you can deploy today.",
          "totalTime": "PT1M",
          "tool": [{ "@type": "HowToTool", "name": "GitStack Solution Finder" }],
          "step": [
            {
              "@type": "HowToStep",
              "name": "Describe your business need",
              "text": "Enter what you're trying to accomplish in plain English. Example: 'I need a self-hosted CRM for my sales team.'",
              "url": "https://www.gitstack.pro/solution-finder"
            },
            {
              "@type": "HowToStep",
              "name": "Review AI-matched solutions",
              "text": "GitStack searches 15,000+ repos and uses AI to find the best complete solutions for your exact use case.",
              "url": "https://www.gitstack.pro/solution-finder"
            },
            {
              "@type": "HowToStep",
              "name": "Deploy your chosen solution",
              "text": "Each result includes a direct GitHub link, setup difficulty rating, and plain-English explanation to get you running fast.",
              "url": "https://www.gitstack.pro/solution-finder"
            }
          ]
        }}
      />
      <Header />

      <main id="main-content" className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-1.5 text-xs font-black uppercase mb-4">
            <Search className="w-4 h-4" /> Solution Finder
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4">
            Find a <span className="text-primary">Ready-Made</span> Solution
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Describe what you need. We'll find complete, deployable open-source projects — not building blocks.
            One <code className="text-xs bg-muted px-1.5 py-0.5 rounded">docker run</code> and you're live.
          </p>
        </motion.div>

        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="neo-card p-6 mb-8"
        >
          <label className="text-sm font-black uppercase mb-2 block">What do you want to solve?</label>
          <textarea
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            rows={3}
            maxLength={500}
            className="w-full p-4 border-2 border-foreground rounded-lg text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{query.length}/500</span>
            <button
              onClick={() => handleSearch(1)}
              disabled={!query.trim() || loading}
              className="neo-btn neo-btn-primary px-8 py-3 font-black text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching..." : "Find Solutions"}
            </button>
          </div>
        </motion.div>

        {/* Loading indicator */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="neo-card p-6 mb-8"
            >
              <div className="space-y-3">
                {LOADING_MESSAGES.map((msg) => {
                  const Icon = msg.icon;
                  const isActive = loadingLayer === msg.layer;
                  const isDone = loadingLayer > msg.layer;
                  return (
                    <div
                      key={msg.layer}
                      className={`flex items-center gap-3 text-sm transition-all ${
                        isActive ? "text-primary font-bold" : isDone ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4 opacity-40" />
                      )}
                      {msg.text}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {results && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {results.solutions && results.solutions.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black uppercase">
                    {results.total} Solution{results.total !== 1 ? "s" : ""} Found
                    {results.pagination && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (page {results.pagination.page} of {results.pagination.total_pages})
                      </span>
                    )}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3" />
                    {results.layer_used === "local_db" ? "Instant from our database" :
                     results.layer_used === "github_live" ? "Found live on GitHub" :
                     "AI-discovered"}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {results.solutions.map((sol, idx) => (
                    <SolutionCard
                      key={sol.full_name || sol.name}
                      sol={sol}
                      onUpvote={handleUpvote}
                      query={query}
                      position={idx + 1}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {results.pagination && results.pagination.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={!results.pagination.has_prev}
                      className="neo-btn px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.min(5, results.pagination.total_pages) }, (_, i) => {
                      let pageNum;
                      if (results.pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (results.pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (results.pagination.page >= results.pagination.total_pages - 2) {
                        pageNum = results.pagination.total_pages - 4 + i;
                      } else {
                        pageNum = results.pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`neo-btn px-3 py-2 text-sm ${
                            pageNum === results.pagination.page ? 'neo-btn-primary' : ''
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={!results.pagination.has_next}
                      className="neo-btn px-3 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next →
                    </button>
                  </div>
                )}

                {/* Compare table */}
                <CompareTable solutions={results.solutions} />
              </>
            ) : (
              /* No results — fallback CTA */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-10 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-black uppercase mb-2">
                  No one's built this yet
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your idea is novel — there's no complete open-source solution for this. You could be the first to build it.
                </p>
                <Link
                  to={`/stack-generator`}
                  className="neo-btn neo-btn-primary px-8 py-3 font-black inline-flex items-center gap-2"
                >
                  Build It From Scratch <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Empty state — before first search */}
        {!results && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-3 gap-4 mt-8"
          >
            {[
              { icon: Database, title: "15K+ Repos", desc: "Pre-tagged and classified by business use case" },
              { icon: Globe, title: "Live GitHub Search", desc: "Find repos we haven't scraped yet — cached for next time" },
              { icon: Sparkles, title: "AI Discovery", desc: "Gemini suggests repos that don't match keyword search" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="neo-card p-5 text-center">
                <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-black text-sm uppercase mb-1">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
