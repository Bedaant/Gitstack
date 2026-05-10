#!/usr/bin/env node
/**
 * Repo X-Ray Build Script
 * =======================
 * Rebrands the upstream CodeFlow (MIT) index.html into GitStack's "Repo X-Ray"
 * and outputs it to frontend/public/xray.html so CRA serves it at /xray.html.
 *
 * Usage:
 *   node scripts/build-xray.js
 *
 * To pull upstream updates later:
 *   cd xray && git pull && cd .. && node scripts/build-xray.js
 *
 * All changes are done via find/replace so the upstream repo stays pristine
 * and we can take future updates cleanly.
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "xray", "index.html");
const OUT_DIR = path.join(__dirname, "..", "frontend", "public");
const OUT = path.join(OUT_DIR, "xray.html");

if (!fs.existsSync(SRC)) {
  console.error(`❌ Source not found: ${SRC}`);
  console.error("   Did you run `git clone https://github.com/braedonsaunders/codeflow.git xray`?");
  process.exit(1);
}

console.log("📄 Reading CodeFlow source...");
let html = fs.readFileSync(SRC, "utf8");
const originalSize = Buffer.byteLength(html, "utf8");

// ---------------------------------------------------------------------------
// 1. BRAND COLORS — swap CodeFlow's mint-green for GitStack primary blue
// ---------------------------------------------------------------------------
const colorSwaps = [
  // Dark mode accent
  ["--acc:#00ff9d", "--acc:#2563EB"],
  ["--acc2:#00cc7d", "--acc2:#1D4ED8"],
  ["--accbg:rgba(0,255,157,0.08)", "--accbg:rgba(37,99,235,0.12)"],
  // Light mode accent
  ["--acc:#00a86b", "--acc:#2563EB"],
  ["--acc2:#008f5b", "--acc2:#1D4ED8"],
  ["--accbg:rgba(0,168,107,0.08)", "--accbg:rgba(37,99,235,0.10)"],
  // Favicon accent color (SVG stroke)
  ["stroke='%2300ff9d'", "stroke='%232563EB'"],
];

// ---------------------------------------------------------------------------
// 2. TEXT / BRAND STRINGS — keep technical markers (CODEFLOW_ANALYZER_*) alone
// ---------------------------------------------------------------------------
const textSwaps = [
  // HTML <head>
  [
    "<title>CodeFlow — Open Source Architecture Intelligence</title>",
    "<title>Repo X-Ray — GitStack | Visualize Any GitHub Repo's Architecture</title>",
  ],
  [
    '<meta name="description" content="Visualize any GitHub repository\'s architecture in seconds. See dependencies, blast radius, code ownership, security issues, and design patterns. No installation required.">',
    '<meta name="description" content="X-ray any GitHub repo in seconds. See dependencies, blast radius, code ownership, and security issues — plain English for founders, full depth for developers. Free on GitStack.">',
  ],
  ['<meta name="author" content="CodeFlow">', '<meta name="author" content="GitStack">'],
  [
    '<meta property="og:title" content="CodeFlow — Visualize Your Codebase Architecture">',
    '<meta property="og:title" content="Repo X-Ray by GitStack — Visualize Any Codebase">',
  ],
  [
    '<meta property="og:description" content="Turn any GitHub repo into an interactive architecture map in seconds. Zero setup, privacy-first, runs in your browser.">',
    '<meta property="og:description" content="Turn any GitHub repo into an interactive architecture map in seconds. Zero setup, runs in your browser. By GitStack.">',
  ],
  ['<meta property="og:image" content="codeflow-social.png">', '<meta property="og:image" content="/logo.svg">'],
  [
    '<meta name="twitter:title" content="CodeFlow — Visualize Your Codebase Architecture">',
    '<meta name="twitter:title" content="Repo X-Ray by GitStack">',
  ],
  [
    '<meta name="twitter:description" content="Turn any GitHub repo into an interactive architecture map in seconds. Zero setup, privacy-first.">',
    '<meta name="twitter:description" content="X-ray any GitHub repo in seconds. Free on GitStack.">',
  ],
  ['<meta name="twitter:image" content="codeflow-social.png">', '<meta name="twitter:image" content="/logo.svg">'],

  // Visible UI strings — "CODEFLOW" logo text (ALL CAPS in the brand pill)
  ["'logo-text'},'CODEFLOW'", "'logo-text'},'REPO X-RAY'"],

  // User-facing copy (keep technical markers CODEFLOW_ANALYZER_START untouched)
  ["'CodeFlow ran into an issue'", "'Repo X-Ray ran into an issue'"],
  ["'CodeFlow crashed:'", "'Repo X-Ray crashed:'"],
  ["use Open ZIP in CodeFlow.", "use Open ZIP in Repo X-Ray."],
  ["CodeFlow will analyze every eligible file.", "Repo X-Ray will analyze every eligible file."],
  // Generic branding in copy (last-resort)
  [">CodeFlow<", ">Repo X-Ray<"],
];

// ---------------------------------------------------------------------------
// 3. APPLY REPLACEMENTS
// ---------------------------------------------------------------------------
let swaps = 0;
const applyAll = (pairs) => {
  for (const [from, to] of pairs) {
    const before = html;
    html = html.split(from).join(to);
    if (before !== html) swaps++;
  }
};

applyAll(colorSwaps);
applyAll(textSwaps);

// ---------------------------------------------------------------------------
// 4. INJECT GOOGLE TAG MANAGER
// ---------------------------------------------------------------------------
const GTM_HEAD = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WL8RTZWW');</script>
<!-- End Google Tag Manager -->`;

const GTM_BODY = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WL8RTZWW"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

const CANONICAL_LINK = '<link rel="canonical" href="https://gitstack.pro/repo-xray" />';

html = html.replace('<head>', '<head>\n' + GTM_HEAD);
html = html.replace('<head>', '<head>\n' + CANONICAL_LINK);
html = html.replace('<body>', '<body>\n' + GTM_BODY);

// ---------------------------------------------------------------------------
// 5. INJECT GITSTACK FOOTER (MIT attribution + back-link)
//    Inserted right before </body>
// ---------------------------------------------------------------------------
const FOOTER_HTML = `
<div id="gitstack-xray-footer" style="position:fixed;bottom:8px;right:12px;z-index:200;font-family:'JetBrains Mono',monospace;font-size:10px;color:#94a3b8;background:rgba(10,10,12,0.7);backdrop-filter:blur(6px);padding:6px 10px;border-radius:6px;border:1px solid #2d2d35;display:flex;gap:8px;align-items:center;pointer-events:auto">
  <a href="https://gitstack.pro" target="_parent" style="color:#2563EB;text-decoration:none;font-weight:700;">← GitStack</a>
  <span style="opacity:0.5">·</span>
  <span>Analysis engine based on <a href="https://github.com/braedonsaunders/codeflow" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">CodeFlow (MIT)</a></span>
</div>
`;
html = html.replace("</body>", FOOTER_HTML + "</body>");

// ---------------------------------------------------------------------------
// 6. WRITE OUTPUT
// ---------------------------------------------------------------------------
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

const newSize = Buffer.byteLength(html, "utf8");
console.log(`✅ Rebranded Repo X-Ray written to:`);
console.log(`   ${OUT}`);
console.log(`   ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${swaps} swap groups applied)`);
console.log(`\n🌐 Once CRA is running, visit:`);
console.log(`   http://localhost:3000/xray.html?repo=vercel/next.js&run=1`);
