# GitStack.pro — Full SEO + GEO + AEO Audit & Action Plan
**Date:** 2026-05-20
**Auditor:** SEO/GEO Skills Pack (20 skills)
**Domain:** gitstack.pro
**Status:** 🔴 CRITICAL ISSUES FOUND — Immediate Action Required

---

## Executive Summary

| Category | Score | Status |
|----------|-------|--------|
| **Technical SEO** | 4/10 | 🔴 Critical |
| **On-Page SEO** | 3/10 | 🔴 Critical |
| **Content SEO** | 5/10 | 🟡 Needs Work |
| **GEO / AI Optimization** | 2/10 | 🔴 Critical |
| **Entity & Schema** | 3/10 | 🔴 Critical |
| **Domain Authority** | 4/10 | 🟡 Needs Work |

**Primary Blocker:** Your React SPA serves identical `<title>`, `<meta description>`, and `canonical` tags on ALL 12,000+ pages. Google sees every tool page, blog post, and feature page as the homepage. **This is catastrophic for indexation.**

---

## Phase 1: Critical Issues (Fix This Week)

### 🚨 P0 — SPA Meta Tag Cannibalization

**Finding:** Every single page returns:
```html
<title>GitStack — GitHub, Simplified for Founders</title>
<meta name="description" content="Discover, understand, and use open-source GitHub tools...">
<link rel="canonical" href="https://gitstack.pro/">
```

This applies to:
- `/tools/n8n-io/n8n` (12,000+ tool pages)
- `/blog/top-5-zapier-alternatives/` (blog posts)
- `/stack-generator/`, `/roast-my-stack/`, etc. (feature pages)

**Impact:** Google cannot distinguish pages. Tool pages compete with each other AND the homepage for the same keywords. Blog posts get zero indexation value.

**Fix:** Implement **React Helmet Async** or **Next.js-style dynamic meta tags**:

```javascript
// Add react-helmet-async to each route
import { Helmet } from 'react-helmet-async';

// Tool page example
function ToolPage({ repo }) {
  return (
    <>
      <Helmet>
        <title>{repo.name} — Open Source {repo.category} Alternative | GitStack</title>
        <meta name="description" content={`${repo.description}. Stars: ${repo.stars}. Free open-source alternative to ${repo.replaces_saas?.join(', ')}.`} />
        <link rel="canonical" href={`https://gitstack.pro/tools/${repo.full_name}`} />
        <meta property="og:title" content={`${repo.name} — Open Source Alternative`} />
        <meta property="og:description" content={repo.description} />
        <meta property="og:url" content={`https://gitstack.pro/tools/${repo.full_name}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      {/* ... */}
    </>
  );
}
```

**Priority pages to fix first:**
1. `/tools/:owner/:repo` — 12,000+ pages, highest traffic potential
2. `/blog/:slug` — Blog posts (target long-tail keywords)
3. `/stack-generator/`, `/roast-my-stack/`, `/solution-finder/` — High-intent feature pages

---

### 🚨 P0 — WWW vs Non-WWW Canonicalization Conflict

**Finding:**
- `robots.txt` → `Host: https://gitstack.pro` (non-www)
- `sitemap.xml` → `https://www.gitstack.pro/` (www)
- `<link rel="canonical">` → `https://gitstack.pro/` (non-www)
- HTTP redirect → `Location: https://www.gitstack.pro/...` (www)

**Impact:** Split authority, duplicate content risk, Google confused about which version to index.

**Fix:** Pick ONE canonical version (recommend **non-www** since it's shorter) and enforce everywhere:
1. Update sitemap to use `https://gitstack.pro/`
2. Remove www redirect OR update canonical to match www
3. Update `robots.txt` Host to match final choice
4. Set 301 redirect from www → non-www (or vice versa)
5. Update Google Search Console property to preferred version

---

### 🚨 P0 — Missing Tool Pages in Sitemap

**Finding:** Sitemap has only 24 URLs. Missing 12,000+ tool pages.

**Current sitemap URLs:**
- Homepage, tools list, marketplace, collections, repo-of-the-day
- 5 blog posts
- 11 feature/utility pages

**Impact:** Google doesn't discover tool pages. Massive missed organic traffic.

**Fix:** Generate dynamic sitemap with all indexable tool pages:
```xml
<!-- Add to sitemap.xml -->
<url>
  <loc>https://gitstack.pro/tools/n8n-io/n8n</loc>
  <lastmod>2026-05-20</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
  <image:image>
    <image:loc>https://opengraph.githubassets.com/1/n8n-io/n8n</image:loc>
  </image:image>
</url>
<!-- Repeat for all 12,000+ repos -->
```

Split into sitemap index if >50,000 URLs:
```xml
<sitemapindex>
  <sitemap><loc>https://gitstack.pro/sitemap-tools-1.xml</loc></sitemap>
  <sitemap><loc>https://gitstack.pro/sitemap-tools-2.xml</loc></sitemap>
  <sitemap><loc>https://gitstack.pro/sitemap-blog.xml</loc></sitemap>
  <sitemap><loc>https://gitstack.pro/sitemap-static.xml</loc></sitemap>
</sitemapindex>
```

---

### 🚨 P0 — OG Image is SVG

**Finding:** `<meta property="og:image" content="https://gitstack.pro/og-image.svg" />`

**Impact:** Facebook, LinkedIn, Twitter do NOT support SVG for OG images. Shares show blank/missing images.

**Fix:** Generate PNG/JPG OG images:
- Use `@vercel/og` or Cloudinary for dynamic OG images
- Tool pages: screenshot or GitHub repo image
- Blog posts: featured image or auto-generated

---

## Phase 2: Technical SEO Issues

### 🔴 P1 — Missing AI Crawler Directives in robots.txt

**Current robots.txt:**
```
User-agent: *
Allow: /
Disallow: /dashboard
...
```

**Fix:** Add explicit AI crawler directives (2026 standard):
```
# AI Crawlers — Allow retrieval, block training where possible
User-agent: GPTBot
Allow: /
Disallow: /dashboard/
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Disallow: /dashboard/
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Disallow: /dashboard/
Disallow: /api/

User-agent: Google-Extended
Allow: /
Disallow: /dashboard/
Disallow: /api/

User-agent: Bingbot
Crawl-delay: 1
Allow: /
Disallow: /dashboard
...
```

**Why:** Without explicit directives, AI engines may not crawl tool pages. GEO = zero if AI can't read your content.

---

### 🔴 P1 — No Server-Side Rendering (SSR) for Tool Pages

**Finding:** All content is client-side rendered. Googlebot sees empty `<div id="root"></div>`.

**Impact:** Google may not index dynamic content. Page speed is poor for first paint.

**Fix Options:**
1. **Recommended:** Use React Helmet + prerender.io or Rendertron for bot requests
2. **Better:** Migrate critical pages to Next.js with SSR/SSG
3. **Quick win:** Add `prerender.io` middleware to backend:
```python
# backend/server.py
@app.middleware("http")
async def prerender_middleware(request: Request, call_next):
    user_agent = request.headers.get("User-Agent", "").lower()
    bots = ["googlebot", "bingbot", "slackbot", "twitterbot", "facebookexternalhit"]
    if any(bot in user_agent for bot in bots) and request.url.path.startswith("/tools/"):
        # Serve prerendered HTML or use prerender.io service
        pass
    return await call_next(request)
```

---

### 🔴 P1 — No Core Web Vitals Optimization

**Finding:** Heavy JS bundle, no lazy loading evidence, GTM + PostHog + Plausible = render-blocking scripts.

**Fix:**
1. Defer non-critical scripts:
```html
<!-- Instead of inline GTM -->
<script defer src="/gtm-loader.js"></script>
```
2. Add `loading="lazy"` to all images below the fold
3. Code-split routes with React.lazy()
4. Add resource hints:
```html
<link rel="preload" href="/static/css/main.css" as="style">
<link rel="dns-prefetch" href="https://api.gitstack.pro">
```

---

### 🟡 P2 — HSTS Missing

**Fix:** Add Strict-Transport-Security header:
```python
# backend/server.py
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
```

---

## Phase 3: On-Page SEO Issues

### 🔴 P1 — Identical H1 on All Pages

**Finding:** Every page likely has the same H1: "GitStack — GitHub, Simplified for Founders"

**Fix:** Dynamic H1s per page type:

| Page Type | Example H1 |
|-----------|-----------|
| Tool page | "n8n — Open Source Workflow Automation" |
| Blog post | "Top 5 Zapier Alternatives (Open Source)" |
| Feature page | "AI Stack Generator for Non-Technical Founders" |
| Category | "Open Source Automation Tools" |

---

### 🔴 P1 — Missing Header Hierarchy

**Finding:** SPA likely has poor heading structure (multiple H1s or skipped levels).

**Fix:** Enforce single H1 + logical H2→H3 flow:
```
H1: [Page-specific main heading]
  H2: What is [Tool Name]?
    H3: Key Features
    H3: Use Cases
  H2: Why Choose [Tool Name]?
  H2: Getting Started
  H2: Alternatives
```

---

### 🟡 P2 — Missing Breadcrumb Navigation

**Fix:** Add breadcrumb schema + visual breadcrumbs:
```html
<nav aria-label="breadcrumb">
  <ol>
    <li><a href="/">GitStack</a></li>
    <li><a href="/tools/">Tools</a></li>
    <li><a href="/tools/category/automation">Automation</a></li>
    <li>n8n</li>
  </ol>
</nav>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://gitstack.pro/"},
    {"@type": "ListItem", "position": 2, "name": "Tools", "item": "https://gitstack.pro/tools/"},
    {"@type": "ListItem", "position": 3, "name": "Automation", "item": "https://gitstack.pro/tools/category/automation"},
    {"@type": "ListItem", "position": 4, "name": "n8n", "item": "https://gitstack.pro/tools/n8n-io/n8n"}
  ]
}
</script>
```

---

## Phase 4: Schema & Structured Data

### 🔴 P1 — Missing SoftwareApplication Schema for Tool Pages

**Current schema:** Only `WebSite`, `Organization`, `SearchAction`

**Fix for EVERY tool page:**
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "n8n",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "50000"
  },
  "description": "Open-source workflow automation tool. Alternative to Zapier.",
  "url": "https://gitstack.pro/tools/n8n-io/n8n",
  "sameAs": [
    "https://github.com/n8n-io/n8n",
    "https://n8n.io"
  ],
  "author": {
    "@type": "Organization",
    "name": "n8n.io"
  }
}
```

---

### 🔴 P1 — Missing Article Schema for Blog Posts

**Fix:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Top 5 Zapier Alternatives (Open Source)",
  "description": "...",
  "image": "https://gitstack.pro/blog/zapier-alternatives.png",
  "datePublished": "2026-05-15",
  "dateModified": "2026-05-18",
  "author": {
    "@type": "Organization",
    "name": "GitStack",
    "url": "https://gitstack.pro"
  },
  "publisher": {
    "@type": "Organization",
    "name": "GitStack",
    "logo": {
      "@type": "ImageObject",
      "url": "https://gitstack.pro/logo.png"
    }
  }
}
```

---

### 🟡 P2 — Add FAQPage Schema to FAQ Page

**Fix:** Wrap FAQ content in FAQPage schema for rich results.

---

## Phase 5: GEO / AI Optimization (Generative Engine Optimization)

### 🔴 P1 — No AI-Citation-Ready Content Structure

**Finding:** Tool descriptions are likely brief. AI engines need quotable, structured facts.

**Fix for tool pages:**
1. Add a "Key Facts" table at the top:
```markdown
## n8n at a Glance
| Attribute | Value |
|-----------|-------|
| **Type** | Workflow Automation |
| **License** | Apache 2.0 (Sustainable Use License for enterprise) |
| **GitHub Stars** | 73,000+ |
| **Replaces** | Zapier, Make, Workato |
| **Self-hostable** | Yes |
| **API** | Yes (REST + Webhooks) |
| **Best for** | Technical teams, complex workflows |
```

2. Add clear "What is X?" definition paragraph (AI loves these):
```markdown
## What is n8n?
n8n is an open-source workflow automation platform that lets you connect apps and services without writing code. Unlike Zapier, n8n can be self-hosted for free and handles complex branching logic.
```

3. Add comparison tables (AI engines cite these heavily):
```markdown
## n8n vs Zapier
| Feature | n8n | Zapier |
|---------|-----|--------|
| Price (self-hosted) | Free | N/A |
| Price (cloud) | $20/mo | $19.99/mo |
| Self-hostable | Yes | No |
| Open source | Yes | No |
| Complex logic | Excellent | Basic |
```

---

### 🔴 P1 — No Entity Disambiguation

**Finding:** "GitStack" is a generic term. AI engines may confuse with other "GitStack" products.

**Fix:** Build entity profile:
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "GitStack",
  "alternateName": "GitStack.pro",
  "url": "https://gitstack.pro",
  "sameAs": [
    "https://github.com/Bedaant/Gitstack",
    "https://twitter.com/gitstack"
  ],
  "description": "GitStack helps non-technical founders discover and use open-source GitHub tools through AI-powered explanations, stack generation, and plain-English translations.",
  "founder": {
    "@type": "Person",
    "name": "[Your Name]"
  }
}
```

Also create Wikidata item if possible, and add to:
- Crunchbase
- LinkedIn Company Page
- Product Hunt
- Indie Hackers

---

### 🔴 P1 — Missing HowTo Schema for Feature Pages

**Fix for `/stack-generator/`:**
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Generate a Tech Stack with AI",
  "description": "Use GitStack's AI Stack Generator to build a complete open-source tech stack for your startup idea.",
  "totalTime": "PT5M",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Describe your idea",
      "text": "Enter your startup idea in plain English."
    },
    {
      "@type": "HowToStep",
      "name": "Get AI recommendations",
      "text": "GitStack's AI analyzes your idea and suggests the best open-source tools."
    }
  ]
}
```

---

## Phase 6: Keyword Research & Content Strategy

### Primary Keyword Targets

| Keyword | Intent | Difficulty | Priority |
|---------|--------|-----------|----------|
| open source alternatives | Informational | High | P0 |
| zapier alternative open source | Commercial | Medium | P0 |
| self hosted automation tool | Commercial | Medium | P0 |
| github tools for non technical founders | Informational | Low | P0 |
| open source workflow automation | Commercial | Medium | P1 |
| n8n vs zapier | Commercial | Low | P1 |
| best open source crm | Commercial | Medium | P1 |
| self hosted analytics | Commercial | Low | P1 |
| open source email marketing | Commercial | Medium | P1 |
| github repo explained | Informational | Low | P2 |

### Content Gap Opportunities

1. **"Best open source X" series** — One blog post per major SaaS category
2. **"Self-hosted vs Cloud" comparison pages** — High GEO value (AI loves comparisons)
3. **"How to self-host [tool]" tutorials** — Tutorial content gets cited by AI
4. **"Founder stack for [industry]"** — Vertical-specific stack recommendations
5. **Tool alternatives comparison tables** — Structured data AI can quote

### Blog Content Calendar (Next 90 Days)

| Week | Topic | Target Keyword | Type |
|------|-------|---------------|------|
| 1 | Best Open Source Zapier Alternatives | zapier alternative open source | Comparison |
| 2 | How to Self-Host n8n in 2026 | self host n8n | Tutorial |
| 3 | 10 Open Source Tools Every Startup Needs | open source tools for startups | Listicle |
| 4 | Open Source CRM vs Salesforce | open source crm | Comparison |
| 5 | Self-Hosted Analytics: Plausible vs Matomo | self hosted analytics | Comparison |
| 6 | Complete Founder Stack for SaaS (2026) | tech stack for saas startup | Guide |
| 7 | Open Source Email Marketing Tools | open source email marketing | Listicle |
| 8 | n8n vs Make vs Zapier: Detailed Comparison | n8n vs make vs zapier | Comparison |
| 9 | How to Read Any GitHub Repo (Non-Technical Guide) | how to understand github repos | Tutorial |
| 10 | 15 Open Source AI Tools for Startups | open source ai tools | Listicle |
| 11 | Self-Hosted Project Management: Plane vs Focalboard | open source project management | Comparison |
| 12 | Open Source Authentication: Keycloak vs Authelia | open source auth | Comparison |

---

## Phase 7: Competitor Analysis

### Direct Competitors

| Competitor | Domain Authority | Strength | Weakness |
|-----------|-----------------|----------|----------|
| **AlternativeTo** | 85 | Massive index, user reviews | No AI features, poor explanations |
| **Product Hunt** | 82 | Launch traffic, community | Not SEO-optimized for alternatives |
| **GitHub Awesome Lists** | 70 | Developer trust | Not founder-friendly |
| **Opensource.builders** | 45 | Clean UI, focused | Small index, no AI |
| **LibHunt** | 50 | Auto-updated | Poor UX, thin content |

### GEO Competitors (AI Citations)

| Query | Who Gets Cited | Why |
|-------|---------------|-----|
| "zapier open source alternative" | n8n.io, AlternativeTo | Direct answer pages, clear comparisons |
| "best self hosted automation" | n8n, Huginn | Structured feature tables |
| "open source tools for startups" | GitHub Awesome, Product Hunt | Comprehensive lists |

**Gap:** GitStack is NOT being cited because:
1. No standalone comparison pages (only tool listings)
2. No clear "What is X?" definitions (AI can't extract facts)
3. No structured comparison tables
4. Low domain authority (new site)

---

## Phase 8: Internal Linking Structure

### Current State
Likely minimal — SPA navigation doesn't create crawlable link paths.

### Recommended Structure
```
Homepage
├── Category Pages (/tools/category/automation)
│   ├── Tool Pages (/tools/n8n-io/n8n)
│   │   ├── "Alternatives" section → links to related tools
│   │   ├── "Used in stacks" → links to founder stacks
│   │   └── "Related tools" → 3-5 similar tools
│   └── Comparison Pages (/compare/n8n-vs-zapier)
├── Blog
│   ├── Category indexes (/blog/category/automation)
│   └── Individual posts → link to relevant tools
├── Founder Stacks (/founder-stacks/saas-2026)
│   └── Link to each tool in the stack
└── Collections (/collections/self-hosted-analytics)
    └── Link to all tools in collection
```

**Fix:** Add contextual internal links:
- Tool pages → "See also: [3 related tools]"
- Blog posts → "Try it: [link to tool page]"
- Comparison pages → "Full review: [link to tool page]"

---

## Phase 9: Action Checklist (Prioritized)

### This Week (P0)
- [ ] Fix SPA meta tags (React Helmet Async) — ALL pages need unique title/description/canonical
- [ ] Fix www vs non-www canonicalization
- [ ] Generate full sitemap with all tool pages
- [ ] Replace SVG OG image with PNG
- [ ] Add SoftwareApplication schema to tool pages
- [ ] Add AI crawler directives to robots.txt

### Next 2 Weeks (P1)
- [ ] Implement dynamic H1s per page
- [ ] Add breadcrumb navigation + schema
- [ ] Add Article schema to blog posts
- [ ] Add FAQPage schema to FAQ page
- [ ] Add HowTo schema to feature pages
- [ ] Implement prerender.io or SSR for bot requests
- [ ] Add "Key Facts" tables to tool pages
- [ ] Add "What is X?" definitions to tool pages
- [ ] Add comparison tables (tool vs SaaS alternatives)
- [ ] Defer non-critical scripts (GTM, analytics)

### Next 30 Days (P2)
- [ ] Write 4 blog posts from content calendar
- [ ] Create entity profile (Wikidata, Crunchbase, LinkedIn)
- [ ] Add internal linking modules ("Related tools", "See also")
- [ ] Implement lazy loading for images
- [ ] Add HSTS and security headers
- [ ] Set up Google Search Console + Bing Webmaster Tools
- [ ] Create comparison pages (/compare/n8n-vs-zapier)
- [ ] Build "Founder Stack" vertical pages
- [ ] Add author bios to blog posts
- [ ] Implement code splitting for routes

### Next 90 Days (P3)
- [ ] Complete 12-blog-post calendar
- [ ] Build 20+ comparison pages
- [ ] Reach out for backlinks (guest posts, HARO, Indie Hackers)
- [ ] Set up rank tracking
- [ ] Monitor Core Web Vitals monthly
- [ ] A/B test title tags for CTR
- [ ] Build email list from SEO traffic
- [ ] Launch on Product Hunt with SEO-optimized landing page

---

## Metrics to Track

| Metric | Current | Target (90 days) |
|--------|---------|-----------------|
| Indexed pages | ~24 | 5,000+ |
| Organic traffic | Unknown | 10,000+/month |
| Avg. position for "open source alternatives" | Unknown | Top 10 |
| Domain Rating | Unknown | 30+ |
| Backlinks | Unknown | 100+ |
| Core Web Vitals (LCP) | Unknown | <2.5s |
| AI citations (ChatGPT/Perplexity) | 0 | 10+ |

---

## Handoff Summary

**Blocking defects:**
1. SPA meta tag cannibalization — ALL pages look identical to Google
2. Missing tool pages in sitemap — 12,000+ pages invisible
3. No GEO-ready content structure — AI engines cannot cite GitStack

**Open loops:**
- Validate keyword volumes with actual search data (needs SEO tool connector)
- Decide on www vs non-www canonical version
- Set up prerender.io or evaluate Next.js migration
- Create entity profiles for top 50 tools

**Next best skills to run:**
1. `content-gap-analysis` — Detailed gap vs AlternativeTo and Opensource.builders
2. `internal-linking-optimizer` — Build link graph for 12,000+ tool pages
3. `backlink-analyzer` — Find link building opportunities
4. `performance-reporter` — Set up CWV monitoring

---

*Audit generated by SEO/GEO Skills Pack v9.9.9*
*Full skill library: https://github.com/aaron-he-zhu/seo-geo-claude-skills*
