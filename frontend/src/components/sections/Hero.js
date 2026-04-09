import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Lightbulb, ChevronRight, Package, Github, Palette } from "lucide-react";
import { API } from "../../utils/api";

export const Hero = () => {
  const [query, setQuery] = useState("");
  const [toolCount, setToolCount] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const chips = ['AI agent', 'SaaS starter', 'Marketplace', 'Automation', 'UI/design', 'Data tools'];
  const searchRef = React.useRef(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const [toolsRes, ghRes] = await Promise.all([
          axios.get(`${API}/tools`, { params: { limit: 1 } }),
          axios.get(`${API}/scraper/status`)
        ]);
        const curated = 44;
        const github = ghRes.data.total_repos || 0;
        setToolCount(curated + github);
      } catch {
        setToolCount(44);
      }
    };
    fetchCount();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(`${API}/search/autocomplete`, { params: { q: query } });
        setSuggestions(res.data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      navigate(`/stack-generator?idea=${encodeURIComponent(query)}`);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setShowSuggestions(false);
    if (suggestion.type === 'tool') {
      navigate(`/tools/${suggestion.name.toLowerCase().replace(/\s+/g, '-')}`);
    } else if (suggestion.type === 'github') {
      navigate(`/repo/${suggestion.full_name}`);
    } else if (suggestion.type === 'category') {
      navigate(`/topics/${suggestion.name.toLowerCase().replace(/[\/\s]+/g, '-')}`);
    } else if (suggestion.type === 'idea') {
      setQuery(suggestion.name);
      navigate(`/stack-generator?idea=${encodeURIComponent(suggestion.name)}`);
    }
  };

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black neo-shadow mb-6 bg-pastel-mint">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              <span className="font-mono text-sm font-bold">{toolCount > 0 ? `${toolCount}+ TOOLS` : 'LOADING...'}, PLAIN ENGLISH</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.95] mb-6" data-testid="hero-title">
              GitHub,<br/>
              <span className="text-primary">Simplified</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-600 mb-8 leading-relaxed">
              The layer between GitHub tools existing and you actually using them. 
              Discover, understand, and build your idea without writing code.
            </p>

            <form onSubmit={handleSearch} className="mb-6" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400 z-10" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="What do you want to build?"
                  className="neo-input pl-14 pr-32"
                  data-testid="hero-search-input"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-primary px-6 py-3" data-testid="hero-search-btn">
                  Build Stack
                </button>
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-black neo-shadow-lg z-50 max-h-80 overflow-y-auto">
                    {suggestions.map((s, i) => (
                      <button
                        key={`${s.type}-${s.name}-${i}`}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full text-left px-4 py-3 hover:bg-pastel-yellow border-b-2 border-black last:border-b-0 flex items-center gap-3"
                      >
                        {s.type === 'tool' && <Package className="w-5 h-5 text-primary" />}
                        {s.type === 'github' && <Github className="w-5 h-5" />}
                        {s.type === 'category' && <Palette className="w-5 h-5 text-pink-600" />}
                        {s.type === 'idea' && <Lightbulb className="w-5 h-5 text-yellow-600" />}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{s.name}</p>
                          {s.description && <p className="text-xs text-zinc-500 truncate">{s.description}</p>}
                        </div>
                        {s.stars && <span className="text-xs font-mono text-zinc-400">{s.stars.toLocaleString()} stars</span>}
                        <ChevronRight className="w-4 h-4 text-zinc-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {chips.map(chip => (
                <button
                  key={chip}
                  onClick={() => { setQuery(chip); navigate(`/stack-generator?idea=${encodeURIComponent(chip)}`); }}
                  className="px-4 py-2 border-2 border-black font-mono text-sm font-semibold neo-shadow bg-white hover:bg-pastel-yellow transition-colors"
                  data-testid={`chip-${chip.toLowerCase().replace(/\//g, '-')}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden md:block">
            <img 
              src="https://static.prod-images.emergentagent.com/jobs/8bb8c987-2878-421e-a627-bf4f0f6ab482/images/26ad63182886ff1823baaf1f1d313f17ff418367be62981985bc68a8bcc54244.png"
              alt="GitStack Tools Illustration"
              className="w-full max-w-md mx-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
