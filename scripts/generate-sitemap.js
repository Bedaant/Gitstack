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
const SITE_URL = "https://www.gitstack.pro";
const OUT = path.join(__dirname, "..", "frontend", "public", "sitemap.xml");

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
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

async function main() {
  console.log("🗺️  Generating dynamic sitemap...");
  console.log(`   API: ${API_BASE}`);

  const urls = [];

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
    { path: "/about/", changefreq: "monthly", priority: "0.5" },
    { path: "/terms/", changefreq: "yearly", priority: "0.3" },
    { path: "/privacy/", changefreq: "yearly", priority: "0.3" },
    { path: "/faq/", changefreq: "weekly", priority: "0.8" },
    { path: "/blog/", changefreq: "daily", priority: "0.8" },
  ];

  for (const p of staticPages) {
    urls.push({
      loc: `${SITE_URL}${p.path}`,
      changefreq: p.changefreq,
      priority: p.priority,
    });
  }

  // ── Tools ──
  console.log("   Fetching tools...");
  const tools = await fetchJson(`${API_BASE}/tools`);
  if (Array.isArray(tools)) {
    for (const t of tools) {
      const id = t.tool_id || t.id;
      if (!id) continue;
      urls.push({
        loc: `${SITE_URL}/tools/${id}/`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: toXmlDate(t.updated_at || t.created_at),
      });
    }
    console.log(`   ✅ ${tools.length} tools`);
  }

  // ── Topics ──
  console.log("   Fetching topics...");
  const topics = await fetchJson(`${API_BASE}/topics`);
  if (Array.isArray(topics)) {
    for (const t of topics) {
      const id = t.topic_id || t.id;
      if (!id) continue;
      urls.push({
        loc: `${SITE_URL}/topics/${id}/`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
    console.log(`   ✅ ${topics.length} topics`);
  }

  // ── Collections ──
  console.log("   Fetching collections...");
  const collections = await fetchJson(`${API_BASE}/collections`);
  if (Array.isArray(collections)) {
    for (const c of collections) {
      const id = c.collection_id || c.id;
      if (!id) continue;
      urls.push({
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
  const products = await fetchJson(`${API_BASE}/marketplace/products`);
  if (Array.isArray(products)) {
    for (const p of products) {
      const id = p.product_id || p.id;
      if (!id) continue;
      urls.push({
        loc: `${SITE_URL}/marketplace/${id}/`,
        changefreq: "daily",
        priority: "0.9",
        lastmod: toXmlDate(p.created_at || p.updated_at),
      });
    }
    console.log(`   ✅ ${products.length} products`);
  }

  // ── Alternatives (from tools with paid_alternative) ──
  console.log("   Fetching alternatives...");
  const toolsForAlts = await fetchJson(`${API_BASE}/tools`);
  const seenAlts = new Set();
  if (Array.isArray(toolsForAlts)) {
    for (const t of toolsForAlts) {
      const alt = t.paid_alternative;
      if (!alt) continue;
      const slug = String(alt)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug || seenAlts.has(slug)) continue;
      seenAlts.add(slug);
      urls.push({
        loc: `${SITE_URL}/alternatives/${slug}/`,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
    console.log(`   ✅ ${seenAlts.size} alternatives`);
  }

  // ── Repo translator pages (top 200 trending repos) ──
  console.log("   Fetching trending repos...");
  const trending = await fetchJson(`${API_BASE}/tools/trending/list`);
  if (Array.isArray(trending)) {
    for (const r of trending.slice(0, 200)) {
      const fullName = r.full_name;
      if (!fullName || !fullName.includes("/")) continue;
      urls.push({
        loc: `${SITE_URL}/r/${fullName}/`,
        changefreq: "weekly",
        priority: "0.6",
      });
    }
    console.log(`   ✅ ${Math.min(trending.length, 200)} repos`);
  }

  // ── Blog posts (if blog manifest exists) ──
  const blogManifestPath = path.join(__dirname, "..", "content", "blog", "manifest.json");
  if (fs.existsSync(blogManifestPath)) {
    console.log("   Fetching blog posts...");
    const blogManifest = JSON.parse(fs.readFileSync(blogManifestPath, "utf8"));
    for (const post of blogManifest.posts || []) {
      urls.push({
        loc: `${SITE_URL}/blog/${post.slug}/`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: toXmlDate(post.date),
      });
    }
    console.log(`   ✅ ${blogManifest.posts?.length || 0} blog posts`);
  }

  // ── Write XML ──
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
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

  fs.writeFileSync(OUT, lines.join("\n") + "\n", "utf8");
  console.log(`\n✅ Sitemap written: ${OUT}`);
  console.log(`   Total URLs: ${urls.length}`);
}

main().catch((err) => {
  console.error("❌ Sitemap generation failed:", err);
  process.exit(1);
});
