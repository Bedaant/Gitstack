#!/usr/bin/env node
/**
 * Blog Build Script
 * =================
 * Parses markdown blog posts from content/blog/ and generates:
 * - content/blog/manifest.json (index of all posts)
 * - frontend/public/blog-data/ (JSON files for each post, rendered by React)
 *
 * Usage:
 *   node scripts/build-blog.js
 */

const fs = require("fs");
const path = require("path");

const BLOG_DIR = path.join(__dirname, "..", "content", "blog");
const OUT_DIR = path.join(__dirname, "..", "frontend", "public", "blog-data");
const MANIFEST_PATH = path.join(__dirname, "..", "content", "blog", "manifest.json");

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const raw = match[1];
  const body = match[2].trim();
  const meta = {};

  for (const line of raw.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    // Handle arrays: ["a", "b"]
    if (val.startsWith("[") && val.endsWith("]")) {
      try {
        val = JSON.parse(val.replace(/'/g, '"'));
      } catch {
        val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      }
    } else {
      val = val.replace(/^["']|["']$/g, "");
    }
    meta[key] = val;
  }

  return { meta, body };
}

function slugify(filename) {
  return filename.replace(/\.md$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function main() {
  console.log("📝 Building blog...");

  if (!fs.existsSync(BLOG_DIR)) {
    console.log("   No blog directory found. Skipping.");
    fs.mkdirSync(BLOG_DIR, { recursive: true });
    return;
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => b.localeCompare(a)); // newest first

  const posts = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || slugify(file);

    const post = {
      slug,
      title: meta.title || slug,
      description: meta.description || "",
      date: meta.date || new Date().toISOString().split("T")[0],
      author: meta.author || "GitStack",
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      image: meta.image || "/og-image.svg",
      body,
    };

    posts.push(post);

    // Write individual JSON for React to fetch
    fs.writeFileSync(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(post, null, 2), "utf8");
  }

  const manifest = { posts, total: posts.length, generatedAt: new Date().toISOString() };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`✅ Blog built: ${posts.length} posts`);
  console.log(`   Manifest: ${MANIFEST_PATH}`);
  console.log(`   Data dir: ${OUT_DIR}`);
}

main();
