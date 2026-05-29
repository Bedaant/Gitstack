import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ui/ProductCard";
import { VirtualProductGrid } from "../components/marketplace/VirtualProductGrid";
import { API } from "../utils/api";
import { Search, ShoppingBag, Briefcase, ArrowUpDown, SlidersHorizontal, Mail, Loader2, CheckCircle2, Bell, Sparkles } from "lucide-react";

// Track window width reactively so VirtualProductGrid rebalances columns on rotate/resize
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

const CATEGORIES = [
  { label: "All", value: "" },
  { label: "SaaS", value: "saas" },
  { label: "MCP Servers", value: "mcp-server" },
  { label: "Computer Vision", value: "computer-vision" },
  { label: "Templates", value: "template" },
  { label: "Skills", value: "skill" },
  { label: "Other", value: "other" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "best_sellers", label: "Best Sellers" },
  { value: "top_rated", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export default function MarketplacePage() {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSubscribed, setWaitlistSubscribed] = useState(false);
  const windowWidth = useWindowWidth();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      params.set("page", String(page));
      const { data } = await axios.get(`${API}/marketplace/products?${params.toString()}`);
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, sort, page]);

  const fetchFeatured = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/marketplace/products/featured?limit=6`);
      setFeatured(data.products || []);
    } catch {
      setFeatured([]);
    }
  }, []);

  const handleWaitlist = async (e) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || !waitlistEmail.includes("@")) return;
    setWaitlistLoading(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email: waitlistEmail, source: "marketplace_waitlist" });
      setWaitlistSubscribed(true);
    } catch {
      // silently fail
    }
    setWaitlistLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchFeatured();
  }, [fetchProducts, fetchFeatured]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Marketplace — GitStack"
        description="Buy indie dev tools as a one-time purchase. SaaS alternatives, MCP servers, templates, and more — pay once, own forever."
      />
      <Header />
      <main id="main-content" className="flex-1">
        <section className="max-w-7xl mx-auto px-4 md:px-8 pt-10 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-2">Marketplace</h1>
              <p className="text-muted-foreground max-w-xl">Pay once, own forever. Indie alternatives to monthly SaaS tools.</p>
            </div>
            <Link to="/sell" className="neo-btn neo-btn-primary px-6 py-3 font-black inline-flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Sell a Product
            </Link>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                className="neo-input w-full pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="neo-input pl-9 pr-8 appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-black border-2 border-foreground uppercase tracking-wide transition-colors ${
                  category === c.value
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {featured.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Featured Products
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.map((product) => (
                  <ProductCard key={product.product_id} product={product} />
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="neo-card overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted border-b-4 border-black" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            q.trim() || (category && category !== "All") ? (
              <div className="neo-card p-10 text-center bg-muted/20 max-w-2xl mx-auto">
                <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-2xl font-black uppercase mb-2">No results found</h2>
                <p className="text-muted-foreground mb-5">
                  {q.trim() ? <>Nothing matches <span className="font-bold text-foreground">"{q}"</span>{category !== "All" && <> in <span className="font-bold text-foreground">{category}</span></>}.</> : <>No products in <span className="font-bold text-foreground">{category}</span> yet.</>}
                  {" "}Try different keywords or browse other categories.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => { setQ(""); setCategory("All"); setPage(1); }}
                    className="neo-btn neo-btn-primary px-5 py-2.5 font-black"
                  >
                    Clear filters
                  </button>
                  <Link to="/marketplace" className="neo-btn px-5 py-2.5 font-black border-2 border-foreground">
                    Browse all
                  </Link>
                </div>
              </div>
            ) : (
              <div className="neo-card p-10 text-center bg-muted/20 max-w-2xl mx-auto">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h2 className="text-2xl font-black uppercase mb-2">The Marketplace is open</h2>
                <p className="text-muted-foreground mb-5">Be the first to list your indie tool, MCP server, or boilerplate. Set it up in 5 minutes.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
                  <Link to="/sell" className="neo-btn neo-btn-primary px-6 py-3 font-black inline-flex items-center gap-2">
                    <Briefcase className="w-4 h-4" /> Become a Seller
                  </Link>
                </div>
                <div className="border-t-2 border-border pt-6">
                  <p className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center justify-center gap-2">
                    <Bell className="w-4 h-4" /> Get notified when new products launch
                  </p>
                  {waitlistSubscribed ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-bold">You're on the list! New drops go straight to your inbox.</span>
                    </div>
                  ) : (
                    <form onSubmit={handleWaitlist} className="flex gap-2 max-w-md mx-auto">
                      <input
                        type="email"
                        value={waitlistEmail}
                        onChange={(e) => setWaitlistEmail(e.target.value)}
                        placeholder="founder@startup.com"
                        className="neo-input flex-1 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={waitlistLoading}
                        className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black"
                      >
                        {waitlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Notify Me"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )
          ) : (
            <VirtualProductGrid products={products} width={windowWidth} />
          )}

          {/* Waitlist banner — shown when products exist too */}
          {!loading && products.length > 0 && !waitlistSubscribed && (
            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-10">
              <div className="neo-card p-6 bg-pastel-yellow text-black border-4 border-black">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6" />
                    <div>
                      <p className="font-black text-sm uppercase tracking-wide">Want early access to new drops?</p>
                      <p className="text-xs text-black/70">Get notified when indie builders list new tools and templates.</p>
                    </div>
                  </div>
                  <form onSubmit={handleWaitlist} className="flex gap-2 w-full md:w-auto">
                    <input
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="founder@startup.com"
                      className="neo-input flex-1 md:w-64 text-sm bg-white"
                    />
                    <button
                      type="submit"
                      disabled={waitlistLoading}
                      className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black"
                    >
                      {waitlistLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join Waitlist"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
