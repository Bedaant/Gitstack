# Phase 12 — SEO, AEO & GEO Optimization

## What
Systematic SEO audit and improvements to hit 80+ Lighthouse SEO score and maximize discoverability.

## Already Strong
- **Sitemap**: `frontend/public/sitemap.xml` — static + dynamic AI tools pages
- **JSON-LD**: Homepage has `@context` structured data (WebSite, SoftwareApplication)
- **Canonical URLs**: SEO component generates `https://gitstack.dev` canonical
- **Open Graph**: Title, description, image (1200×630), type, site_name on all SEO-wrapped pages
- **Twitter Cards**: `summary_large_image` on all pages
- **Breadcrumbs**: JSON-LD breadcrumb schema on tool/repo detail pages

## Fixes Applied
- **`frontend/src/pages/ToolDetailPage.js`** — Added dynamic `<SEO>` with `tool.name` and `description` (was completely missing — critical for long-tail search)
- `frontend/public/sitemap.xml` — Added `/about`, `/terms`, `/privacy`, `/readme-badge`
- `backend/.env` — Fixed `PORT=8000` to match frontend expectations (was defaulting to 10000)

## Remaining Gaps (lower priority)
- CollectionDetailPage, TopicToolsPage, ComparisonPage, RepoOfTheDayPage — still missing SEO wrappers
- No `robots.txt` file — should add with sitemap reference
- No server-side rendering — crawlers may not see client-rendered meta; consider Next.js or prerender.io for production
- No `<h1>` structure audit on all pages
- No image `alt` text audit
- No Core Web Vitals optimization (LCP, CLS)
- No hreflang tags (single-language site, low priority)

## Status
⚠️ Partial — high-impact pages done; remaining 6-8 pages need SEO added before 80+ score is guaranteed
