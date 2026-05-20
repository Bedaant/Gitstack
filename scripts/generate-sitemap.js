#!/usr/bin/env node
/**
 * Dynamic Sitemap Generator
 * =========================
 * Fetches live data from the GitStack backend API and generates
 * a comprehensive sitemap.xml with lastmod, changefreq, and priority.
 *
 * Usage:
 *   REACT_APP_BACKEND_URL=https://api.gitstack.pro node scripts/generate-sitemap.js
 *
 * Run automatically before build:
 *   npm run build:sitemap && npm run build
 */

const fs = require("fs");
const path = require("path");

const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001/api";
const PROD_API = "https://gitstack-backend.onrender.com/api";
const SITE_URL = "https://gitstack.pro";
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");
const OUT_INDEX = path.join(PUBLIC_DIR, "sitemap.xml");
const OUT_STATIC = path.join(PUBLIC_DIR, "sitemap-static.xml");
const OUT_TOOLS = path.join(PUBLIC_DIR, "sitemap-tools.xml");

async function fetchJson(url, fallbackUrl = null) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (fallbackUrl) {
      console.warn(`  ⚠️  Failed to fetch ${url}: ${err.message}. Trying fallback...`);
      try {
        const res = await fetch(fallbackUrl, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err2) {
        console.warn(`  ⚠️  Fallback also failed: ${err2.message}`);
        return null;
      }
    }
    console.warn(`  ⚠️  Failed to fetch ${url}: ${err.message}`);
    return null;
  }
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toXmlDate(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

function writeSitemap(urls, outPath) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const u of urls) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
    lines.push(`    <priority>${u.priority}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  console.log(`   ✅ Sitemap written: ${path.basename(outPath)} (${urls.length} URLs)`);
}

function writeSitemapIndex(sitemaps) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const s of sitemaps) {
    lines.push("  <sitemap>");
    lines.push(`    <loc>${escapeXml(s)}</loc>`);
    lines.push("  </sitemap>");
  }
  lines.push("</sitemapindex>");
  fs.writeFileSync(OUT_INDEX, lines.join("\n") + "\n", "utf8");
  console.log(`   ✅ Sitemap index written: sitemap.xml (${sitemaps.length} sitemaps)`);
}

async function main() {
  console.log("🗺️  Generating dynamic sitemap...");
  console.log(`   Primary API: ${API_BASE}`);
  console.log(`   Fallback API: ${PROD_API}`);

  const staticUrls = [];
  const toolUrls = [];

  // ── Static core pages ──
  const staticPages = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/tools/", changefreq: "daily", priority: "0.9" },
    { path: "/marketplace/", changefreq: "daily", priority: "0.9" },
    { path: "/collections/", changefreq: "weekly", priority: "0.7" },
    { path: "/repo-of-the-day/", changefreq: "daily", priority: "0.7" },
    { path: "/compare/", changefreq: "weekly", priority: "0.6" },
    { path: "/stack-generator/", changefreq: "weekly", priority: "0.9" },
    { path: "/roast-my-stack/", changefreq: "weekly", priority: "0.9" },
    { path: "/dead-tool-detector/", changefreq: "weekly", priority: "0.9" },
    { path: "/repo-translator/", changefreq: "weekly", priority: "0.8" },
    { path: "/repo-xray/", changefreq: "weekly", priority: "0.8" },
    { path: "/readme-badge/", changefreq: "monthly", priority: "0.7" },
    { path: "/idea-exists/", changefreq: "weekly", priority: "0.8" },
    { path: "/error-explainer/", changefreq: "weekly", priority: "0.8" },
    { path: "/founder-stacks/", changefreq: "weekly", priority: "0.8" },
    { path: "/solution-finder/", changefreq: "weekly", priority: "0.9" },
    { path: "/solutions/", changefreq: "weekly", priority: "0.8" },
    { path: "/about/", changefreq: "monthly", priority: "0.5" },
    { path: "/terms/", changefreq: "yearly", priority: "0.3" },
    { path: "/privacy/", changefreq: "yearly", priority: "0.3" },
    { path: "/faq/", changefreq: "weekly", priority: "0.8" },
    { path: "/blog/", changefreq: "daily", priority: "0.8" },
  ];

  for (const p of staticPages) {
    staticUrls.push({
      loc: `${SITE_URL}${p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    });
  }

  // ── Tools ──
  console.log("   Fetching tools...");
  const tools = await fetchJson(`${API_BASE}/tools?limit=20000`, `${PROD_API}/tools?limit=20000`);
  if (Array.isArray(tools) && tools.length > 0) {
    for (const t of tools) {
      const id = t.tool_id || t.id;
      if (!id) continue;
      toolUrls.push({
        loc: `${SITE_URL}/tools/${id}/`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: toXmlDate(t.updated_at || t.created_at),
      });
    }
    console.log(`   ✅ ${tools.length} tools`);
  } else {
    console.warn("   ⚠️  Could not fetch tools from API. Keeping existing sitemap-tools.xml if present.");
  }

  // ── Topics ──
  console.log("   Fetching topics...");
  const topics = await fetchJson(`${API_BASE}/topics`, `${PROD_API}/topics`);
  if (Array.isArray(topics)) {
    for (const t of topics) {
      const id = t.topic_id || t.id;
      if (!id) continue;
      staticUrls.push({
        loc: `${SITE_URL}/topics/${id}/`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
    console.log(`   ✅ ${topics.length} topics`);
  }

  // ── Collections ──
  console.log("   Fetching collections...");
  const collections = await fetchJson(`${API_BASE}/collections`, `${PROD_API}/collections`);
  if (Array.isArray(collections)) {
    for (const c of collections) {
      const id = c.collection_id || c.id;
      if (!id) continue;
      staticUrls.push({
        loc: `${SITE_URL}/collections/${id}/`,
        changefreq: "weekly",
        priority: "0.6",
        lastmod: toXmlDate(c.updated_at || c.created_at),
      });
    }
    console.log(`   ✅ ${collections.length} collections`);
  }

  // ── Marketplace products ──
  console.log("   Fetching marketplace products...");
  const products = await fetchJson(`${API_BASE}/marketplace/products`, `${PROD_API}/marketplace/products`);
  if (Array.isArray(products)) {
    for (const p of products) {
      const id = p.product_id || p.id;
      if (!id) continue;
      staticUrls.push({
        loc: `${SITE_URL}/marketplace/${id}/`,
        changefreq: "daily",
        priority: "0.9",
        lastmod: toXmlDate(p.created_at || p.updated_at),
      });
    }
    console.log(`   ✅ ${products.length} products`);
  }

  // ── Alternatives (from tools with paid_alternative) ──
  if (Array.isArray(tools) && tools.length > 0) {
    console.log("   Fetching alternatives...");
    const seenAlts = new Set();
    for (const t of tools) {
      const alt = t.paid_alternative;
      if (!alt) continue;
      const slug = String(alt)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug || seenAlts.has(slug)) continue;
      seenAlts.add(slug);
      staticUrls.push({
        loc: `${SITE_URL}/alternatives/${slug}/`,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
    console.log(`   ✅ ${seenAlts.size} alternatives`);
  }

  // ── Repo translator pages (top 200 trending repos) ──
  console.log("   Fetching trending repos...");
  const trending = await fetchJson(`${API_BASE}/tools/trending/list`, `${PROD_API}/tools/trending/list`);
  if (Array.isArray(trending)) {
    for (const r of trending.slice(0, 200)) {
      const fullName = r.full_name;
      if (!fullName || !fullName.includes("/")) continue;
      staticUrls.push({
        loc: `${SITE_URL}/r/${fullName}/`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
    console.log(`   ✅ ${Math.min(trending.length, 200)} repos`);
  }

  // ── Solutions categories ──
  console.log("   Fetching solutions...");
  const solutions = await fetchJson(`${API_BASE}/solutions`, `${PROD_API}/solutions`);
  if (solutions?.use_cases) {
    for (const s of solutions.use_cases) {
      staticUrls.push({
        loc: `${SITE_URL}/solutions/${s.slug}/`,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
    console.log(`   ✅ ${solutions.use_cases.length} solution categories`);
  }

  // ── Blog posts (API + static manifest) ──
  const blogApi = await fetchJson(`${API_BASE}/blog/posts?limit=1000`, `${PROD_API}/blog/posts?limit=1000`);
  if (blogApi?.posts) {
    console.log("   Fetching blog posts from API...");
    for (const post of blogApi.posts) {
      staticUrls.push({
        loc: `${SITE_URL}/blog/${post.slug}/`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: toXmlDate(post.created_at),
      });
    }
    console.log(`   ✅ ${blogApi.posts.length} blog posts from API`);
  }
  // Fallback to static manifest
  const blogManifestPath = path.join(__dirname, "..", "content", "blog", "manifest.json");
  if (fs.existsSync(blogManifestPath)) {
    console.log("   Fetching static blog posts...");
    const blogManifest = JSON.parse(fs.readFileSync(blogManifestPath, "utf8"));
    const seenSlugs = new Set((blogApi?.posts || []).map((p) => p.slug));
    for (const post of blogManifest.posts || []) {
      if (seenSlugs.has(post.slug)) continue;
      staticUrls.push({
        loc: `${SITE_URL}/blog/${post.slug}/`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: toXmlDate(post.date),
      });
    }
    console.log(`   ✅ ${blogManifest.posts?.length || 0} static blog posts`);
  }

  // ── Write sitemaps ──
  const sitemaps = [];

  // Write static sitemap
  writeSitemap(staticUrls, OUT_STATIC);
  sitemaps.push(`${SITE_URL}/sitemap-static.xml`);

  // Write tools sitemap (if we fetched tools) or keep existing
  if (toolUrls.length > 0) {
    writeSitemap(toolUrls, OUT_TOOLS);
    sitemaps.push(`${SITE_URL}/sitemap-tools.xml`);
  } else if (fs.existsSync(OUT_TOOLS)) {
    console.log("   ✅ Keeping existing sitemap-tools.xml");
    sitemaps.push(`${SITE_URL}/sitemap-tools.xml`);
  }

  // Write sitemap index
  writeSitemapIndex(sitemaps);

  console.log(`\n🎉 Sitemap generation complete!`);
  console.log(`   Total static URLs: ${staticUrls.length}`);
  console.log(`   Total tool URLs: ${toolUrls.length || 'kept from existing'}`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
