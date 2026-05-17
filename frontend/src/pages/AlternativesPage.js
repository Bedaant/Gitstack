import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Loader2, DollarSign, Star, ExternalLink, ShoppingBag } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { API } from "../utils/api";

export default function AlternativesPage() {
  const { tool } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios.get(`${API}/alternatives/${tool}`)
      .then(res => setData(res.data))
      .catch(() => setData({ paid_tool: tool, alternatives: [], github_repos: [], complete_solutions: [] }))
      .finally(() => setLoading(false));
    // Fire activity event (ignores if not authed)
    axios.post(`${API}/activity`, {
      event_type: "topic_visited",
      entity_id: `alternatives:${tool}`,
    }, { withCredentials: true }).catch(() => {});
  }, [tool]);

  const paidName = data?.paid_tool || tool?.replace(/-/g, " ");
  const title = `${paidName} Alternatives — Free Open-Source Options`;
  const description = `Find the best free, open-source alternatives to ${paidName}. Curated GitHub repos that replace ${paidName} — compare features, stars, and pricing.`;

  return (
    <div className="min-h-screen">
      <SEO
        title={title}
        description={description}
        path={`/alternatives/${tool}`}
      />
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <Breadcrumbs items={[
          { label: "Alternatives", href: "/tools" },
          { label: paidName || "…" },
        ]} />
        <div className="mb-10">
          <div className="inline-block bg-foreground text-background px-3 py-1 text-xs font-black uppercase mb-3">
            Open-Source Alternatives
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-4">
            {paidName} <span className="text-primary">Alternatives</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Tired of paying for {paidName}? Here are the best free, open-source tools that do the same job — hand-picked and explained in plain English.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {!loading && data && data.alternatives.length === 0 && data.github_repos.length === 0 && (
          <div className="neo-card p-10 text-center">
            <h2 className="text-2xl font-black uppercase mb-2">No alternatives yet</h2>
            <p className="text-muted-foreground mb-4">We haven't curated alternatives for {paidName} yet.</p>
            <Link to="/tools" className="neo-btn neo-btn-primary px-6 py-3 font-black inline-block">
              Browse All Tools
            </Link>
          </div>
        )}

        {!loading && data && data.alternatives.length > 0 && (
          <>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-foreground pb-2">
              Curated Alternatives ({data.alternatives.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {data.alternatives.map((t) => (
                <AltCard key={t.tool_id} tool={t} />
              ))}
            </div>
          </>
        )}

        {!loading && data && data.github_repos.length > 0 && (
          <>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-foreground pb-2">
              Trending from GitHub
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-12">
              {data.github_repos.map((r) => (
                <GhCard key={r.repo_id || r.full_name} repo={r} />
              ))}
            </div>
          </>
        )}

        {/* Complete Solutions — Phase 5 enrichment */}
        {!loading && data && data.complete_solutions && data.complete_solutions.length > 0 && (
          <>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-primary pb-2">
              🚀 Complete Solutions <span className="text-primary">(Ready to Deploy)</span>
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              These repos replace {paidName} entirely — no assembly required.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {data.complete_solutions.map((r) => (
                <Link
                  key={r.full_name}
                  to={`/r/${r.full_name}`}
                  className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all block"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-black">{r.name || r.full_name}</h3>
                    <span className="text-xs font-bold bg-foreground text-background px-2 py-1 inline-flex items-center gap-1">
                      <Star className="w-3 h-3" /> {typeof r.stars === "number" ? r.stars.toLocaleString() : r.stars}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {r.has_docker && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">🐳 Docker</span>
                    )}
                    {r.has_ui && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded">🖥 UI</span>
                    )}
                    {r.has_api && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-800 rounded">⚡ API</span>
                    )}
                    {r.language && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-muted rounded">{r.language}</span>
                    )}
                  </div>
                  {r.use_cases && r.use_cases.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.use_cases.slice(0, 3).map((uc, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">{uc}</span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="neo-card p-6 bg-pastel-yellow/30 mt-8">
          <h3 className="font-black uppercase text-lg mb-2">Want it deployed for you?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Skip the setup. Buy a ready-to-deploy version of these tools on the GitStack Marketplace — live in 15 minutes.
          </p>
          <Link to="/marketplace" className="neo-btn neo-btn-primary px-6 py-3 font-black inline-flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Browse Marketplace
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const AltCard = ({ tool }) => (
  <Link
    to={`/tools/${tool.tool_id}`}
    className="neo-card p-5 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all block"
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="text-xl font-black">{tool.name}</h3>
      {tool.stars && (
        <span className="text-xs font-bold bg-foreground text-background px-2 py-1 inline-flex items-center gap-1">
          <Star className="w-3 h-3" /> {tool.stars}
        </span>
      )}
    </div>
    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{tool.description}</p>
    <div className="flex items-center justify-between text-xs">
      <span className="font-bold text-primary">{tool.category}</span>
      {tool.monthly_cost && (
        <span className="font-bold text-green-700 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Saves {tool.monthly_cost}
        </span>
      )}
    </div>
  </Link>
);

const GhCard = ({ repo }) => (
  <a
    href={repo.html_url || `https://github.com/${repo.full_name}`}
    target="_blank" rel="noopener noreferrer"
    className="neo-card p-4 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all block"
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="text-sm font-black line-clamp-1">{repo.full_name || repo.name}</h3>
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
    </div>
    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{repo.description}</p>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {repo.stars && <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {repo.stars}</span>}
      {repo.language && <span className="font-bold">{repo.language}</span>}
    </div>
  </a>
);
