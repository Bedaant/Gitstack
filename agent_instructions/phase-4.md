# Phase 4 — Marketplace Frontend

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

Build three new pages — a discovery page (`/marketplace`), a shareable product detail page (`/marketplace/:productId`), and a seller management page (`/sell`) — wired to the backend added in Phase 3.

## Prerequisites

- **Phase 0 (auth) must be complete** — `/sell` requires auth; Buy button must prompt login for guests.
- **Phase 3 (marketplace backend) must be complete** — all API endpoints must exist.

## Status

- [ ] Task 1 — Add routes and nav link in App.js and Header.js
- [ ] Task 2 — Create `ProductCard` reusable component
- [ ] Task 3 — Create `MarketplacePage.js` (discovery)
- [ ] Task 4 — Create `MarketplaceProductPage.js` (shareable product detail)
- [ ] Task 5 — Create `SellPage.js` (seller dashboard)

---

## Existing Components to Reuse

| Need | Existing component |
|------|--------------------|
| Screenshots carousel | `frontend/src/components/ui/carousel.jsx` |
| Markdown rendering | Pattern from `frontend/src/pages/RepoTranslator.js`: `marked` + `DOMPurify` |
| SEO / Open Graph tags | `frontend/src/components/SEO.js` |
| Toast notifications | `sonner` — already in App.js as `<Toaster>` |
| Form inputs | `frontend/src/components/ui/input.jsx`, `select.jsx`, `textarea.jsx` |
| Dialogs | `frontend/src/components/ui/dialog.jsx` |
| Badges | `frontend/src/components/ui/badge.jsx` |

---

## Task 1 — Add routes and nav item

### `frontend/src/App.js`

Add imports at top:
```js
import MarketplacePage from "./pages/MarketplacePage";
import MarketplaceProductPage from "./pages/MarketplaceProductPage";
import SellPage from "./pages/SellPage";
```

Add routes inside `<Routes>` (before the `/:owner/:repo` catch-all from Phase 2 if that's already done):
```jsx
<Route path="/marketplace" element={<MarketplacePage />} />
<Route path="/marketplace/:productId" element={<MarketplaceProductPage />} />
<Route path="/sell" element={<RequireAuth><SellPage /></RequireAuth>} />
```

### `frontend/src/components/Header.js`

Add a Marketplace link in the desktop nav alongside Collections and Tools:
```jsx
<Link to="/marketplace" className="font-semibold hover:text-primary transition-colors">Marketplace</Link>
```

Add the same link to the mobile menu nav items list.

---

## Task 2 — Create ProductCard component

**File:** `frontend/src/components/ui/ProductCard.jsx` (new file)

```jsx
import React from "react";
import { Link } from "react-router-dom";
import { Download, ShoppingBag } from "lucide-react";

export const ProductCard = ({ product }) => {
  const price = (product.price_cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <Link
      to={`/marketplace/${product.product_id}`}
      className="block border-4 border-black neo-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all bg-background"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted border-b-4 border-black overflow-hidden">
        {product.screenshots?.[0] ? (
          <img
            src={product.screenshots[0]}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-foreground line-clamp-1">{product.title}</h3>
          <span className="font-black text-primary whitespace-nowrap">{price}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.tagline}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold">{product.seller_name || "Seller"}</span>
          <span className="flex items-center gap-1">
            <Download className="w-3 h-3" />
            {product.purchase_count} sold
          </span>
        </div>
        <div className="mt-2">
          <span className="text-xs font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wide">
            {product.category}
          </span>
        </div>
      </div>
    </Link>
  );
};
```

---

## Task 3 — Create MarketplacePage.js

**File:** `frontend/src/pages/MarketplacePage.js` (new file)

API: `GET /api/marketplace/products?q=&category=&sort=&page=`

```jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API } from "../utils/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { ProductCard } from "../components/ui/ProductCard";
import { Link } from "react-router-dom";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "saas", label: "SaaS" },
  { id: "mcp-server", label: "MCP Servers" },
  { id: "computer-vision", label: "Computer Vision" },
  { id: "template", label: "Templates" },
  { id: "skill", label: "Skills" },
  { id: "other", label: "Other" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "best_sellers", label: "Best Sellers" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

const MarketplacePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort });
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      const res = await axios.get(`${API}/marketplace/products?${params}`);
      setProducts(res.data.products || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [q, category, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <>
      <SEO title="Marketplace — GitStack" description="Buy and sell software products: SaaS tools, MCP servers, computer vision models, templates and more." />
      <Header />
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Hero */}
        <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Marketplace</h1>
            <p className="text-muted-foreground text-lg">Discover and buy software products from indie builders.</p>
          </div>
          <Link to="/sell" className="bg-primary text-white font-bold px-5 py-3 border-4 border-black neo-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
            Sell a Product
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="Search products..."
            value={q}
            onChange={e => setQ(e.target.value)}
            className="border-2 border-black px-3 py-2 font-medium bg-background text-foreground w-64 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {/* Sort */}
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="border-2 border-black px-3 py-2 font-semibold bg-background text-foreground focus:outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-1.5 font-bold border-2 border-black text-sm transition-all ${category === c.id ? "bg-black text-white" : "bg-background hover:bg-muted"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-4 border-black animate-pulse bg-muted h-64" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-20 text-lg">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => <ProductCard key={p.product_id} product={p} />)}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default MarketplacePage;
```

---

## Task 4 — Create MarketplaceProductPage.js (shareable)

**File:** `frontend/src/pages/MarketplaceProductPage.js` (new file)

API calls:
- `GET /api/marketplace/products/:productId` — product detail
- `POST /api/marketplace/checkout` — create Stripe checkout session
- `GET /api/ai/translate-repo/:owner/:repo` — if `github_repo_url` set (optional embed)

```jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { API } from "../utils/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Download, Share2, ExternalLink } from "lucide-react";
import {
  Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious,
} from "../components/ui/carousel";

const MarketplaceProductPage = () => {
  const { productId } = useParams();
  const { user, login } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [repoSummary, setRepoSummary] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/marketplace/products/${productId}`);
        setProduct(res.data);
        // If github_repo_url, fetch translation
        if (res.data.github_repo_url) {
          const match = res.data.github_repo_url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
          if (match) {
            try {
              const tr = await axios.get(`${API}/ai/translate-repo/${match[1]}/${match[2]}`);
              setRepoSummary(tr.data);
            } catch { /* optional, ignore */ }
          }
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [productId]);

  const handleBuy = async () => {
    if (!user) {
      login();
      return;
    }
    setBuying(true);
    try {
      const res = await axios.post(`${API}/marketplace/checkout`, { product_id: productId }, { withCredentials: true });
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  const handleShare = () => {
    const url = `https://gitstack.pro/marketplace/${productId}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/marketplace" className="text-primary font-semibold hover:underline">Back to Marketplace</Link>
        </div>
        <Footer />
      </>
    );
  }

  const price = (product.price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  const descHtml = DOMPurify.sanitize(marked.parse(product.description || ""));

  return (
    <>
      <SEO
        title={`${product.title} — GitStack Marketplace`}
        description={product.tagline}
        image={product.screenshots?.[0]}
      />
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <Link to="/marketplace" className="hover:underline">Marketplace</Link>
          {" / "}
          <span>{product.title}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Screenshots carousel */}
            {product.screenshots?.length > 0 && (
              <div className="mb-8 border-4 border-black neo-shadow">
                <Carousel>
                  <CarouselContent>
                    {product.screenshots.map((src, i) => (
                      <CarouselItem key={i}>
                        <img src={src} alt={`Screenshot ${i + 1}`} className="w-full object-cover" />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {product.screenshots.length > 1 && <><CarouselPrevious /><CarouselNext /></>}
                </Carousel>
              </div>
            )}

            {/* Description */}
            <div
              className="prose prose-sm max-w-none text-foreground"
              dangerouslySetInnerHTML={{ __html: descHtml }}
            />

            {/* Repo summary embed */}
            {repoSummary && (
              <div className="mt-8 border-4 border-black p-5">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> About the Repository
                </h3>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(repoSummary.translation || repoSummary.summary || "")),
                  }}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="border-4 border-black p-6 neo-shadow sticky top-24">
              <span className="text-xs font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wide mb-3 inline-block">
                {product.category}
              </span>
              <h1 className="text-2xl font-extrabold mb-2">{product.title}</h1>
              <p className="text-muted-foreground mb-4">{product.tagline}</p>
              <div className="text-3xl font-black mb-6">{price}</div>

              <button
                onClick={handleBuy}
                disabled={buying}
                className="w-full bg-primary text-white font-bold py-3 border-4 border-black neo-shadow hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {buying ? "Redirecting..." : user ? "Buy & Download" : "Login to Buy"}
              </button>

              <button
                onClick={handleShare}
                className="w-full font-bold py-2 border-2 border-black hover:bg-muted transition-colors flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>

              {/* Seller card */}
              {product.seller && (
                <div className="mt-6 pt-6 border-t-2 border-border">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">Seller</p>
                  <Link to={`/u/${product.seller_user_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <img
                      src={product.seller.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.seller.name || "S")}&background=2563EB&color=fff`}
                      alt={product.seller.name}
                      className="w-9 h-9 rounded-full border-2 border-black"
                    />
                    <div>
                      <p className="font-bold text-sm">{product.seller.name || product.seller.display_name}</p>
                      {product.seller.bio && <p className="text-xs text-muted-foreground line-clamp-1">{product.seller.bio}</p>}
                    </div>
                  </Link>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <Download className="w-3 h-3" /> {product.purchase_count} purchases
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default MarketplaceProductPage;
```

---

## Task 5 — Create SellPage.js

**File:** `frontend/src/pages/SellPage.js` (new file)

This page is wrapped in `<RequireAuth>` from App.js so `user` is always available.

API calls:
- `GET /api/marketplace/seller/{userId}` — check if onboarded
- `POST /api/marketplace/seller/onboard` — start Stripe Connect
- `POST /api/marketplace/products` — create listing
- `GET /api/marketplace/products?seller={userId}` — list my products (use existing endpoint; backend filters by auth)
- `DELETE /api/marketplace/products/{id}` — delete

The page has two states:
1. **Not onboarded** — shows a CTA to set up payments (calls onboard endpoint → redirects to Stripe)
2. **Onboarded** — shows product creation form + listings table

Implement with:
- A loading state while checking seller status
- A `?onboarded=1` query param detection (Stripe redirects back here after onboarding; show a success toast)
- Product creation form with fields: title, tagline, description (textarea), price, category (select), optional github_repo_url
- A separate "Upload ZIP" flow: after creating a product, show an upload form for that product_id using `POST /api/marketplace/products/{id}/upload`
- A table of seller's own listings (fetch `GET /api/marketplace/products` — filter by auth on backend; or query by seller_user_id if exposed)
- Delete button on each row

Keep the implementation practical — reuse the existing `input.jsx`, `select.jsx`, `dialog.jsx` from `frontend/src/components/ui/` for the form. Follow the same neo-brutalist card/form patterns used in `StackGenerator.js` or `RepoTranslator.js` as style references.

---

## Verification

1. `/marketplace` loads and shows product cards (or an empty state if no products yet).
2. Category pills and sort dropdown filter/reorder the results.
3. Click a product card → navigates to `/marketplace/:productId`.
4. Product detail page: correct title, tagline, carousel (if screenshots), description rendered as markdown.
5. Click "Share" → URL copied to clipboard.
6. Paste product page URL into Slack/Twitter → OG preview shows correct title + first screenshot.
7. Click "Buy" while not logged in → triggers login flow.
8. Click "Buy" while logged in → redirects to Stripe Checkout page.
9. Complete checkout with test card `4242 4242 4242 4242` → redirected back to product page with `?purchased=1` (optionally show a success banner).
10. `/sell` redirects to home if not logged in. When logged in, shows onboarding CTA or form.
11. Create a product, upload a ZIP → product appears in "My Listings" and eventually on `/marketplace`.
