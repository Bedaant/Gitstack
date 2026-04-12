import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Lightbulb, ChevronRight, Package, Github, Palette, TrendingUp, DollarSign, Users, BookOpen } from "lucide-react";
import { API } from "../../utils/api";

export const Hero = () => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();
  const chips = ['AI agent', 'SaaS starter', 'Marketplace', 'Automation', 'UI/design', 'Data tools'];
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
    if (query.trim()) { setShowSuggestions(false); navigate(`/stack-generator?idea=${encodeURIComponent(query)}`); }
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
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black neo-shadow mb-6 bg-pastel-mint">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            <span className="font-mono text-sm font-bold">LIVE — FREE TOOLS, PLAIN ENGLISH</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.95] mb-6" data-testid="hero-title">
            Stop paying for<br/>
            <span className="text-primary">tools you don't need.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            Tell us what you want to build. We'll show you exactly which <strong>free open-source tools</strong> to use — and what you're currently overpaying for.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 z-10" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="What do you want to build?"
              className="neo-input pl-14 pr-36 text-lg py-4"
              data-testid="hero-search-input"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-primary px-5 py-2.5 font-black" data-testid="hero-search-btn">
              Build Stack
            </button>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black neo-shadow-lg z-50 max-h-80 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button key={`${s.type}-${s.name}-${i}`} onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-3 hover:bg-pastel-yellow border-b-2 border-black last:border-b-0 flex items-center gap-3">
                    {s.type === 'tool' && <Package className="w-5 h-5 text-primary" />}
                    {s.type === 'github' && <Github className="w-5 h-5" />}
                    {s.type === 'category' && <Palette className="w-5 h-5 text-pink-600" />}
                    {s.type === 'idea' && <Lightbulb className="w-5 h-5 text-yellow-600" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{s.name}</p>
                      {s.description && <p className="text-xs text-zinc-500 truncate">{s.description}</p>}
                    </div>
                    {s.stars && <span className="text-xs font-mono text-zinc-400">{s.stars.toLocaleString()} ★</span>}
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {chips.map(chip => (
            <button key={chip}
              onClick={() => { setQuery(chip); navigate(`/stack-generator?idea=${encodeURIComponent(chip)}`); }}
              className="px-4 py-2 border-2 border-black font-mono text-sm font-semibold neo-shadow bg-white hover:bg-pastel-yellow transition-colors"
              data-testid={`chip-${chip.toLowerCase().replace(/\//g, '-')}`}>
              {chip}
            </button>
          ))}
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
          {[
            { icon: TrendingUp, label: "Stacks built", value: stats ? fmt(stats.stacks_generated) : '847+', color: 'bg-pastel-mint' },
            { icon: DollarSign, label: "Saved by founders", value: stats ? `$${fmt(stats.estimated_savings)}` : '$124k+', color: 'bg-pastel-yellow' },
            { icon: BookOpen, label: "Repos translated", value: stats ? fmt(stats.repos_translated) : '312+', color: 'bg-blue-100' },
            { icon: Users, label: "Founders using it", value: stats ? fmt(stats.founders) : '1.2k+', color: 'bg-pastel-pink' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`neo-card p-4 text-center ${color} border-2 border-black`}>
              <Icon className="w-5 h-5 mx-auto mb-1 text-zinc-700" />
              <p className="text-2xl font-black">{value}</p>
              <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
