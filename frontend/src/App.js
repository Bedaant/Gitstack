import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import {
  Search, Skull, Flame, Lightbulb, Users, AlertTriangle, ArrowRight, Loader2,
  Bot, Palette, Zap, LineChart, CreditCard, Shield, Star, Copy, Clock,
  CheckCircle2, ExternalLink, Github, ChevronRight, Menu, X, LogOut, User,
  Sparkles, Package, BookOpen, TrendingUp, Share2, Heart
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // CRITICAL: Skip auth check if returning from OAuth callback
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      toast.success("Logged out successfully");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Callback Component
const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const hasProcessed = React.useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = location.hash;
      const sessionId = new URLSearchParams(hash.replace('#', '?')).get('session_id');
      
      if (sessionId) {
        try {
          await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
          await checkAuth();
          toast.success("Logged in successfully!");
          navigate('/dashboard', { replace: true });
        } catch (e) {
          console.error("Auth error:", e);
          toast.error("Login failed");
          navigate('/', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
    };

    processAuth();
  }, [location, navigate, checkAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner mx-auto mb-4"></div>
        <p className="font-bold">Logging you in...</p>
      </div>
    </div>
  );
};

// Header Component
const Header = () => {
  const { user, login, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-4 border-black py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center border-2 border-black neo-shadow">
            <Package className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">GitStack</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/collections" className="font-semibold hover:text-primary transition-colors" data-testid="nav-collections">Collections</Link>
          <Link to="/tools" className="font-semibold hover:text-primary transition-colors" data-testid="nav-tools">Tools</Link>
          {user && (
            <Link to="/dashboard" className="font-semibold hover:text-primary transition-colors" data-testid="nav-dashboard">My Stack</Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="font-medium text-sm">{user.name}</span>
              <button onClick={logout} className="neo-btn neo-btn-secondary px-4 py-2 text-sm" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </button>
            </div>
          ) : (
            <button onClick={login} className="neo-btn neo-btn-primary px-6 py-2" data-testid="login-btn">
              Sign in with Google
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4">
          <nav className="flex flex-col gap-4">
            <Link to="/collections" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Collections</Link>
            <Link to="/tools" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Tools</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>My Stack</Link>
                <button onClick={logout} className="neo-btn neo-btn-secondary px-4 py-2 w-full mt-2">Logout</button>
              </>
            ) : (
              <button onClick={login} className="neo-btn neo-btn-primary px-4 py-2 w-full mt-2">Sign in with Google</button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

// Hero Section
const Hero = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const chips = ['AI agent', 'SaaS starter', 'Marketplace', 'Automation', 'UI/design', 'Data tools'];

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/stack-generator?idea=${encodeURIComponent(query)}`);
    }
  };

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black neo-shadow mb-6 bg-pastel-mint">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              <span className="font-mono text-sm font-bold">127 TOOLS, PLAIN ENGLISH</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight uppercase leading-[0.95] mb-6" data-testid="hero-title">
              GitHub,<br/>
              <span className="text-primary">Simplified</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-600 mb-8 leading-relaxed">
              The layer between GitHub tools existing and you actually using them. 
              Discover, understand, and build your idea without writing code.
            </p>

            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="What do you want to build?"
                  className="neo-input pl-14 pr-32"
                  data-testid="hero-search-input"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 neo-btn neo-btn-primary px-6 py-3" data-testid="hero-search-btn">
                  Build Stack
                </button>
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

// Viral Features Section
const ViralFeatures = () => {
  const navigate = useNavigate();
  const features = [
    { id: 'dead-tool', title: 'Dead Tool Detector', desc: 'Find free alternatives to paid SaaS', icon: Skull, color: 'bg-pastel-pink', highlight: true, path: '/dead-tool-detector' },
    { id: 'roast', title: 'Roast My Stack', desc: 'Get brutally honest feedback', icon: Flame, color: 'bg-pastel-yellow', path: '/roast-my-stack' },
    { id: 'idea', title: 'Your Idea Exists', desc: 'Find matching repos', icon: Lightbulb, color: 'bg-pastel-mint', path: '/idea-exists' },
    { id: 'founders', title: 'Founder Stacks', desc: 'Real stacks behind famous tools', icon: Users, color: 'bg-pastel-lavender', path: '/founder-stacks' },
    { id: 'error', title: 'Explain Error', desc: 'Plain English error fixes', icon: AlertTriangle, color: 'bg-blue-100', path: '/error-explainer' },
  ];

  return (
    <section className="py-16 px-4 bg-zinc-50 border-y-4 border-black">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">Founder Tools</h2>
        <p className="text-zinc-500 mb-10 text-lg">Everything you need to build without writing code.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map(f => (
            <button
              key={f.id}
              onClick={() => navigate(f.path)}
              className={`neo-card p-6 text-left ${f.color} relative ${f.highlight ? 'lg:col-span-1' : ''}`}
              data-testid={`feature-${f.id}`}
            >
              {f.highlight && (
                <div className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                  Popular
                </div>
              )}
              <f.icon className="w-8 h-8 mb-4" strokeWidth={2} />
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-600">{f.desc}</p>
              <ArrowRight className="w-5 h-5 mt-4" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

// Topics Grid
const TopicsGrid = ({ topics }) => {
  const navigate = useNavigate();
  const iconMap = { Bot, Palette, Zap, LineChart, CreditCard, Shield };

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Browse by Topic</h2>
            <p className="text-zinc-500 mt-1">Explore curated tools by category.</p>
          </div>
          <Link to="/tools" className="hidden md:flex items-center gap-1 font-semibold text-sm hover:text-primary" data-testid="view-all-topics">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {topics.map(topic => {
            const IconComponent = iconMap[topic.icon] || Package;
            return (
              <button
                key={topic.topic_id}
                onClick={() => navigate(`/topics/${topic.topic_id}`)}
                className={`neo-card p-5 text-left flex items-center gap-4 ${topic.bg_color}`}
                data-testid={`topic-${topic.topic_id}`}
              >
                <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                  <IconComponent className={`w-6 h-6 ${topic.color}`} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold">{topic.name}</h3>
                  <p className="text-sm text-zinc-500">{topic.tool_count} repos</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Trending Section
const TrendingSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('top_week');
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const tabs = [
    { id: 'top_week', label: 'Top this week' },
    { id: 'top_day', label: 'Today' },
    { id: 'top_month', label: 'This month' },
    { id: 'new_rising', label: 'New & rising' }
  ];

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/tools/trending/list`, { params: { tab: activeTab } });
        setTools(res.data);
      } catch (e) {
        console.error("Error fetching trending:", e);
      }
      setLoading(false);
    };
    fetchTrending();
  }, [activeTab]);

  return (
    <section className="py-16 px-4 border-t-4 border-black">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Trending Now</h2>
            <p className="text-zinc-500 mt-1">Live from GitHub — updated every 6 hours.</p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 font-semibold text-sm border-2 border-black transition-all ${
                  activeTab === tab.id ? 'bg-black text-white' : 'bg-white hover:bg-pastel-yellow'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-0 border-2 border-black">
            {tools.slice(0, 10).map((tool, i) => (
              <button
                key={tool.tool_id || tool.full_name}
                onClick={() => {
                  if (tool.full_name) {
                    window.location.href = `/repo/${tool.full_name}`;
                  } else if (tool.github_url) {
                    window.open(tool.github_url, '_blank');
                  }
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-pastel-yellow transition-colors border-b-2 border-black last:border-b-0 text-left"
                data-testid={`trending-${i}`}
              >
                <span className="font-mono text-xl font-bold text-zinc-400 w-8">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold flex items-center gap-2">
                    {tool.name}
                    <ExternalLink className="w-4 h-4 text-zinc-400" />
                  </h3>
                  <p className="text-sm text-zinc-500 truncate">{tool.description}</p>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <span className="text-xs font-mono bg-zinc-100 px-2 py-1 border border-black">{tool.language}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {tool.stars}
                  </span>
                  {tool.today_stars && (
                    <span className="text-xs text-green-600 font-semibold">
                      <TrendingUp className="w-3 h-3 inline" /> {tool.today_stars}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// Community Stacks - Real founder stacks
const CommunityStacks = () => {
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStacks = async () => {
      try {
        const res = await axios.get(`${API}/stacks/featured`);
        setStacks(res.data);
      } catch (e) {
        console.error("Error fetching featured stacks:", e);
      }
      setLoading(false);
    };
    fetchStacks();
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-4 bg-pastel-lavender border-t-4 border-black">
        <div className="max-w-5xl mx-auto text-center py-12">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-pastel-lavender border-t-4 border-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">What Founders Actually Used</h2>
        <p className="text-zinc-600 mb-8">Real tech stacks behind successful open-source projects.</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stacks.map(stack => (
            <a 
              key={stack.stack_id} 
              href={stack.repo_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-card p-6 bg-white block" 
              data-testid={`stack-${stack.stack_id}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-sm">
                  {stack.owner?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-bold">{stack.name}</h3>
                  <span className="text-xs text-primary hover:underline">
                    {stack.owner}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 mb-3">{stack.description}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {stack.tools.slice(0, 5).map((tool, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-zinc-100 border border-zinc-200 font-mono">
                    {tool}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {stack.stars}
                </span>
                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

// Dead Tool Detector Page
const DeadToolDetector = () => {
  const [paidTools, setPaidTools] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paidTools.trim()) return;
    
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/ai/dead-tool-detector`, { paid_tools: paidTools });
      const alts = res.data.alternatives || [];
      setResults(alts);
      
      const savings = alts.reduce((acc, item) => {
        const num = parseInt(item.annualSavings?.replace(/[^0-9]/g, '') || 0);
        return acc + num;
      }, 0);
      setTotalSavings(savings);
    } catch (e) {
      toast.error("Failed to find alternatives");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-pink border-4 border-black neo-shadow-lg mb-6">
              <Skull className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="dead-tool-title">
              Dead Tool Detector
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Paste the SaaS tools you currently pay for. We'll find free open-source alternatives.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-12">
            <textarea
              value={paidTools}
              onChange={(e) => setPaidTools(e.target.value)}
              placeholder="e.g., Typeform, Calendly, Hotjar, Zapier, Mailchimp..."
              className="neo-input h-32 resize-none mb-4"
              data-testid="dead-tool-input"
            />
            <button 
              type="submit" 
              disabled={loading || !paidTools.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg disabled:opacity-50"
              data-testid="dead-tool-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Skull className="w-6 h-6 mr-2" /> Find Free Alternatives</>}
            </button>
          </form>

          {results && results.length > 0 && (
            <div className="space-y-6">
              <div className="neo-card p-6 bg-pastel-mint text-center">
                <p className="text-sm font-mono uppercase tracking-widest mb-1">Total Annual Savings</p>
                <p className="text-5xl font-black">${totalSavings.toLocaleString()}/yr</p>
              </div>

              <div className="neo-card overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 bg-black text-white text-xs font-mono uppercase tracking-wider">
                  <div>You Pay For</div>
                  <div>Monthly Cost</div>
                  <div>Free Alternative</div>
                  <div className="text-green-400">You Save/Year</div>
                </div>
                {results.map((item, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 p-4 border-t-2 border-black items-center" data-testid={`result-row-${i}`}>
                    <div className="font-bold">{item.paidTool}</div>
                    <div className="text-zinc-500">{item.monthlyCost}</div>
                    <div className="text-primary font-semibold">{item.freeAlternative}</div>
                    <div className="text-green-600 font-bold">{item.annualSavings}</div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  const text = `I found ${results.length} free alternatives and can save $${totalSavings}/year! 🎉\n\n${results.map(r => `${r.paidTool} → ${r.freeAlternative} (Save ${r.annualSavings})`).join('\n')}\n\nTry GitStack: ${window.location.origin}/dead-tool-detector`;
                  
                  if (navigator.share) {
                    navigator.share({ title: `I'm saving $${totalSavings}/year with free tools!`, text });
                  } else {
                    navigator.clipboard.writeText(text);
                    toast.success("Results copied to clipboard!");
                  }
                }}
                className="neo-btn neo-btn-secondary px-6 py-3 w-full" 
                data-testid="share-results"
              >
                <Share2 className="w-5 h-5 mr-2" /> Share "I'm saving ${totalSavings}/yr"
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Stack Generator Page
const StackGenerator = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialIdea = params.get('idea') || '';
  
  const [idea, setIdea] = useState(initialIdea);
  const [loading, setLoading] = useState(false);
  const [stack, setStack] = useState(null);
  const [expandedTool, setExpandedTool] = useState(null);

  useEffect(() => {
    if (initialIdea && !stack) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    
    setLoading(true);
    setStack(null);
    try {
      const res = await axios.post(`${API}/ai/stack-generator`, { idea });
      setStack(res.data.stack || []);
    } catch (e) {
      toast.error("Failed to generate stack");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary border-4 border-black neo-shadow-lg mb-6">
              <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="stack-gen-title">
              Stack Generator
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Tell us what you want to build. We'll recommend the exact tools you need.
            </p>
          </div>

          <div className="mb-12">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I want to build a SaaS that helps freelancers track their time and send invoices..."
              className="neo-input h-40 resize-none mb-4"
              data-testid="stack-gen-input"
            />
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
              <p className="font-bold text-lg">Analyzing your idea...</p>
              <p className="text-zinc-500">Finding the perfect tools for you</p>
            </div>
          )}

          {stack && stack.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-6">
                Here's your stack — tools in order of setup
              </p>
              
              {stack.map((tool, i) => (
                <div key={i} className="neo-card p-6" data-testid={`stack-tool-${i}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-100 border-2 border-black flex items-center justify-center font-mono font-bold text-lg">
                        0{tool.order || i + 1}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{tool.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-bold px-2 py-1 ${
                            tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                            tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                          }`}>
                            {tool.difficulty}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {tool.setupTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-zinc-600 mb-4">{tool.description}</p>
                  
                  {expandedTool === i ? (
                    <div className="border-t-2 border-black pt-4 mt-4">
                      <h4 className="font-bold mb-3 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" /> Setup Steps
                      </h4>
                      <ol className="space-y-2">
                        {tool.setupSteps?.map((step, j) => (
                          <li key={j} className="flex gap-3">
                            <span className="w-6 h-6 bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                              {j + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="flex gap-4 mt-6">
                        <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-secondary px-4 py-2 text-sm">
                          <Github className="w-4 h-4 mr-2" /> View on GitHub
                        </a>
                        <button onClick={() => setExpandedTool(null)} className="text-sm font-semibold text-zinc-500 hover:text-black">
                          Close
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setExpandedTool(i)}
                      className="neo-btn neo-btn-secondary px-4 py-2 text-sm"
                    >
                      Set this up <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  )}
                </div>
              ))}

              <div className="flex gap-4 mt-8">
                <button className="neo-btn neo-btn-primary px-6 py-3 flex-1" data-testid="share-stack">
                  <Share2 className="w-5 h-5 mr-2" /> Share Stack
                </button>
                <button className="neo-btn neo-btn-secondary px-6 py-3 flex-1" data-testid="copy-stack">
                  <Copy className="w-5 h-5 mr-2" /> Copy as Text
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Roast My Stack Page
const RoastMyStack = () => {
  const [selectedTools, setSelectedTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roast, setRoast] = useState(null);
  
  const commonTools = ['Notion', 'Slack', 'Zapier', 'Airtable', 'Typeform', 'Calendly', 'Mailchimp', 'Intercom', 'Stripe', 'Webflow', 'Figma', 'Canva'];

  const toggleTool = (tool) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleRoast = async () => {
    if (selectedTools.length === 0) return;
    
    setLoading(true);
    setRoast(null);
    try {
      const res = await axios.post(`${API}/ai/roast-my-stack`, { tools: selectedTools });
      setRoast(res.data.roast);
    } catch (e) {
      toast.error("Failed to roast your stack");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black border-4 border-red-500 shadow-[6px_6px_0px_0px_#EF4444] mb-6">
              <Flame className="w-10 h-10 text-red-500" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="roast-title">
              Roast My Stack
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Select the tools you're using. Get brutally honest feedback.
            </p>
          </div>

          <div className="mb-8">
            <p className="font-mono text-sm uppercase tracking-wider text-zinc-500 mb-4">Select your tools:</p>
            <div className="flex flex-wrap gap-2">
              {commonTools.map(tool => (
                <button
                  key={tool}
                  onClick={() => toggleTool(tool)}
                  className={`px-4 py-2 border-2 border-black font-semibold transition-all ${
                    selectedTools.includes(tool) 
                      ? 'bg-black text-white' 
                      : 'bg-white hover:bg-pastel-yellow'
                  }`}
                  data-testid={`tool-chip-${tool.toLowerCase()}`}
                >
                  {tool}
                </button>
              ))}
            </div>
            {selectedTools.length > 0 && (
              <p className="mt-4 text-sm text-zinc-500">
                Selected: {selectedTools.join(', ')}
              </p>
            )}
          </div>

          <button 
            onClick={handleRoast}
            disabled={loading || selectedTools.length === 0}
            className="neo-btn neo-btn-danger px-8 py-4 w-full text-lg disabled:opacity-50 mb-8"
            data-testid="roast-submit"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Flame className="w-6 h-6 mr-2" /> Roast My Stack</>}
          </button>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#EF4444' }}></div>
              <p className="font-bold text-lg">Preparing your roast...</p>
            </div>
          )}

          {roast && (
            <div className="neo-card p-8 bg-black text-white border-red-500" data-testid="roast-result">
              <div className="prose-gitstack prose-invert" dangerouslySetInnerHTML={{ __html: roast.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Repo Translator Page
const RepoTranslator = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState(null);

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setTranslation(null);
    try {
      const res = await axios.post(`${API}/ai/repo-translator`, { github_url: url });
      setTranslation(res.data.translation);
    } catch (e) {
      toast.error("Failed to translate repo");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-mint border-4 border-black neo-shadow-lg mb-6">
              <BookOpen className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="repo-translator-title">
              Repo Translator
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Paste any GitHub URL. Understand it in plain English in 10 seconds.
            </p>
          </div>

          <form onSubmit={handleTranslate} className="mb-12">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/username/repo"
                className="neo-input pl-14"
                data-testid="repo-url-input"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !url.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg mt-4 disabled:opacity-50"
              data-testid="repo-translate-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><BookOpen className="w-6 h-6 mr-2" /> Translate to Plain English</>}
            </button>
          </form>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <p className="font-bold text-lg">Reading the README...</p>
              <p className="text-zinc-500">Translating tech jargon to human</p>
            </div>
          )}

          {translation && (
            <div className="neo-card p-8 bg-pastel-mint" data-testid="translation-result">
              <div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: translation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              <button className="neo-btn neo-btn-secondary px-6 py-3 w-full mt-6" data-testid="share-translation">
                <Share2 className="w-5 h-5 mr-2" /> "I understood this in 10 seconds"
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Tools List Page
const ToolsPage = () => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await axios.get(`${API}/tools`, { params: { limit: 100 } });
        setTools(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTools();
  }, []);

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="tools-page-title">
            All Tools
          </h1>
          <p className="text-zinc-500 mb-8">127 open-source tools, explained in plain English.</p>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="neo-input pl-12"
              data-testid="tools-search"
            />
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTools.map(tool => (
                <button
                  key={tool.tool_id}
                  onClick={() => navigate(`/tools/${tool.tool_id}`)}
                  className="neo-card p-6 text-left"
                  data-testid={`tool-card-${tool.tool_id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{tool.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 ${
                      tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                      tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {tool.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{tool.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="font-mono bg-zinc-100 px-2 py-1 border border-zinc-200">{tool.language}</span>
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
    </div>
  );
};

// Tool Detail Page
const ToolDetailPage = () => {
  const { toolId } = useParams();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const res = await axios.get(`${API}/tools/${toolId}`);
        setTool(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTool();
  }, [toolId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold">Tool not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-8" data-testid="tool-detail-card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black mb-2">{tool.name}</h1>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold px-3 py-1 ${
                    tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                    tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                  }`}>
                    {tool.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-zinc-500">
                    <Clock className="w-4 h-4" /> {tool.setup_time}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {tool.stars}
                  </span>
                </div>
              </div>
              <a 
                href={tool.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="neo-btn neo-btn-secondary px-4 py-2"
                data-testid="github-link"
              >
                <Github className="w-5 h-5 mr-2" /> GitHub
              </a>
            </div>

            <p className="text-xl text-zinc-600 mb-8 leading-relaxed">{tool.description}</p>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">Who it's for</h2>
              <p className="text-zinc-600">{tool.who_its_for}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3">What you can build</h2>
              <ul className="space-y-2">
                {tool.what_you_can_build?.map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {tool.paid_alternative && (
              <div className="p-4 bg-pastel-mint border-2 border-black mb-8">
                <p className="text-sm font-mono uppercase tracking-wider mb-1">Replaces</p>
                <p className="font-bold">{tool.paid_alternative} <span className="text-zinc-500 font-normal">({tool.monthly_cost})</span></p>
              </div>
            )}
          </div>

          <div className="neo-card p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" /> How to Set Up
            </h2>
            <ol className="space-y-4">
              {tool.setup_steps?.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="w-8 h-8 bg-primary text-white font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-lg pt-1">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {tool.related_tools?.length > 0 && (
            <div className="neo-card p-8">
              <h2 className="text-2xl font-bold mb-6">Tools that work well with this</h2>
              <div className="flex flex-wrap gap-2">
                {tool.related_tools.map(t => (
                  <Link 
                    key={t} 
                    to={`/tools/${t}`}
                    className="px-4 py-2 border-2 border-black font-semibold bg-white hover:bg-pastel-yellow transition-colors"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Collections Page
const CollectionsPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await axios.get(`${API}/collections`);
        setCollections(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchCollections();
  }, []);

  const bgColors = ['bg-pastel-mint', 'bg-pastel-yellow', 'bg-pastel-lavender', 'bg-pastel-pink', 'bg-blue-100', 'bg-orange-100'];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="collections-title">
            Collections
          </h1>
          <p className="text-zinc-500 mb-8">Curated tool stacks for specific goals.</p>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {collections.map((col, i) => (
                <button
                  key={col.collection_id}
                  onClick={() => navigate(`/collections/${col.collection_id}`)}
                  className={`neo-card p-8 text-left ${bgColors[i % bgColors.length]}`}
                  data-testid={`collection-${col.collection_id}`}
                >
                  <h2 className="text-2xl font-bold mb-2">{col.title}</h2>
                  <p className="text-zinc-600 mb-4">{col.description}</p>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold px-2 py-1 ${
                      col.difficulty === 'Beginner' ? 'badge-beginner' : 
                      col.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {col.difficulty}
                    </span>
                    <span className="text-sm text-zinc-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {col.completion_time}
                    </span>
                    <span className="text-sm text-zinc-500">{col.tools?.length} tools</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// GitHub Repo Detail Page (for trending repos with AI translation)
const GitHubRepoPage = () => {
  const { owner, repo } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        const res = await axios.get(`${API}/ai/translate-repo/${owner}/${repo}`);
        setData(res.data);
      } catch (e) {
        setError("Failed to translate repository");
        console.error(e);
      }
      setLoading(false);
    };
    fetchTranslation();
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="spinner mb-4"></div>
          <p className="font-bold text-lg">Translating to plain English...</p>
          <p className="text-zinc-500">Reading the README and analyzing</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold mb-4">Repository not found</h1>
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-primary px-6 py-2">
            View on GitHub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-8" data-testid="github-repo-detail">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black mb-2">{data.name}</h1>
                <p className="text-zinc-500 font-mono text-sm mb-4">{data.full_name}</p>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-bold px-3 py-1 ${
                    data.difficulty === 'Beginner' ? 'badge-beginner' : 
                    data.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                  }`}>
                    {data.difficulty}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-zinc-500">
                    <Clock className="w-4 h-4" /> {data.setup_time}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {data.stars?.toLocaleString()}
                  </span>
                  {data.forks > 0 && (
                    <span className="text-sm text-zinc-500">{data.forks?.toLocaleString()} forks</span>
                  )}
                </div>
              </div>
              <a 
                href={data.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="neo-btn neo-btn-secondary px-4 py-2"
                data-testid="github-link"
              >
                <Github className="w-5 h-5 mr-2" /> View on GitHub
              </a>
            </div>

            {data.description && (
              <p className="text-lg text-zinc-600 mb-6 italic">"{data.description}"</p>
            )}

            {data.topics && data.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {data.topics.map((topic, i) => (
                  <span key={i} className="text-xs font-mono px-2 py-1 bg-zinc-100 border border-zinc-200">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Translation */}
          <div className="neo-card p-8 bg-pastel-mint" data-testid="ai-translation">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Plain English Explanation
            </h2>
            <div 
              className="prose-gitstack"
              dangerouslySetInnerHTML={{ 
                __html: data.translation
                  ?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\n- /g, '<br/>• ')
                  .replace(/\n\d\. /g, (match) => '<br/>' + match.trim() + ' ')
                  .replace(/\n/g, '<br/>')
              }} 
            />
          </div>

          <div className="flex gap-4 mt-8">
            <a 
              href={data.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-btn neo-btn-primary px-6 py-3 flex-1 justify-center"
            >
              <Github className="w-5 h-5 mr-2" /> Start Using This Tool
            </a>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`Check out ${data.name}: ${data.html_url}`);
                toast.success("Link copied!");
              }}
              className="neo-btn neo-btn-secondary px-6 py-3"
              data-testid="share-repo"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

// Dashboard / My Stack Page
const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }
    
    const fetchStacks = async () => {
      try {
        const res = await axios.get(`${API}/my-stacks`, { withCredentials: true });
        setStacks(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    
    if (user) {
      fetchStacks();
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight" data-testid="dashboard-title">
                My Stack
              </h1>
              <p className="text-zinc-500">Your saved tools and generated stacks.</p>
            </div>
            <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3" data-testid="new-stack-btn">
              <Sparkles className="w-5 h-5 mr-2" /> Generate New Stack
            </Link>
          </div>

          {stacks.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow">
              <Package className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h2 className="text-2xl font-bold mb-2">No stacks yet</h2>
              <p className="text-zinc-600 mb-6">Generate your first stack or save tools you discover.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3">
                Generate My First Stack
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {stacks.map(stack => (
                <div key={stack.stack_id} className="neo-card p-6" data-testid={`my-stack-${stack.stack_id}`}>
                  <h3 className="font-bold text-lg mb-2">{stack.name}</h3>
                  <p className="text-sm text-zinc-500 mb-4">{stack.tools.length} tools</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400">
                      {stack.is_public ? 'Public' : 'Private'} • {stack.copy_count} copies
                    </span>
                    <button className="neo-btn neo-btn-secondary px-4 py-2 text-sm">
                      <Share2 className="w-4 h-4 mr-1" /> Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Home Page
const HomePage = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Seed database first
        await axios.post(`${API}/seed`);
        
        const topicsRes = await axios.get(`${API}/topics`);
        setTopics(topicsRes.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="font-bold">Loading GitStack...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ViralFeatures />
      <TopicsGrid topics={topics} />
      <TrendingSection />
      <CommunityStacks />
      <footer className="py-8 px-4 border-t-4 border-black">
        <div className="max-w-5xl mx-auto text-center">
          <p className="font-mono text-sm text-zinc-500">
            GitStack — GitHub, simplified for non-tech founders
          </p>
        </div>
      </footer>
    </div>
  );
};

// Placeholder pages
const IdeaExists = () => (
  <div className="min-h-screen"><Header /><main className="py-12 px-4 text-center"><h1 className="text-4xl font-black">Your Idea Already Exists</h1><p className="text-zinc-500 mt-4">Coming soon...</p></main></div>
);

const FounderStacks = () => (
  <div className="min-h-screen"><Header /><main className="py-12 px-4 text-center"><h1 className="text-4xl font-black">What Founders Actually Used</h1><p className="text-zinc-500 mt-4">Coming soon...</p></main></div>
);

const ErrorExplainer = () => (
  <div className="min-h-screen"><Header /><main className="py-12 px-4 text-center"><h1 className="text-4xl font-black">Explain This Error</h1><p className="text-zinc-500 mt-4">Coming soon...</p></main></div>
);

// Topic Tools Page - Shows tools filtered by topic
const TopicToolsPage = () => {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, [topicId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className={`neo-card p-8 mb-8 ${topic.bg_color}`}>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="topic-title">
              {topic.name}
            </h1>
            <p className="text-zinc-600">{tools.length} tools in this category</p>
          </div>

          {tools.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500">No tools found in this category yet.</p>
              <Link to="/tools" className="neo-btn neo-btn-primary mt-4 px-6 py-2">Browse All Tools</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {tools.map(tool => (
                <button
                  key={tool.tool_id}
                  onClick={() => tool.github_url ? window.open(tool.github_url, '_blank') : navigate(`/tools/${tool.tool_id}`)}
                  className="neo-card p-6 text-left"
                  data-testid={`tool-${tool.tool_id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{tool.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 ${
                      tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                      tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {tool.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{tool.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="font-mono bg-zinc-100 px-2 py-1 border border-zinc-200">{tool.language}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {tool.stars}
                    </span>
                    {tool.source === 'github' && (
                      <span className="text-xs text-green-600 font-semibold">LIVE</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Need to import useParams
import { useParams } from "react-router-dom";

// App Router
const AppRouter = () => {
  const location = useLocation();
  
  // Check for session_id in hash BEFORE rendering routes
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dead-tool-detector" element={<DeadToolDetector />} />
      <Route path="/stack-generator" element={<StackGenerator />} />
      <Route path="/roast-my-stack" element={<RoastMyStack />} />
      <Route path="/repo-translator" element={<RepoTranslator />} />
      <Route path="/idea-exists" element={<IdeaExists />} />
      <Route path="/founder-stacks" element={<FounderStacks />} />
      <Route path="/error-explainer" element={<ErrorExplainer />} />
      <Route path="/tools" element={<ToolsPage />} />
      <Route path="/tools/:toolId" element={<ToolDetailPage />} />
      <Route path="/repo/:owner/:repo" element={<GitHubRepoPage />} />
      <Route path="/collections" element={<CollectionsPage />} />
      <Route path="/collections/:collectionId" element={<CollectionsPage />} />
      <Route path="/topics/:topicId" element={<TopicToolsPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
