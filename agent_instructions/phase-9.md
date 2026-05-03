# Phase 9 — GitStack README Badge GitHub Action

## What
A reusable GitHub Action that auto-injects GitStack tech-stack badges into any repo's README.md. Creates backlinks, drives traffic, and is the primary growth loop.

## Files
- `actions/readme-badge/action.yml` — Action metadata
- `actions/readme-badge/index.js` — Core logic: inject/update badge block between HTML markers
- `actions/readme-badge/dist/index.js` — Bundled via `@vercel/ncc` (589KB)
- `actions/readme-badge/README.md` — Marketplace docs with usage example
- `actions/readme-badge/PUBLISH.md` — Step-by-step publish guide
- `frontend/src/pages/ReadmeBadgePage.js` — Landing page with one-click workflow deeplink
- `frontend/src/components/Header.js` — "README Badge" in AI Tools dropdown + mobile menu
- `frontend/src/pages/GitHubRepoPage.js` — Badge promo CTA on repo pages
- `frontend/public/sitemap.xml` — Added `/readme-badge` URL

## Key Features
- Two install paths: GitHub Action (auto-updates) or static markdown snippet
- Uses `<!-- GITSTACK-BADGE:START/END -->` markers for safe updates
- Three shields.io badges: Stack Analysis (purple), Plain English (green), Repo X-Ray (orange)
- One-click "Open pre-filled workflow on GitHub" button via `new file + value=` deeplink

## Status
✅ Complete — publish to GitHub Marketplace is a manual step for the owner
