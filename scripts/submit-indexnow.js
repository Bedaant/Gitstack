#!/usr/bin/env node
/**
 * IndexNow URL Submission
 * Submits all URLs from sitemap.xml to IndexNow API
 * Supports: Bing, Yandex, Naver, Seznam.cz, and other participating engines
 *
 * Usage:
 *   node scripts/submit-indexnow.js
 */

const fs = require("fs");
const path = require("path");

const KEY = "63b65d7aaf214e50a64c7b90fb33ae90";
const HOST = "www.gitstack.pro";
const SITEMAP_PATH = path.join(__dirname, "..", "frontend", "public", "sitemap.xml");

const ENDPOINTS = [
  "https://api.indexnow.org/IndexNow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

function extractUrlsFromSitemap(xml) {
  const urls = [];
  const matches = xml.matchAll(/<loc>([^<]+)<\/loc>/g);
  for (const match of matches) {
    urls.push(match[1].trim());
  }
  return urls;
}

async function submitToEndpoint(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    let body = "";
    try {
      body = await res.text();
    } catch {}

    return { endpoint, status, body, ok: res.ok };
  } catch (err) {
    return { endpoint, status: 0, body: err.message, ok: false };
  }
}

async function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error("❌ Sitemap not found:", SITEMAP_PATH);
    process.exit(1);
  }

  const xml = fs.readFileSync(SITEMAP_PATH, "utf8");
  const urls = extractUrlsFromSitemap(xml);

  if (urls.length === 0) {
    console.error("❌ No URLs found in sitemap");
    process.exit(1);
  }

  console.log(`📡 Submitting ${urls.length} URLs to IndexNow...\n`);

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  };

  const results = await Promise.all(
    ENDPOINTS.map((ep) => submitToEndpoint(ep, payload))
  );

  let allOk = true;
  for (const r of results) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`${icon} ${r.endpoint}`);
    console.log(`   Status: ${r.status}`);
    if (r.body) console.log(`   Response: ${r.body.slice(0, 200)}`);
    console.log();
    if (!r.ok) allOk = false;
  }

  if (allOk) {
    console.log("🎉 All submissions successful!");
  } else {
    console.log("⚠️  Some submissions failed. Check responses above.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Submission failed:", err);
  process.exit(1);
});
