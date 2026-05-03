import React, { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Shield, Copy, Check, Github, Zap, GitBranch, ExternalLink } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { toast } from "sonner";

const ACTION_REPO = "GitStackHQ/gitstack-readme-badge";
const ACTION_REF = "v1";

const WORKFLOW_YAML = `name: GitStack Badge

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${ACTION_REPO}@${ACTION_REF}
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
`;

const MARKDOWN_SNIPPET = (owner, repo) =>
  `[![Analyzed by GitStack](https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=for-the-badge&logo=github)](https://gitstack.pro/r/${owner}/${repo})`;

function CopyBlock({ label, text, language = "yaml" }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="neo-card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-pastel-purple">
        <span className="text-xs font-black uppercase">{label}</span>
        <button
          onClick={onCopy}
          className="neo-btn neo-btn-secondary px-3 py-1 text-xs font-black uppercase flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto font-mono bg-background text-foreground whitespace-pre">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export default function ReadmeBadgePage() {
  const [ownerRepo, setOwnerRepo] = useState("");
  const parsed = useMemo(() => {
    const match = ownerRepo.trim().match(/([\w.-]+)\/([\w.-]+)/);
    return match ? { owner: match[1], repo: match[2].replace(/\.git$/, "") } : null;
  }, [ownerRepo]);

  const newWorkflowUrl = parsed
    ? `https://github.com/${parsed.owner}/${parsed.repo}/new/main?filename=.github/workflows/gitstack-badge.yml&value=${encodeURIComponent(
        WORKFLOW_YAML
      )}`
    : null;

  const markdown = parsed ? MARKDOWN_SNIPPET(parsed.owner, parsed.repo) : "";
  const repoUrl = parsed ? `https://gitstack.pro/r/${parsed.owner}/${parsed.repo}` : "#";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>GitStack README Badge — Add a tech-stack badge to your repo</title>
        <meta
          name="description"
          content="One-click GitHub Action that injects a GitStack tech-stack analysis badge into your README. Free, open source, and updates automatically."
        />
      </Helmet>
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 neo-card px-4 py-2 mb-6 bg-pastel-purple">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-black uppercase">GitHub Action</span>
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-black uppercase mb-4 leading-tight">
            README Badge
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Add a GitStack tech-stack badge to any repo's README in <strong>30 seconds</strong>.
            Updates itself on every push. Works on any public GitHub repo.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={`https://github.com/${ACTION_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="neo-btn neo-btn-secondary px-5 py-3 font-black text-sm flex items-center gap-2"
            >
              <Github className="w-4 h-4" /> View on GitHub
            </a>
            <a
              href="#install"
              className="neo-btn neo-btn-primary px-5 py-3 font-black text-sm flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Install Now
            </a>
          </div>
        </section>

        {/* Badge preview */}
        <section className="neo-card p-8 mb-12 bg-pastel-green">
          <h2 className="font-heading text-2xl font-black uppercase mb-4">What you get</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <img
              src="https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=for-the-badge&logo=github"
              alt="Analyzed by GitStack"
            />
            <img
              src="https://img.shields.io/badge/Plain%20English-Explanation-00B894?style=for-the-badge"
              alt="Plain English Explanation"
            />
            <img
              src="https://img.shields.io/badge/Repo%20X--Ray-Architecture-E17055?style=for-the-badge"
              alt="Repo X-Ray Architecture"
            />
          </div>
          <p className="text-sm text-foreground">
            Three live badges linking to your repo's analysis on GitStack. Visitors click → land on your tech-stack
            page → see exactly what's under the hood.
          </p>
        </section>

        {/* Install */}
        <section id="install" className="mb-12">
          <h2 className="font-heading text-3xl font-black uppercase mb-6">Install in 30 seconds</h2>

          <div className="neo-card p-6 mb-6">
            <label className="block text-xs font-black uppercase mb-2">Your repo (owner/name)</label>
            <input
              type="text"
              placeholder="e.g. vercel/next.js"
              value={ownerRepo}
              onChange={(e) => setOwnerRepo(e.target.value)}
              className="neo-input w-full px-4 py-3 font-mono text-sm"
            />
            {parsed && (
              <a
                href={newWorkflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="neo-btn neo-btn-primary mt-4 px-5 py-3 font-black text-sm inline-flex items-center gap-2"
              >
                <GitBranch className="w-4 h-4" />
                Open pre-filled workflow on GitHub
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-heading text-lg font-black uppercase mb-3">
                Option A — GitHub Action (auto-updates)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Commit this file to <code className="px-1 py-0.5 bg-muted rounded">.github/workflows/gitstack-badge.yml</code>.
                The badge will be injected on your next push.
              </p>
              <CopyBlock label="gitstack-badge.yml" text={WORKFLOW_YAML} />
            </div>
            <div>
              <h3 className="font-heading text-lg font-black uppercase mb-3">Option B — Static markdown</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Prefer no automation? Paste this snippet anywhere in your README.
              </p>
              <CopyBlock
                label={parsed ? "README.md" : "Enter a repo above"}
                text={markdown || "[![Analyzed by GitStack](https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=for-the-badge&logo=github)](https://gitstack.pro/r/OWNER/REPO)"}
              />
              {parsed && (
                <Link
                  to={`/r/${parsed.owner}/${parsed.repo}`}
                  className="text-xs font-bold uppercase underline mt-3 inline-block"
                >
                  → Preview your analysis page
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <h2 className="font-heading text-3xl font-black uppercase mb-6">Why add it?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Zero maintenance",
                body: "The action runs on push and keeps the badge block in sync. Never touch it again.",
              },
              {
                title: "Safe updates",
                body: "Uses HTML comment markers to update only the badge section. Your README stays intact.",
              },
              {
                title: "SEO backlinks",
                body: "Every badge is a dofollow link from your repo to your GitStack analysis page.",
              },
            ].map((f) => (
              <div key={f.title} className="neo-card p-6">
                <h3 className="font-heading text-lg font-black uppercase mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Visit analysis */}
        {parsed && (
          <section className="neo-card p-6 bg-pastel-yellow text-center">
            <p className="text-sm mb-3">See what the badge links to:</p>
            <a
              href={repoUrl}
              className="neo-btn neo-btn-primary px-6 py-3 font-black text-sm inline-flex items-center gap-2"
            >
              View {parsed.owner}/{parsed.repo} on GitStack <ExternalLink className="w-4 h-4" />
            </a>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
