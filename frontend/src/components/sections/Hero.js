import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Lightbulb, ChevronRight, Package, Github, Palette, TrendingUp, DollarSign, Users, BookOpen, Sparkles } from "lucide-react";
import { API } from "../../utils/api";

// Auto-detect if user input is a GitHub URL (translate mode) or a free-form idea (stack mode)
const detectMode = (q) => {
  const trimmed = (q || "").trim();
  if (!trimmed) return null;
  if (trimmed.includes("github.com")) return "translate";
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return "translate"; // e.g. "owner/repo"
  return "idea";
};

export const Hero = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const mode = detectMode(query);
  const examples = [
    { label: 'CRM', query: 'CRM' },
    { label: 'Email automation', query: 'email automation' },
    { label: 'Marketplace', query: 'marketplace' }
  ];
  const searchRef = React.useRef(null);

  useEffect(() => {
    axios.get(`${API}/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) { setSuggestions([]); return; }
      try {
        const res = await axios.get(`${API}/search/autocomplete`, { params: { q: query } });
        setSuggestions(res.data.suggestions || []);
      } catch { setSuggestions([]); }
    };
    const t = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setShowSuggestions(false);

    // Branch by the same detector the UI uses so the CTA label matches the action
    if (detectMode(trimmed) === "translate") {
      const ghMatch = trimmed.match(/github\.com\/([^\/?#]+)\/([^\/?#]+)/);
      if (ghMatch) {
        navigate(`/r/${ghMatch[1]}/${ghMatch[2].replace(/\.git$/, "")}`);
        return;
      }
      // "owner/repo" shorthand
      const [owner, repo] = trimmed.split("/");
      if (owner && repo) {
        navigate(`/r/${owner}/${repo.replace(/\.git$/, "")}`);
        return;
      }
    }

    navigate(`/stack-generator?idea=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionClick = (s) => {
    setShowSuggestions(false);
    if (s.type === 'tool') navigate(`/tools/${s.name.toLowerCase().replace(/\s+/g, '-')}`);
    else if (s.type === 'github') navigate(`/repo/${s.full_name}`);
    else if (s.type === 'category') navigate(`/topics/${s.name.toLowerCase().replace(/[\/\s]+/g, '-')}`);
    else navigate(`/stack-generator?idea=${encodeURIComponent(s.name)}`);
  };

  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(0)}k+` : `${n}+`;

  return (
    <section className="py-16 md:py-24 px-4 border-b-4 border-black">
      <div className="max-w-5xl mx-auto">

        {/* Headline */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black neo-shadow mb-6 bg-pastel-mint text-black">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            <span className="font-mono text-sm font-bold">LIVE — FREE TOOLS, PLAIN ENGLISH</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.95] mb-6" data-testid="hero-title">
            Build anything.{" "}
            <span className="text-primary">Pay nothing.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Describe what you need — "I need a CRM," "a marketplace," or "an email tool." We'll find free, open-source alternatives and explain how to use them in plain English. No coding required.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground z-10 hidden sm:block" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="I need a CRM, a chatbot, a marketplace..."
              className="neo-input pl-4 sm:pl-14 pr-4 sm:pr-40 text-base sm:text-lg py-4"
              data-testid="hero-search-input"
            />
            <button
              type="submit"
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-primary px-5 py-2.5 font-black whitespace-nowrap items-center gap-2"
              data-testid="hero-search-btn"
            >
              {mode === "idea" ? <><Sparkles className="w-4 h-4" /> Generate Stack</> : <><BookOpen className="w-4 h-4" /> Translate</>}
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-background border-4 border-black neo-shadow-lg z-50 max-h-80 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={`${s.type}-${s.name}-${i}`} onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-3 hover:bg-pastel-yellow hover:text-black border-b-2 border-black last:border-b-0 flex items-center gap-3">
                    {s.type === 'tool' && <Package className="w-5 h-5 text-primary" />}
                    {s.type === 'github' && <Github className="w-5 h-5" />}
                    {s.type === 'category' && <Palette className="w-5 h-5 text-pink-600" />}
                    {s.type === 'idea' && <Lightbulb className="w-5 h-5 text-yellow-600" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground truncate">{s.description}</p>}
                    </div>
                    {s.stars && <span className="text-xs font-mono text-muted-foreground">{s.stars.toLocaleString()} ★</span>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Mobile full-width submit */}
          <button
            type="submit"
            className="sm:hidden neo-btn neo-btn-primary w-full py-3 mt-3 font-black flex items-center justify-center gap-2"
          >
            {mode === "idea" ? <><Sparkles className="w-4 h-4" /> Generate Stack</> : <><BookOpen className="w-4 h-4" /> Translate Repo</>}
          </button>
          {/* Mode indicator — reduces cognitive friction about what will happen */}
          {mode && (
            <p className="text-xs font-mono mt-2 text-center" data-testid="hero-mode-hint">
              {mode === "translate" ? (
                <><span className="text-primary font-bold">🔗 GitHub URL detected</span> <span className="text-muted-foreground">— we'll translate it to plain English</span></>
              ) : (
                <><span className="text-primary font-bold">💡 Idea detected</span> <span className="text-muted-foreground">— we'll build a stack for you</span></>
              )}
            </p>
          )}
        </form>

        <div className="flex flex-col items-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Try these popular needs:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {examples.map(ex => (
              <button key={ex.label}
                onClick={() => { 
                  setQuery(ex.query); 
                  navigate(`/stack-generator?idea=${encodeURIComponent(ex.query)}`);
                }}
                className="px-4 py-2 border-2 border-black font-mono text-sm font-semibold neo-shadow bg-background text-foreground hover:bg-pastel-yellow hover:text-black transition-colors flex items-center gap-2"
                data-testid={`chip-${ex.label}`}>
                <Sparkles className="w-4 h-4" /> {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { icon: TrendingUp, label: "Stacks built", value: stats ? fmt(stats.stacks_generated) : '847+', color: 'bg-pastel-mint' },
            { icon: DollarSign, label: "Saved by founders", value: stats ? `$${fmt(stats.estimated_savings)}` : '$124k+', color: 'bg-pastel-yellow' },
            { icon: BookOpen, label: "Repos translated", value: stats ? fmt(stats.repos_translated) : '312+', color: 'bg-pastel-lavender' },
            { icon: Users, label: "Founders using it", value: stats ? fmt(stats.founders) : '1.2k+', color: 'bg-pastel-pink' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`p-4 text-center ${color} border-2 border-black shadow-[4px_4px_0px_0px_#09090B] text-black`}>
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs font-mono uppercase tracking-wider opacity-80">{label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
