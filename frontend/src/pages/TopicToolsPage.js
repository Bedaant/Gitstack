import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Star, ArrowLeft, Sparkles, Clock, Filter } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { useAuth } from "../context/AuthContext";

const DIFFICULTY_COLORS = {
  Beginner: "badge-beginner",
  Intermediate: "badge-intermediate",
  Advanced: "badge-advanced",
};

const SOURCE_LABELS = {
  curated: { label: "Curated", cls: "bg-purple-100 text-purple-700 border border-purple-200" },
  github_cached: { label: "GitHub", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  github: { label: "GitHub", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  trending: { label: "🔥 Trending", cls: "bg-orange-100 text-orange-700 border border-orange-200" },
};

// Sub-category groupings shown as filter chips per topic
const TOPIC_SUBCATEGORIES = {
  "ai-coding-tools": [
    { id: "all", label: "All Tools" },
    { id: "mcp", label: "MCP Servers" },
    { id: "cursor", label: "Cursor Rules" },
    { id: "claude", label: "Claude Code" },
    { id: "awesome", label: "Awesome Lists" },
    { id: "skills", label: "Skills & Agents" },
    { id: "practice", label: "Best Practices" },
  ],
  "ai-memory-pkm": [
    { id: "all", label: "All Tools" },
    { id: "obsidian", label: "Obsidian Plugins" },
    { id: "memory", label: "AI Memory" },
    { id: "graph", label: "Knowledge Graphs" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "local-ai": [
    { id: "all", label: "All Tools" },
    { id: "ollama", label: "Ollama" },
    { id: "inference", label: "Inference Engines" },
    { id: "models", label: "Model Tools" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "mcp-tools": [
    { id: "all", label: "All Tools" },
    { id: "server", label: "MCP Servers" },
    { id: "client", label: "MCP Clients" },
    { id: "awesome", label: "Awesome MCP" },
  ],
  "ai-agents-advanced": [
    { id: "all", label: "All Tools" },
    { id: "browser", label: "Browser Agents" },
    { id: "multi", label: "Multi-Agent" },
    { id: "computer", label: "Computer Use" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "ai-agents": [
    { id: "all", label: "All Tools" },
    { id: "llm", label: "LLM Frameworks" },
    { id: "rag", label: "RAG Tools" },
    { id: "chatbot", label: "Chatbots" },
    { id: "awesome", label: "Awesome Lists" },
    { id: "prompt", label: "Prompts" },
  ],
  "automation": [
    { id: "all", label: "All Tools" },
    { id: "workflow", label: "Workflow" },
    { id: "devops", label: "DevOps" },
    { id: "cli", label: "CLI Tools" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "data-analytics": [
    { id: "all", label: "All Tools" },
    { id: "database", label: "Databases" },
    { id: "visualization", label: "Visualization" },
    { id: "pipeline", label: "Data Pipeline" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "voice-speech-ai": [
    { id: "all", label: "All Tools" },
    { id: "tts", label: "Text-to-Speech" },
    { id: "stt", label: "Speech-to-Text" },
    { id: "voice-cloning", label: "Voice Cloning" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "code-quality-review": [
    { id: "all", label: "All Tools" },
    { id: "lint", label: "Linters" },
    { id: "static-analysis", label: "Static Analysis" },
    { id: "security", label: "Security/SAST" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "rag-vector-search": [
    { id: "all", label: "All Tools" },
    { id: "vector", label: "Vector DBs" },
    { id: "embedding", label: "Embeddings" },
    { id: "retrieval", label: "Retrieval Tools" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "scraping-data-extraction": [
    { id: "all", label: "All Tools" },
    { id: "scraper", label: "Web Scrapers" },
    { id: "headless", label: "Headless Browsers" },
    { id: "pipeline", label: "ETL" },
    { id: "awesome", label: "Awesome Lists" },
  ],
  "terminal-shell": [
    { id: "all", label: "All Tools" },
    { id: "shell", label: "Shells & Prompt" },
    { id: "tui", label: "Terminal UIs (TUI)" },
    { id: "dotfiles", label: "Dotfiles" },
    { id: "awesome", label: "Awesome Lists" },
  ],
};

function filterToolsBySubcategory(tools, subcategoryId) {
  if (!subcategoryId || subcategoryId === "all") return tools;
  return tools.filter(tool => {
    const text = [
      tool.name || "",
      tool.description || "",
      ...(tool.topics || []),
      ...(tool.tags || []),
    ].join(" ").toLowerCase();
    return text.includes(subcategoryId.toLowerCase());
  });
}

export default function TopicToolsPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const { user } = useAuth();

  useEffect(() => {
    const fetchTopicTools = async () => {
      try {
        const res = await axios.get(`${API}/topics/${topicId}/tools`);
        setTopic(res.data.topic);
        setTools(res.data.tools);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTopicTools();
    setActiveFilter("all");
    setDifficulty("all");
  }, [topicId]);

  // Track activity for recommendations (fire and forget)
  useEffect(() => {
    if (!user || !topicId) return;
    axios.post(`${API}/activity`, { event_type: "topic_visited", entity_id: topicId }, { withCredentials: true }).catch(() => {});
  }, [user, topicId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="spinner"></div>
          <p className="font-bold text-lg animate-pulse">Loading tools...</p>
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold">Topic not found</h1>
          <Link to="/tools" className="neo-btn neo-btn-primary mt-4 px-6 py-2">Browse All Tools</Link>
        </div>
      </div>
    );
  }

  // Handle click: curated tools → /tools/:id, GitHub repos → /repo/:owner/:repo (translator)
  const handleToolClick = (tool) => {
    if (tool.full_name) {
      // GitHub repo — go through AI translator
      const [owner, repo] = tool.full_name.split("/");
      navigate(`/repo/${owner}/${repo}`);
    } else if (tool.tool_id) {
      // Curated tool
      navigate(`/tools/${tool.tool_id}`);
    } else if (tool.html_url || tool.github_url) {
      window.open(tool.html_url || tool.github_url, "_blank");
    }
  };

  const subcats = TOPIC_SUBCATEGORIES[topicId] || null;

  // Apply filters
  let displayTools = tools;
  if (activeFilter !== "all") {
    displayTools = filterToolsBySubcategory(displayTools, activeFilter);
  }
  if (difficulty !== "all") {
    displayTools = displayTools.filter(t =>
      (t.difficulty || "").toLowerCase() === difficulty
    );
  }

  return (
    <div className="min-h-screen">
      <SEO
        title={`${topic.name} — Open Source Tools`}
        description={`${displayTools.length} open-source tools for ${topic.name}. Self-hosted alternatives, free for non-technical founders. Curated with setup guides and difficulty ratings.`}
        path={`/topics/${topicId}`}
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => navigate("/tools")}
            className="flex items-center gap-2 text-muted-foreground hover:text-muted-foreground font-semibold mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Topics
          </button>

          {/* Hero */}
          <div className={`neo-card p-8 mb-8 ${topic.bg_color || "bg-muted"}`}>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="topic-title">
              {topic.name}
            </h1>
            <p className="text-foreground text-lg">
              {displayTools.length} tools — click any to get plain-English setup guide
            </p>
          </div>

          {/* Sub-category filter chips */}
          {subcats && (
            <div className="flex flex-wrap gap-2 mb-6">
              {subcats.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => setActiveFilter(sc.id)}
                  className={`px-4 py-1.5 text-sm font-bold border-2 border-foreground transition-all ${
                    activeFilter === sc.id
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {sc.label}
                </button>
              ))}
            </div>
          )}

          {/* Difficulty filter */}
          <div className="flex items-center gap-3 mb-8">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-semibold">Difficulty:</span>
            {["all", "beginner", "intermediate", "advanced"].map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-3 py-1 text-xs font-bold capitalize border transition-all ${
                  difficulty === d
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:border-foreground"
                }`}
              >
                {d === "all" ? "All Levels" : d}
              </button>
            ))}
          </div>

          {/* Stack Generator CTA */}
          <div className="neo-card p-5 mb-6 bg-pastel-yellow border-2 border-black flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-black">
            <div>
              <p className="font-black text-sm uppercase tracking-wide">Need a full stack?</p>
              <p className="text-xs text-foreground/70 mt-0.5">Tell us what you're building — we'll pick the best {topic.name} tools for your idea.</p>
            </div>
            <Link
              to={`/stack-generator?idea=I want to build something using ${topic.name} tools`}
              className="neo-btn neo-btn-primary px-5 py-2 text-sm font-black whitespace-nowrap flex-shrink-0"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Build My Stack
            </Link>
          </div>

          {/* Tools Grid */}
          {displayTools.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No tools match this filter yet.</p>
              <button onClick={() => { setActiveFilter("all"); setDifficulty("all"); }}
                className="neo-btn neo-btn-primary mt-4 px-6 py-2">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayTools.map(tool => {
                const isCurated = tool.tool_id && !tool.full_name;
                const srcInfo = SOURCE_LABELS[tool.source] || SOURCE_LABELS["github_cached"];
                const stars = tool.stars;
                const starsDisplay = typeof stars === "number"
                  ? stars > 1000 ? `${(stars / 1000).toFixed(1)}k` : stars
                  : stars;

                return (
                  <button
                    key={tool.tool_id || tool.full_name}
                    onClick={() => handleToolClick(tool)}
                    className="neo-card p-5 text-left bg-background hover:shadow-lg transition-all group"
                    data-testid={`tool-${tool.tool_id || tool.repo_id}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2 gap-2">
                      <h3 className="font-black text-base group-hover:text-primary transition-colors leading-tight">
                        {tool.name}
                      </h3>
                      <span className={`text-xs font-bold px-2 py-0.5 whitespace-nowrap ${
                        DIFFICULTY_COLORS[tool.difficulty] || "bg-muted text-muted-foreground"
                      }`}>
                        {tool.difficulty || "Explore"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                      {tool.description || "No description available."}
                    </p>

                    {/* Footer row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {tool.language && tool.language !== "Unknown" && (
                        <span className="font-mono bg-muted px-2 py-0.5 border border-border">
                          {tool.language}
                        </span>
                      )}
                      {starsDisplay && (
                        <span className="flex items-center gap-1 font-semibold">
                          <Star className="w-3 h-3 text-yellow-500" fill="currentColor" />
                          {starsDisplay}
                        </span>
                      )}
                      {tool.setup_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tool.setup_time}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-xs font-bold ${srcInfo.cls}`}>
                        {srcInfo.label}
                      </span>
                    </div>

                    {/* CTA hint */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs font-bold text-primary group-hover:gap-3 transition-all">
                      <Sparkles className="w-3 h-3" />
                      {isCurated ? "View install guide" : "AI plain-English guide →"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
