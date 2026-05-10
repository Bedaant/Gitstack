# Phase 4 — Marketplace Frontend

> **Read `plan.md` first** for full codebase context. Phase 3 backend must be complete.

## Vision Recap

Builds the full UI for the **Gumroad + Fiverr + Hire-A-Builder** marketplace described in Phase 3.

Three primary pages:
1. **`/marketplace`** — discovery (browse, search, filter, sort).
2. **`/marketplace/:productId`** — public product page with screenshots, demo video, AI repo summary, reviews, dual buy buttons (Source / Source + Setup), share.
3. **`/sell`** — seller dashboard (auth-required) with three tabs: My Listings, Setup Requests, Wallet & Payouts. Includes the multi-step product creation wizard.

Plus integrations into existing pages:
- **`/dashboard`** — add "My Purchases" tab (downloads + setup-request status).
- **`/u/:userId`** — add "Hire Me" button when `available_for_hire: true`.

All UI follows the **Neo-Brutalist Design DNA**: thick black borders, hard block shadows, `Bricolage Grotesque` headings, `DM Sans` body, `lucide-react` icons, `.neo-card` / `.neo-btn` / `.neo-input` utility classes from `index.css`.

---

## End-to-End User Flows (UI reference)

### Buyer
1. Header has **Marketplace** link → `/marketplace`.
2. Discovery page: search bar, category pills, sort dropdown, grid of `ProductCard`s.
3. Click card → `/marketplace/:productId`.
4. Product page sidebar shows **two buy buttons**:
   - "Buy Source — $X" (just download)
   - "Buy Source + Setup — $X+$Y" (only if `setup_available`)
5. Not logged in → opens Clerk modal (`useAuth().login()`).
6. Click buy → backend creates Razorpay order → frontend opens **Razorpay Checkout SDK** (loaded dynamically).
7. On success Razorpay returns `{razorpay_order_id, razorpay_payment_id, razorpay_signature}` → frontend POSTs to `/verify-payment`.
8. Redirected back to `/marketplace/:productId?purchased=1` → success banner with **Download** button.
9. Download → fetches signed URL → triggers browser download.
10. Below the buy box: **Reviews section** — buyer can leave a review only after buying.
11. **My Purchases** in `/dashboard` shows all bought products with re-download buttons + setup request statuses (with **Mark Received** confirm button).

### Seller
1. Click **Sell a Product** anywhere → `/sell`.
2. Not onboarded → onboarding card: display name, bio, payout method (UPI / bank / PayPal), payout details, "available for hire" toggle.
3. Onboarded → dashboard with stat strip (wallet balance, listings count, sales, pending setup) + 3 tabs.
4. **My Listings** tab: table of products with DRAFT/LIVE badges + actions (Edit, Preview, Toggle Live, Delete). **+ New Product** button opens 5-step wizard.
5. **Setup Requests** tab: list of jobs to fulfill, each with [Mark In Progress] / [Mark Complete] / [Contact Buyer] buttons.
6. **Wallet & Payouts** tab: balance card, escrow card, transaction history, **Request Withdrawal** button.

---

## Status

- [ ] Task 1 — Add routes and Marketplace nav link
- [ ] Task 2 — Add `useRazorpay` hook (loads Razorpay Checkout SDK on demand)
- [ ] Task 3 — Create `ProductCard.jsx`
- [ ] Task 4 — Create `MarketplacePage.js`
- [ ] Task 5 — Create `MarketplaceProductPage.js`
- [ ] Task 6 — Create `ReviewsSection.jsx`
- [ ] Task 7 — Create `SellPage.js` shell + onboarding card
- [ ] Task 8 — Create `MyListingsTab.jsx` + `CreateProductWizard.jsx`
- [ ] Task 9 — Create `SetupRequestsTab.jsx`
- [ ] Task 10 — Create `WalletTab.jsx` (balance, transactions, withdraw modal)
- [ ] Task 11 — Add "My Purchases" tab to existing `Dashboard.js`
- [ ] Task 12 — Add "Hire Me" button to existing `UserProfilePage.js`
- [ ] Task 13 — Create reusable `<MarketplaceTeaser />` component
- [ ] Task 14 — Wire MarketplaceTeaser into `GitHubRepoPage.js` (top banner + "Sell yours" CTA)
- [ ] Task 15 — Wire MarketplaceTeaser into `DeadToolDetector.js` results
- [ ] Task 16 — HomePage 3-pillar value strip ("Understand · Buy/Sell · Hire")
- [ ] Task 17 — Marketplace empty state with "Be the first seller" CTA

---

## Task 1 — Routes and Nav Link

### `frontend/src/App.js`

```jsx
import MarketplacePage from "./pages/MarketplacePage";
import MarketplaceProductPage from "./pages/MarketplaceProductPage";
import SellPage from "./pages/SellPage";

// Inside <Routes>, BEFORE the catch-all `/:owner/:repo` route:
<Route path="/marketplace" element={<MarketplacePage />} />
<Route path="/marketplace/:productId" element={<MarketplaceProductPage />} />
<Route path="/sell" element={<RequireAuth><SellPage /></RequireAuth>} />
```

### `frontend/src/components/Header.js`

Add a `Marketplace` link in both desktop and mobile nav alongside the existing nav items.

```jsx
<Link to="/marketplace" className="font-bold hover:text-primary transition-colors">Marketplace</Link>
```

---

## Task 2 — `useRazorpay` Hook

**File:** `frontend/src/hooks/useRazorpay.js` (new)

Loads the Razorpay Checkout SDK once and exposes a function to launch it. Razorpay's SDK script is `https://checkout.razorpay.com/v1/checkout.js`.

```js
import { useCallback, useEffect, useState } from "react";

const SDK_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export const useRazorpay = () => {
  const [ready, setReady] = useState(typeof window !== "undefined" && !!window.Razorpay);

  useEffect(() => {
    if (ready) return;
    const existing = document.querySelector(`script[src="${SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [ready]);

  const openCheckout = useCallback(({ orderId, amountCents, keyId, name, description, prefill, onSuccess, onDismiss }) => {
    if (!window.Razorpay) {
      onDismiss?.(new Error("Razorpay SDK not loaded"));
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      amount: amountCents,
      currency: "USD",
      order_id: orderId,
      name: "GitStack",
      description,
      prefill: prefill || {},
      theme: { color: "#2563EB" },
      modal: { ondismiss: () => onDismiss?.() },
      handler: (resp) => onSuccess?.(resp),
    });
    rzp.open();
  }, []);

  return { ready, openCheckout };
};
```

---

## Task 3 — `ProductCard.jsx`

**File:** `frontend/src/components/ui/ProductCard.jsx` (new)

```jsx
import React from "react";
import { Link } from "react-router-dom";
import { Download, ShoppingBag, Star, BadgeCheck, Wrench } from "lucide-react";

export const ProductCard = ({ product }) => {
  const price = (product.source_price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return (
    <Link to={`/marketplace/${product.product_id}`} className="neo-card block hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all bg-background overflow-hidden">
      <div className="aspect-video bg-muted border-b-4 border-black overflow-hidden">
        {product.screenshots?.[0] ? (
          <img src={product.screenshots[0]} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-muted-foreground" /></div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-black text-foreground line-clamp-1">{product.title}</h3>
          <span className="font-black text-primary whitespace-nowrap">{price}</span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.tagline}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold flex items-center gap-1">
            {product.seller_name || "Seller"}
            {product.seller_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
          </span>
          <span className="flex items-center gap-2">
            {product.review_count > 0 && (
              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-current" /> {product.avg_rating}</span>
            )}
            <span className="flex items-center gap-0.5"><Download className="w-3 h-3" /> {product.purchase_count}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="text-xs font-black bg-foreground text-background px-2 py-0.5 uppercase tracking-wide">{product.category}</span>
          {product.setup_available && <span className="text-xs font-bold bg-pastel-yellow text-black px-2 py-0.5 border border-black flex items-center gap-1"><Wrench className="w-3 h-3" /> SETUP</span>}
        </div>
      </div>
    </Link>
  );
};
```

---

## Task 4 — `MarketplacePage.js`

**File:** `frontend/src/pages/MarketplacePage.js` (new)

API: `GET /api/marketplace/products?q=&category=&sort=&page=`.

```jsx
// Skeleton — full implementation should follow this structure:
// - Header
// - Hero strip with title + tagline + "Sell a Product" CTA → /sell
// - Search input + sort dropdown (newest, best_sellers, top_rated, price_asc, price_desc)
// - Category pills: All, SaaS, MCP Servers, Computer Vision, Templates, Skills, Other
// - Loading skeletons (6 grey neo-cards)
// - Empty state with friendly message + "Sell a Product" CTA
// - Grid of <ProductCard /> (1 col mobile / 2 sm / 3 lg)
// - Footer
// - <SEO title="Marketplace — GitStack" description="Buy indie dev tools as a one-time purchase. SaaS alternatives, MCP servers, templates, and more — pay once, own forever." />
```

Reuse the exact filter/grid pattern already used in `frontend/src/pages/CollectionsPage.js` for consistency.

---

## Task 5 — `MarketplaceProductPage.js`

**File:** `frontend/src/pages/MarketplaceProductPage.js` (new)

This is the heart of the buyer experience. Layout: 2-column on desktop (main content + sticky sidebar).

### API calls
- `GET /api/marketplace/products/:productId` — product detail + seller card.
- `GET /api/marketplace/products/:productId/reviews` — reviews list.
- `POST /api/marketplace/checkout/create-order` — create Razorpay order.
- `POST /api/marketplace/checkout/verify-payment` — confirm after Razorpay success.
- `GET /api/marketplace/download/:purchaseId` — signed URL for own purchases (only if `?purchased=1`).
- `GET /api/ai/translate-repo/:owner/:repo` — optional AI summary embed when `github_repo_url` is set.

### Layout

**Main column (left, 2/3 width on desktop)**
1. Breadcrumb: `Marketplace / Title`.
2. Screenshot carousel (reuse `frontend/src/components/ui/carousel.jsx`).
3. Demo video embed if `demo_video_url` matches YouTube or Loom (parse video ID, render `<iframe>`).
4. Markdown description (use `marked` + `DOMPurify`, wrap in `.prose-gitstack`).
5. AI repo summary card (if `github_repo_url` set) with **"Open in Repo Translator"** button → navigates to `/r/:owner/:repo`.
6. **`<ReviewsSection productId={productId} canReview={hasPurchase} />`** at the bottom.

**Sidebar (right, sticky)**
- Category badge + verified seller badge (if applicable).
- `<h1>` Title + tagline.
- **Source price** (big), and if `setup_available` show setup price as a stacked card.
- Two CTA buttons:
  - `Buy Source — $X` → calls `handleBuy("source")`.
  - `Buy Source + Setup — $Y` → calls `handleBuy("source_and_setup")` (hidden if not available).
- "Login to Buy" if not logged in (calls `useAuth().login()`).
- Share button → copies `https://gitstack.pro/marketplace/:productId`.
- Seller card (avatar, name, verified badge, bio) → links to `/u/:sellerUserId`.
- Stats footer (sales count, avg rating).

### Buy flow
```js
const { openCheckout } = useRazorpay();

const handleBuy = async (purchaseType) => {
  if (!user) { login(); return; }
  setBuying(true);
  try {
    const { data } = await axios.post(`${API}/marketplace/checkout/create-order`, {
      product_id: productId, purchase_type: purchaseType,
    }, { withCredentials: true });

    openCheckout({
      orderId: data.order_id,
      amountCents: data.amount_cents,
      keyId: data.razorpay_key_id,
      description: product.title,
      prefill: { name: user.name, email: user.email },
      onSuccess: async (resp) => {
        await axios.post(`${API}/marketplace/checkout/verify-payment`, resp, { withCredentials: true });
        toast.success("Payment successful!");
        navigate(`/marketplace/${productId}?purchased=1&purchase_id=${data.purchase_id}`);
      },
      onDismiss: () => setBuying(false),
    });
  } catch (e) {
    toast.error("Could not start checkout");
    setBuying(false);
  }
};
```

### Post-purchase banner
If URL has `?purchased=1&purchase_id=X`, show a green neo-card banner above the main content with a **Download** button that calls `GET /marketplace/download/:purchaseId` and `window.location.href`s to the returned signed URL. If `purchase_type=source_and_setup`, also explain "Your setup request has been sent to the seller — track it in your Dashboard."

### SEO

Use `<SEO title="{title} — GitStack" description="{tagline}" image="{screenshots[0]}" />` so Slack/Twitter previews look good.

---

## Task 6 — `ReviewsSection.jsx`

**File:** `frontend/src/components/marketplace/ReviewsSection.jsx` (new)

Props: `productId`, `canReview` (boolean — only true if current user has a completed purchase), `avgRating`, `reviewCount`.

```jsx
// - Header: "Reviews" + star aggregate ("4.8 ★ from 23 reviews") if reviewCount > 0
// - If canReview && !alreadyReviewed: show inline form (5 star picker, textarea max 500, Submit button)
//   POST /api/marketplace/products/:id/reviews → on success append to list
// - List: each review = avatar, name, star count, text, relative timestamp
// - Pagination: "Load more" button (page param)
```

Use `lucide-react`'s `Star` icon (filled vs outline based on rating).

---

## Task 7 — `SellPage.js` Shell + Onboarding

**File:** `frontend/src/pages/SellPage.js` (new)

```jsx
// 1. On mount: GET /api/marketplace/seller/dashboard
// 2. If !data.onboarded → render <OnboardingCard /> (form: display_name, bio, payout_method radio,
//    conditional fields per method, available_for_hire toggle, hire_contact)
//    On submit → POST /api/marketplace/seller/onboard → refetch dashboard.
// 3. Else → render <SellerDashboard data={...} />
```

### `<OnboardingCard />`

A single neo-card with the form. Payout method radio shows different field sets:
- UPI → `upi_id` text input (validate against `^[\w.\-]+@[\w]+$`).
- Bank → `account_holder_name`, `account_number`, `ifsc`.
- PayPal → `paypal_email`.

"Available for hire" toggle expands a `hire_contact` field (email or Calendly URL).

### `<SellerDashboard data={...}>`

Top: 4-stat strip (Wallet Balance, Escrow, Listings, Pending Setups).
Middle: Tab nav — `My Listings | Setup Requests | Wallet`.
Render the active tab below.

---

## Task 8 — `MyListingsTab.jsx` + `CreateProductWizard.jsx`

**File:** `frontend/src/components/marketplace/MyListingsTab.jsx` (new)

```jsx
// 1. GET /api/marketplace/my-products
// 2. Table columns: Title | Status (DRAFT/LIVE/UNPUBLISHED) | Price | Sales | Actions
// 3. Actions per row: View, Edit (opens wizard pre-filled), Toggle Publish
//    (PATCH /publish), Delete (with confirm).
// 4. Top-right "[+ New Product]" button → opens <CreateProductWizard mode="create" />
```

**File:** `frontend/src/components/marketplace/CreateProductWizard.jsx` (new)

A 5-step modal (use existing `frontend/src/components/ui/dialog.jsx`):

```
Step 1 — Details (Pencil icon)
  - Title (required)
  - Tagline (required)
  - Category (select)
  - Source price ($) — number input, store cents internally
  - Toggle: Offer setup service?
    If on: setup price, delivery days, setup description (what's included)
  - GitHub repo URL (optional)
  - Demo video URL (optional, YouTube/Loom)
  → POST /api/marketplace/products → product_id stored in wizard state
  → Unlock Step 2

Step 2 — Description (FileText icon)
  - Markdown textarea (min 50 chars) with live Preview tab on the side
  - Save → PATCH /api/marketplace/products/:id { description }
  → Unlock Step 3

Step 3 — Screenshots (Image icon)
  - Up to 5 images. Drag-drop OR file picker.
  - On select → POST /products/:id/screenshots (multipart) → render uploaded URLs as removable thumbnails (delete via DELETE endpoint)
  - Required: at least 1 screenshot before publishing.
  → Unlock Step 4

Step 4 — Source ZIP (Upload icon)
  - Single .zip drop zone (max 500 MB). Show progress bar using axios `onUploadProgress`.
  - On complete → mark product as having r2_file_key (refetch product or assume done)
  → Unlock Step 5

Step 5 — Preview & Publish (Eye icon)
  - Render a mini ProductCard preview + price card
  - Two buttons: "Save as Draft" (close wizard) / "Go Live" (PATCH /publish published=true)
  - On Go Live → toast success + close wizard + refetch listings
```

State machine: keep current `productId` and `currentStep` in wizard component state. Each step's "Save & Continue" button is disabled until required fields are valid. Editing an existing product (`mode="edit"`) skips Step 1 creation — instead PATCHes on save.

---

## Task 9 — `SetupRequestsTab.jsx`

**File:** `frontend/src/components/marketplace/SetupRequestsTab.jsx` (new)

```jsx
// GET /api/marketplace/setup-requests
// Render filtered groups: Pending | In Progress | Completed (collapsible sections)
// Each row card:
//   - Buyer avatar + name + email (since seller needs to contact)
//   - Product title, paid amount
//   - Status badge
//   - Auto-release date countdown ("Auto-releases in 5 days")
//   - Buttons:
//       [Mark In Progress]   PATCH /:id/status { status: "in_progress" }
//       [Mark Completed]     PATCH /:id/status { status: "completed", note }
//       [Email Buyer]        opens mailto:
```

After Mark Completed, a small inline note prompt appears asking the seller to leave a final message.

---

## Task 10 — `WalletTab.jsx`

**File:** `frontend/src/components/marketplace/WalletTab.jsx` (new)

```jsx
// GET /api/marketplace/wallet → { wallet, transactions }
// 
// Three big stat cards:
//   1. Available Balance: $342.50  [Request Withdrawal] button
//   2. In Escrow: $99.00  ("Held until buyers confirm setup")
//   3. Total Earned: $1,432.10
// 
// Transaction history table:
//   Date | Type (sale / setup_escrow / setup_released / withdrawal_request) | Product | Amount | Note
// 
// Withdraw modal (Dialog):
//   - Show payout method (read-only, from seller record)
//   - Amount input (min $10, max balance)
//   - "By submitting, your funds will be processed within 3 business days"
//   - Submit → POST /api/marketplace/wallet/withdraw → toast success → refetch
```

Use `Wallet`, `ArrowDownToLine`, `Lock`, `TrendingUp` icons from `lucide-react`.

---

## Task 11 — Add "My Purchases" Tab to `Dashboard.js`

**File:** `frontend/src/pages/Dashboard.js` (existing — modify, don't replace).

Add a new tab `My Purchases` that calls `GET /api/marketplace/my-purchases` and renders:

- One row per purchase: thumbnail, title, purchase type badge, price paid, date.
- **Download** button → `GET /api/marketplace/download/:purchaseId` → triggers download.
- If `purchase_type === "source_and_setup"`:
  - Show setup status badge (Pending / In Progress / Completed).
  - If `setup_request.status === "completed"` and `!buyer_confirmed`: show **"Mark as Received"** button → `POST /setup-requests/:id/confirm`.
  - Show `auto_release_at` countdown info.
- Inline review form if not yet reviewed (reuse `ReviewsSection` review-create logic).

---

## Task 12 — "Hire Me" Button on `UserProfilePage.js`

**File:** `frontend/src/pages/UserProfilePage.js` (existing — modify).

The Phase 7 endpoint `GET /api/users/:userId` should now also include the seller record fields `available_for_hire` and `hire_contact` (Phase 3 Task 21 noted this). In the profile header, when `profile.available_for_hire`, render a primary CTA:

```jsx
{profile.available_for_hire && profile.hire_contact && (
  <a
    href={profile.hire_contact.startsWith("http") ? profile.hire_contact : `mailto:${profile.hire_contact}`}
    target="_blank"
    rel="noopener noreferrer"
    className="neo-btn neo-btn-primary px-4 py-2 font-black flex items-center gap-2"
  >
    <Briefcase className="w-4 h-4" /> Hire Me
  </a>
)}
```

Also surface `verified` badge next to the user's name when `profile.verified === true`.

---

## Task 13 — `<MarketplaceTeaser />` (reusable cross-feature component)

**File:** `frontend/src/components/marketplace/MarketplaceTeaser.jsx` (new)

A single reusable component that fetches marketplace listings for a given GitHub repo (or tool) and renders an inline neo-brutalist banner. Used on Repo Translator, DeadToolDetector, ToolDetail, Comparison, IdeaExists pages — anywhere we already know which repo the user is looking at.

Props:
- `owner`, `repo` — used directly with `/api/marketplace/products/by-repo`.
- `toolId` — alternative entry point that hits `/api/marketplace/products/by-tool/:toolId`.
- `variant?` — `"banner"` (default, full width neo-card) or `"inline"` (compact single-line for cramped layouts).
- `fallback?` — optional React node to render when there are zero listings (e.g. the "Sell yours" CTA on Repo Translator).

Behavior:
- Mounts → fetches listings.
- 0 results → renders `fallback` if provided, otherwise nothing.
- ≥1 results → renders banner with the first product (price, title, "Buy on Marketplace" button linking to `/marketplace/:productId`). If multiple, show "and X more →" link to `/marketplace?q={repo}`.
- All requests are best-effort (silent failure — never blocks the host page).

Skeleton:
```jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ShoppingBag, Wrench, BadgeCheck } from "lucide-react";
import { API } from "../../utils/api";

export const MarketplaceTeaser = ({ owner, repo, toolId, variant = "banner", fallback = null }) => {
  const [products, setProducts] = useState(null); // null = loading

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      try {
        const url = toolId
          ? `${API}/marketplace/products/by-tool/${toolId}`
          : `${API}/marketplace/products/by-repo?owner=${owner}&repo=${repo}`;
        const res = await axios.get(url);
        if (!cancelled) setProducts(res.data.products || []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    };
    if ((owner && repo) || toolId) fetch();
    return () => { cancelled = true; };
  }, [owner, repo, toolId]);

  if (products === null) return null;            // still loading — render nothing
  if (products.length === 0) return fallback;    // let the host page render its own CTA

  const first = products[0];
  const price = (first.source_price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (variant === "inline") {
    return (
      <Link to={`/marketplace/${first.product_id}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary border-2 border-primary px-2 py-1 hover:bg-primary hover:text-white transition-colors">
        <ShoppingBag className="w-3.5 h-3.5" /> Buy ready-to-deploy version — {price}
      </Link>
    );
  }

  return (
    <div className="neo-card p-4 mb-6 bg-pastel-yellow/20 border-primary">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div>
            <p className="font-black text-sm uppercase tracking-wide">Available on the Marketplace</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{first.title}</span>
              {first.setup_available && <> · <Wrench className="w-3 h-3 inline" /> Setup service available</>}
              {" by "}<span className="font-bold">{first.seller_name}</span>
              {first.seller_verified && <BadgeCheck className="w-3.5 h-3.5 inline ml-0.5 text-primary" />}
            </p>
          </div>
        </div>
        <Link to={`/marketplace/${first.product_id}`} className="neo-btn neo-btn-primary px-4 py-2 font-black">
          Buy — {price}
        </Link>
      </div>
      {products.length > 1 && (
        <Link to={`/marketplace?q=${repo || ""}`} className="text-xs font-bold text-primary hover:underline mt-2 inline-block">
          and {products.length - 1} more listing{products.length > 2 ? "s" : ""} →
        </Link>
      )}
    </div>
  );
};
```

---

## Task 14 — Wire `<MarketplaceTeaser />` into `GitHubRepoPage.js`

**File:** `frontend/src/pages/GitHubRepoPage.js` (existing — modify).

This is the highest-impact integration. The teaser appears at the top of the AI translation card; if no listing exists, the fallback CTA invites the repo's likely owner to become a seller.

```jsx
import { MarketplaceTeaser } from "../components/marketplace/MarketplaceTeaser";

// Inside the render, immediately above the AI translation block:
<MarketplaceTeaser
  owner={owner}
  repo={repo}
  fallback={
    <div className="neo-card p-4 mb-6 bg-muted/30">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm">
          <span className="font-black">Is this your repo?</span>{" "}
          <span className="text-muted-foreground">Sell a ready-to-deploy version or a setup service on GitStack.</span>
        </p>
        <Link to="/sell" className="neo-btn neo-btn-secondary px-3 py-1.5 text-sm font-bold">
          Become a Seller →
        </Link>
      </div>
    </div>
  }
/>
```

---

## Task 15 — Wire `<MarketplaceTeaser />` into `DeadToolDetector.js`

**File:** `frontend/src/pages/DeadToolDetector.js` (existing — modify).

For each detected free GitHub alternative, render an inline teaser below the GitHubLink. If a paid/managed listing exists for that repo, the buyer sees it as a 3rd option alongside "Pay $30/mo" vs "Use the GitHub repo for free":

```jsx
{item.githubUrl && (() => {
  const m = item.githubUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  return m ? (
    <div className="mt-2">
      <MarketplaceTeaser owner={m[1]} repo={m[2]} variant="inline" />
    </div>
  ) : null;
})()}
```

---

## Task 16 — HomePage 3-Pillar Value Strip

**File:** `frontend/src/pages/HomePage.js` (existing — modify).

Just below the existing `<Hero />` and **above** `<RecommendationsSection />`, insert a 3-card strip that pitches the *three* core value props of GitStack. Each card is a neo-card linking to the relevant feature.

```jsx
import { Brain, ShoppingBag, Briefcase } from "lucide-react";

// Inside HomePage, after <Hero />:
<section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
  <div className="grid md:grid-cols-3 gap-4">
    <Link to="/repo-translator" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
      <Brain className="w-7 h-7 mb-2 text-primary" />
      <h3 className="font-black uppercase tracking-tight mb-1">Understand any repo</h3>
      <p className="text-sm text-muted-foreground">AI-translates GitHub READMEs into plain English in seconds.</p>
    </Link>
    <Link to="/marketplace" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
      <ShoppingBag className="w-7 h-7 mb-2 text-primary" />
      <h3 className="font-black uppercase tracking-tight mb-1">Buy or sell dev tools</h3>
      <p className="text-sm text-muted-foreground">Pay once for indie SaaS alternatives. Source code + optional setup.</p>
    </Link>
    <Link to="/marketplace?available_for_hire=1" className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all">
      <Briefcase className="w-7 h-7 mb-2 text-primary" />
      <h3 className="font-black uppercase tracking-tight mb-1">Hire indie builders</h3>
      <p className="text-sm text-muted-foreground">Browse builder profiles and hire them directly for setup or custom work.</p>
    </Link>
  </div>
</section>
```

---

## Task 17 — Marketplace Empty State

**File:** `frontend/src/pages/MarketplacePage.js` (Task 4 — extend its empty state).

When `products.length === 0` AND no filters are applied, render a friendly **"Be the first seller"** card instead of just "No products found.":

```jsx
{products.length === 0 ? (
  <div className="neo-card p-10 text-center bg-muted/20 max-w-2xl mx-auto">
    <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
    <h2 className="text-2xl font-black uppercase mb-2">The Marketplace is open</h2>
    <p className="text-muted-foreground mb-5">Be the first to list your indie tool, MCP server, or boilerplate. Set it up in 5 minutes.</p>
    <Link to="/sell" className="neo-btn neo-btn-primary px-6 py-3 font-black inline-flex items-center gap-2">
      <Briefcase className="w-4 h-4" /> Become a Seller
    </Link>
  </div>
) : ( /* existing grid */ )}
```

---

## Verification

1. `/marketplace` loads, shows ProductCards for live products only (drafts hidden).
2. Filters/search/sort all work, URL doesn't need to be sharable for filters in v1.
3. Click product → `/marketplace/:productId` shows screenshots carousel, demo video iframe, markdown desc, repo summary, reviews.
4. Logged out + click Buy → Clerk modal opens.
5. Logged in + click Buy Source → Razorpay Checkout modal appears with correct amount + product name.
6. Test with Razorpay test card `4111 1111 1111 1111`, OTP `123456` → after dismiss, frontend hits `/verify-payment`, page reloads with `?purchased=1`, success banner + Download button visible.
7. Click Download → ZIP downloads.
8. Buy Source + Setup → Razorpay shows summed total. After purchase, `/dashboard` "My Purchases" shows setup status as Pending.
9. As the seller (`/sell`) → Setup Requests tab shows the new job. Mark In Progress → buyer's dashboard reflects the change. Mark Completed → buyer sees "Mark as Received" button.
10. Buyer clicks Mark as Received → seller's wallet balance increments by 85% of setup price; escrow decrements.
11. Don't confirm for 7 days → auto-release loop releases automatically (verified in DB).
12. Wallet tab → Request Withdrawal with $25 → balance drops $25, withdrawal_request row appears in DB.
13. Reviews — leave a 5★ review on a purchased product → product page updates avg_rating.
14. Paste `/marketplace/:productId` into Slack → OG preview shows title + first screenshot.
15. `/u/:sellerId` (Phase 7 page) shows ✓ verified badge + Hire Me button when applicable.
16. Manual admin: flip `verified: true` on a seller in MongoDB → badge appears across all their products and profile.
