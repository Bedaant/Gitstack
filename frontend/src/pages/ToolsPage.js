import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Star, Clock, SlidersHorizontal, ArrowUpDown, X, Sparkles, Skull, BookOpen, Flame, Lightbulb, Scale } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";

const ICON_MAP = {
  Sparkles, Skull, BookOpen, Flame, Lightbulb, Scale
};

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced'];
const SORT_OPTIONS = [
  { value: 'name', label: 'Name A-Z' },
  { value: 'stars-desc', label: 'Most Stars' },
  { value: 'stars-asc', label: 'Least Stars' },
  { value: 'difficulty', label: 'Easiest First' },
];

const parseStars = (stars) => {
  if (typeof stars === 'number') return stars;
  const s = String(stars).replace(/,/g, '');
  return parseInt(s) || 0;
};

const difficultyOrder = { 'Beginner': 0, 'Intermediate': 1, 'Advanced': 2 };

const AI_LABS = [
  { id: 'stack-gen', title: 'Stack Generator', desc: 'Build your entire tech stack from an idea', icon: "Sparkles", path: '/stack-generator', color: 'bg-primary text-primary-foreground' },
  { id: 'dead-tool', title: 'Dead Tool Detector', desc: 'Find free open-source alternatives to paid SaaS', icon: "Skull", path: '/dead-tool-detector', color: 'bg-pastel-pink' },
  { id: 'translator', title: 'Repo Translator', desc: 'Explain any GitHub repo in plain English', icon: "BookOpen", path: '/repo-translator', color: 'bg-muted' },
  { id: 'roast', title: 'Roast My Stack', desc: 'Get brutally honest feedback on your tools', icon: "Flame", path: '/roast-my-stack', color: 'bg-pastel-yellow' },
  { id: 'idea', title: 'Your Idea Exists', desc: 'Find projects already building your idea', icon: "Lightbulb", path: '/idea-exists', color: 'bg-pastel-mint' },
  { id: 'compare', title: 'Comparison Engine', desc: 'Side-by-side analysis for founders', icon: "Scale", path: '/compare', color: 'bg-pastel-lavender' },
];

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sortBy, setSortBy] = useState("stars-desc");
  const [showFilters, setShowFilters] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const [toolsRes, statusRes] = await Promise.all([
          axios.get(`${API}/tools`, { params: { limit: 200 } }),
          axios.get(`${API}/scraper/status`)
        ]);
        setTools(toolsRes.data);
        const curated = toolsRes.data ? toolsRes.data.length : 44;
        const github = (statusRes.data && statusRes.data.total_repos) || 4344;
        setTotalCount(curated + github);
      } catch (e) {
        console.error("Tools load error:", e);
        setTotalCount(4388);
      }
      setLoading(false);
    };

    fetchTools();
  }, []);

  const languages = useMemo(() => {
    const langs = new Set();
    tools.forEach(t => { if (t.language) langs.add(t.language); });
    return ['All', ...Array.from(langs).sort()];
  }, [tools]);

  const filteredTools = useMemo(() => {
    let result = tools.filter(t => {
      const matchSearch = !search || 
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      const matchDifficulty = difficulty === 'All' || t.difficulty === difficulty;
      const matchLanguage = language === 'All' || t.language === language;
      return matchSearch && matchDifficulty && matchLanguage;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'stars-desc': return parseStars(b.stars) - parseStars(a.stars);
        case 'stars-asc': return parseStars(a.stars) - parseStars(b.stars);
        case 'difficulty': return (difficultyOrder[a.difficulty] || 1) - (difficultyOrder[b.difficulty] || 1);
        default: return 0;
      }
    });

    return result;
  }, [tools, search, difficulty, language, sortBy]);

  const activeFilters = (difficulty !== 'All' ? 1 : 0) + (language !== 'All' ? 1 : 0);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Browse 600+ Free Open-Source Tools"
        description="Explore curated free and open-source tools for every founder need — automation, email, databases, auth, analytics and more. All explained in plain English."
        path="/tools"
      />
      <Header />
      <main className="py-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-2">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight" data-testid="tools-page-title">
              All Tools
            </h1>
            <span className="text-sm font-mono text-muted-foreground">{totalCount > 0 ? `${totalCount}+` : '...'} indexed</span>
          </div>
          <p className="text-muted-foreground mb-6">Open-source tools, explained in plain English.</p>

          {/* AI Labs Section */}
          <div className="mb-12">
            <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground mb-4 font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> GitStack Labs / AI Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {AI_LABS.map(lab => {
                const Icon = ICON_MAP[lab.icon];
                return (
                  <button
                    key={lab.id}
                    onClick={() => navigate(lab.path)}
                    className={`neo-card p-4 text-left transition-transform hover:-translate-y-1 ${lab.color}`}
                    data-testid={`lab-card-${lab.id}`}
                  >
                    <Icon className="w-6 h-6 mb-3" />
                    <h3 className="font-bold text-sm mb-1">{lab.title}</h3>
                    <p className="text-[11px] opacity-80 leading-tight">{lab.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search + Filter Bar */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tools..."
                className="neo-input pl-12 pr-4 py-3"
                data-testid="tools-search"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`neo-btn px-4 py-2 flex items-center gap-2 ${showFilters ? 'neo-btn-primary' : 'neo-btn-secondary'}`}
              data-testid="toggle-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="w-5 h-5 bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{activeFilters}</span>
              )}
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="neo-card p-4 mb-6 bg-muted" data-testid="filter-panel">
              <div className="flex flex-wrap gap-6">
                {/* Difficulty */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block">Difficulty</label>
                  <div className="flex gap-1">
                    {DIFFICULTIES.map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`px-3 py-1 text-xs font-semibold border-2 border-foreground transition-all ${
                          difficulty === d ? 'bg-foreground text-background' : 'bg-background hover:bg-pastel-yellow hover:text-black'
                        }`}
                        data-testid={`filter-diff-${d.toLowerCase()}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="px-3 py-1 text-sm font-semibold border-2 border-foreground bg-background"
                    data-testid="filter-language"
                  >
                    {languages.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2 block">Sort By</label>
                  <div className="flex gap-1">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`px-3 py-1 text-xs font-semibold border-2 border-foreground transition-all flex items-center gap-1 ${
                          sortBy === opt.value ? 'bg-foreground text-background' : 'bg-background hover:bg-pastel-yellow hover:text-black'
                        }`}
                        data-testid={`sort-${opt.value}`}
                      >
                        <ArrowUpDown className="w-3 h-3" /> {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear */}
                {activeFilters > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => { setDifficulty('All'); setLanguage('All'); setSortBy('stars-desc'); }}
                      className="text-xs text-red-500 font-semibold flex items-center gap-1 hover:underline"
                      data-testid="clear-filters"
                    >
                      <X className="w-3 h-3" /> Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-4" data-testid="results-count">
            Showing {filteredTools.length} of {tools.length} curated tools
          </p>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow text-black">
              <p className="font-bold text-lg">No tools match your filters</p>
              <p className="opacity-70 text-sm mt-2">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTools.map(tool => (
                <button
                  key={tool.tool_id}
                  onClick={() => navigate(`/tools/${tool.tool_id}`)}
                  className="neo-card p-6 text-left bg-background hover:border-primary transition-colors"
                  data-testid={`tool-card-${tool.tool_id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{tool.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 flex-shrink-0 ${
                      tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                      tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {tool.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tool.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono bg-muted px-2 py-1 border border-border">{tool.language}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {tool.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {tool.setup_time}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
