import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Network, Github, Loader2, Zap, Shield, GitBranch, Activity, Package, CheckCircle2 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";

// Parse owner/repo from various GitHub URL formats
const parse = (input) => {
  const t = (input || "").trim();
  if (!t) return null;
  const m1 = t.match(/github\.com\/([^\/\s?#]+)\/([^\/\s?#]+)/i);
  if (m1) return { owner: m1[1], repo: m1[2].replace(/\.git$/, "") };
  const m2 = t.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (m2) return { owner: m2[1], repo: m2[2] };
  return null;
};

const EXAMPLES = [
  { label: "vercel/next.js", url: "vercel/next.js" },
  { label: "n8n-io/n8n", url: "n8n-io/n8n" },
  { label: "calcom/cal.com", url: "calcom/cal.com" },
  { label: "appwrite/appwrite", url: "appwrite/appwrite" },
];

const FEATURES = [
  { icon: GitBranch, title: "Dependency Graph", desc: "Interactive map of how every file connects. Click to trace, drag to explore." },
  { icon: Zap, title: "Blast Radius", desc: "Select any file → see exactly what breaks if you change it." },
  { icon: Shield, title: "Security Scanner", desc: "Auto-detect hardcoded secrets, SQL injection, dangerous eval() usage, debug statements." },
  { icon: Activity, title: "Health Score", desc: "A-F grade based on dead code, circular deps, coupling, and security." },
  { icon: Package, title: "Pattern Detection", desc: "Spot singletons, factories, god objects, and anti-patterns automatically." },
  { icon: CheckCircle2, title: "Privacy First", desc: "Runs entirely in your browser. Your code never touches our servers." },
];

export default function RepoXrayPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parse(input);
    if (!parsed) return;
    setLoading(true);
    // Route into the X-Ray viewer directly
    window.location.href = `/xray.html?repo=${parsed.owner}/${parsed.repo}&run=1`;
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Repo X-Ray — Visualize Any GitHub Repo's Architecture"
        description="X-ray any GitHub repo in seconds. Dependency graph, blast radius, security scanner, health score. Free on GitStack, runs in your browser."
        path="/repo-xray"
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary border-4 border-black neo-shadow-lg mb-6 text-primary-foreground">
              <Network className="w-10 h-10" strokeWidth={2} />
            </div>
            <div className="inline-block bg-foreground text-background px-3 py-1 text-xs font-black uppercase mb-4">
              ✨ NEW — Now on GitStack
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-4" data-testid="xray-title">
              Repo X-Ray
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Paste any GitHub URL. See how every file connects, what breaks when you change things, and how healthy the codebase is — in seconds.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="github.com/owner/repo or owner/repo"
                className="neo-input pl-14 pr-4 py-4 text-lg"
                data-testid="xray-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !parse(input)}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg mt-4 disabled:opacity-50"
              data-testid="xray-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <><Network className="w-6 h-6 inline mr-2" /> X-Ray This Repo</>}
            </button>
          </form>

          <div className="flex flex-col items-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Try these popular repos:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((ex) => (
                <a
                  key={ex.url}
                  href={`/xray.html?repo=${ex.url}&run=1`}
                  className="px-4 py-2 border-2 border-black font-mono text-sm font-semibold neo-shadow bg-background text-foreground hover:bg-pastel-yellow hover:text-black transition-colors flex items-center gap-2"
                  data-testid={`xray-chip-${ex.label}`}
                >
                  <Github className="w-4 h-4" /> {ex.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-black uppercase mb-6 text-center">What you'll see</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="neo-card p-5">
                  <Icon className="w-6 h-6 mb-2 text-primary" />
                  <h3 className="font-black uppercase tracking-tight mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="neo-card p-6 bg-pastel-yellow/30 text-center">
            <p className="text-sm font-semibold">
              <span className="font-black">Pair it with the Repo Translator.</span>{" "}
              <button
                onClick={() => navigate("/repo-translator")}
                className="underline font-black text-primary hover:no-underline"
              >
                Translate the repo to plain English first →
              </button>
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Analysis engine based on{" "}
            <a
              href="https://github.com/braedonsaunders/codeflow"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              CodeFlow (MIT)
            </a>
            . Rebranded and integrated into GitStack.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
