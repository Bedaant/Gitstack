import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";
import { toast } from "sonner";
import { Star, Clock, Sparkles, Github, Share2, Network, BookOpen, ExternalLink } from "lucide-react";
import { MarketplaceTeaser } from "../components/marketplace/MarketplaceTeaser";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { GitHubLink } from "../components/ui/GitHubLink";
import { Link } from "react-router-dom";

// Repo X-Ray: analysis engine based on CodeFlow (MIT), rebranded via scripts/build-xray.js.
// Served as a static asset from /xray.html — accepts ?repo=owner/repo&run=1
const xrayUrl = (owner, repo) => `/xray.html?repo=${owner}/${repo}&run=1`;

export default function GitHubRepoPage() {
  const { owner, repo } = useParams();
  const location = useLocation();
  const initialTab = new URLSearchParams(location.search).get("tab") === "xray" ? "xray" : "summary";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab); // "summary" | "xray"
  const { user } = useAuth();

  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        const res = await axios.get(`${API}/ai/translate-repo/${owner}/${repo}`);
        setData(res.data);
      } catch (e) {
        setError("Failed to translate repository");
        console.error(e);
      }
      setLoading(false);
    };
    fetchTranslation();
  }, [owner, repo]);

  // Track activity for recommendations (fire and forget)
  useEffect(() => {
    if (!user || !owner || !repo) return;
    const entityId = `${owner}/${repo}`;
    axios.post(`${API}/activity`, { event_type: "repo_viewed", entity_id: entityId }, { withCredentials: true }).catch(() => {});
  }, [user, owner, repo]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="spinner mb-4"></div>
          <p className="font-bold text-lg">Translating to plain English...</p>
          <p className="text-muted-foreground">Reading the README and analyzing</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold mb-4">Repository not found</h1>
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-primary px-6 py-2">
            View on GitHub
          </a>
        </div>
      </div>
    );
  }

  const ogImageUrl = `${API.replace('/api', '')}/og/repo/${owner}/${repo}`;
  const pageUrl = `https://gitstack.pro/r/${owner}/${repo}`;
  
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>{data.name} — Explained by GitStack</title>
        <meta name="description" content={data.one_sentence_summary || `${data.name}: ${data.description?.slice(0, 150)}... Explained in plain English for founders.`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${data.name} — ${data.one_sentence_summary || 'GitHub Repo Explained'}`} />
        <meta property="og:description" content={data.description?.slice(0, 200) || 'Open source tool explained in plain English'} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="GitStack" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${data.name} — Explained by GitStack`} />
        <meta name="twitter:description" content={data.one_sentence_summary || data.description?.slice(0, 150)} />
        <meta name="twitter:image" content={ogImageUrl} />
        
        {/* Canonical */}
        <link rel="canonical" href={pageUrl} />
      </Helmet>
      
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-8 bg-background" data-testid="github-repo-detail">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black mb-2">{data.name}</h1>
                <p className="text-muted-foreground font-mono text-sm mb-4">{data.full_name}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {data.difficulty && (
                    <span className={`text-sm font-bold px-3 py-1 ${
                      data.difficulty === 'Beginner' ? 'badge-beginner' :
                      data.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {data.difficulty}
                    </span>
                  )}
                  {data.setup_time && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" /> {data.setup_time}
                    </span>
                  )}
                  {data.stars > 0 && (
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {data.stars?.toLocaleString()}
                    </span>
                  )}
                  {data.forks > 0 && (
                    <span className="text-sm text-muted-foreground">{data.forks?.toLocaleString()} forks</span>
                  )}
                </div>
              </div>
              <GitHubLink
                url={data.html_url}
                label="View on GitHub"
                className="neo-btn neo-btn-secondary px-4 py-2"
                data-testid="github-link"
              />
            </div>

            {data.description && (
              <p className="text-lg text-muted-foreground mb-6 italic">"{data.description}"</p>
            )}

            {data.topics && data.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {data.topics.map((topic) => (
                  <span key={topic} className="text-xs font-mono px-2 py-1 bg-muted border border-border">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <MarketplaceTeaser
            owner={owner}
            repo={repo}
            fallback={
              <div className="neo-card p-4 mb-6 bg-muted/30">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm">
                    <span className="font-black">Is this your repo?</span>{" "}
                    <span className="text-muted-foreground">Sell a ready-to-deploy version or a setup service on GitStack.</span>
                  </p>
                  <Link to="/sell" className="neo-btn neo-btn-secondary px-3 py-1.5 text-sm font-bold">
                    Become a Seller →
                  </Link>
                </div>
              </div>
            }
          />

          {/* Tab switcher: Plain English summary | Repo X-Ray architecture */}
          <div className="flex gap-2 mb-0 border-b-4 border-foreground" role="tablist" aria-label="Repo views">
            <button
              role="tab"
              aria-selected={activeTab === "summary"}
              onClick={() => setActiveTab("summary")}
              className={`px-5 py-3 font-black uppercase text-sm border-2 border-b-0 border-foreground -mb-[4px] flex items-center gap-2 ${
                activeTab === "summary" ? "bg-pastel-mint text-black" : "bg-background text-foreground hover:bg-muted"
              }`}
              data-testid="tab-summary"
            >
              <BookOpen className="w-4 h-4" /> Plain English
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "xray"}
              onClick={() => setActiveTab("xray")}
              className={`px-5 py-3 font-black uppercase text-sm border-2 border-b-0 border-foreground -mb-[4px] flex items-center gap-2 ${
                activeTab === "xray" ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
              }`}
              data-testid="tab-xray"
            >
              <Network className="w-4 h-4" /> Repo X-Ray
              <span className="text-[9px] font-black bg-foreground text-background px-1.5 py-0.5 leading-none">NEW</span>
            </button>
          </div>

          {activeTab === "summary" && (
            <div className="neo-card p-8 bg-pastel-mint text-black rounded-t-none" data-testid="ai-translation">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" /> Plain English Explanation
              </h2>
              <div
                className="prose-gitstack"
                dangerouslySetInnerHTML={{ __html: formatContent(data.translation) }}
              />
              <div className="mt-6 pt-6 border-t-2 border-black/20">
                <button
                  onClick={() => setActiveTab("xray")}
                  className="neo-btn px-5 py-2.5 font-black inline-flex items-center gap-2 bg-primary text-primary-foreground border-primary"
                >
                  <Network className="w-4 h-4" /> See the Architecture (Repo X-Ray) →
                </button>
              </div>
            </div>
          )}

          {activeTab === "xray" && (
            <div className="neo-card p-0 overflow-hidden rounded-t-none" data-testid="repo-xray-frame">
              <div className="bg-foreground text-background px-5 py-3 flex items-center justify-between border-b-4 border-foreground flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black uppercase">Repo X-Ray</h2>
                  <span className="text-[10px] font-mono opacity-70">dependency map · health score · blast radius</span>
                </div>
                <a
                  href={xrayUrl(owner, repo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold inline-flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Open fullscreen
                </a>
              </div>
              <iframe
                src={xrayUrl(owner, repo)}
                title={`Repo X-Ray: ${owner}/${repo}`}
                className="w-full border-0"
                style={{ height: "80vh", minHeight: "600px" }}
                loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <a 
              href={data.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-btn neo-btn-primary px-6 py-3 flex-1 justify-center"
            >
              <Github className="w-5 h-5 mr-2" /> Start Using This Tool
            </a>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`Check out ${data.name}: ${data.html_url}`);
                toast.success("Link copied!");
              }}
              className="neo-btn neo-btn-secondary px-6 py-3"
              data-testid="share-repo"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </button>
          </div>

          {/* Add README Badge promo */}
          <div className="neo-card p-5 mt-6 bg-pastel-purple flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src="https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=for-the-badge&logo=github"
                alt="Analyzed by GitStack"
              />
              <div>
                <p className="font-black uppercase text-sm">Own this repo?</p>
                <p className="text-xs opacity-80">Add this badge to your README in 30 seconds.</p>
              </div>
            </div>
            <a
              href={`/readme-badge#install`}
              className="neo-btn neo-btn-primary px-5 py-2 font-black text-xs uppercase"
            >
              Get Badge
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

