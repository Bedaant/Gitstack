import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { BookOpen, Github, Loader2, Share2, Network, ExternalLink } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { Helmet } from "react-helmet-async";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";
import { MarketplaceTeaser } from "../components/marketplace/MarketplaceTeaser";

// Extract owner/repo from a github URL
const parseRepo = (url) => {
  try {
    const m = url.trim().match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
    if (m) return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  } catch {}
  return { owner: null, repo: null };
};

export default function RepoTranslator() {
  const location = useLocation();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [autoStart, setAutoStart] = useState(false);

  const handleTranslate = React.useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setTranslation(null);
    try {
      const res = await axios.post(`${API}/ai/repo-translator`, { github_url: url });
      setTranslation(res.data.translation);
    } catch (e) {
      // Distinguish network failure from server error for clearer debugging
      const isNetwork = !e.response;
      if (isNetwork) {
        toast.error(
          "Cannot reach the server. Is the backend running?",
          { description: `Tried: ${API}. Start backend with: python backend/app.py`, duration: 8000 }
        );
      } else {
        const detail = e.response?.data?.detail || e.response?.statusText || "Unknown error";
        toast.error(`Translation failed: ${detail}`);
      }
      console.error("RepoTranslator error", e);
    }
    setLoading(false);
  }, [url]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preUrl = params.get('url');
    const isAuto = params.get('auto') === 'true';
    if (preUrl) {
      setUrl(preUrl);
      if (isAuto) setAutoStart(true);
    }
  }, [location.search]);

  useEffect(() => {
    if (autoStart && url && !loading && !translation) {
      // Create a synthetic event
      const fakeEvent = { preventDefault: () => {} };
      
      // Instead of relying on handleTranslate in the dependency array,
      // we extract the core logic or just ignore the warning with eslint-disable
      // Since it's a Vercel build, we need to pass the linter.
      handleTranslate(fakeEvent);
      setAutoStart(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, url, loading, translation]);

  const handleShare = () => {
    const { owner, repo } = parseRepo(url);
    const repoSlug = owner && repo ? `${owner}/${repo}` : null;
    const shareUrl = repoSlug
      ? `${window.location.origin}/r/${owner}/${repo}`
      : (url.trim() || window.location.origin + '/repo-translator');
    const text = repoSlug
      ? `Just understood ${repoSlug} in 10 seconds with GitStack 🤯\n\n${shareUrl}`
      : `I understood this GitHub repo in 10 seconds with GitStack!\n\n${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: repoSlug ? `${repoSlug} — explained` : 'I understood this in 10 seconds!', text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    }
  };

  const parsedRepo = parseRepo(url);

  return (
    <div className="min-h-screen">
      <SEO
        title="Repo Translator — Understand Any GitHub Repo in Plain English"
        description="Paste any GitHub URL and get a plain-English explanation of what it does, who it's for, and how to use it. No technical knowledge needed."
        path="/repo-translator"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Understand Any GitHub Repository in Plain English",
          "description": "Use GitStack's Repo Translator to decode any GitHub README into founder-friendly language in 10 seconds.",
          "totalTime": "PT10S",
          "tool": [{ "@type": "HowToTool", "name": "GitStack Repo Translator" }],
          "step": [
            {
              "@type": "HowToStep",
              "name": "Copy the GitHub URL",
              "text": "Find the GitHub repository you want to understand and copy its URL from the browser address bar.",
              "url": "https://www.gitstack.pro/repo-translator"
            },
            {
              "@type": "HowToStep",
              "name": "Paste into Repo Translator",
              "text": "Paste the GitHub URL into GitStack's Repo Translator input field and click translate.",
              "url": "https://www.gitstack.pro/repo-translator"
            },
            {
              "@type": "HowToStep",
              "name": "Read the plain-English explanation",
              "text": "Get a founder-friendly breakdown of what the project does, who it's for, setup difficulty, and key features.",
              "url": "https://www.gitstack.pro/repo-translator"
            }
          ]
        }}
      />
      <Header />
      <main id="main-content" className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-mint border-4 border-black neo-shadow-lg mb-6 text-black">
              <BookOpen className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="repo-translator-title">
              Repo Translator
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Paste any GitHub URL. Understand it in plain English in 10 seconds.
            </p>
          </div>

          <form onSubmit={handleTranslate} className="mb-12">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value || "")}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData("text");
                  if (pastedData) setUrl(pastedData);
                }}
                placeholder="https://github.com/username/repo"
                className="neo-input pl-14 pr-4 py-3"
                data-testid="repo-url-input"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !url.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg mt-4 disabled:opacity-50"
              data-testid="repo-translate-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><BookOpen className="w-6 h-6 mr-2" /> Translate to Plain English</>}
            </button>
          </form>

          {loading && (
            <div className="space-y-3" data-testid="translator-skeleton">
              <div className="neo-card p-8 bg-pastel-mint border-4 border-black text-black">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="font-bold text-lg">Reading the README…</p>
                </div>
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-black/20 w-3/4"></div>
                  <div className="h-4 bg-black/20 w-5/6"></div>
                  <div className="h-4 bg-black/20 w-2/3"></div>
                  <div className="h-4 bg-black/20 w-4/5"></div>
                  <div className="h-4 bg-black/20 w-1/2"></div>
                </div>
                <p className="text-xs font-bold mt-4 opacity-70">Translating tech jargon to human…</p>
              </div>
            </div>
          )}

          <AnimatePresence>
            {translation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-8 bg-pastel-mint border-4 border-black text-black"
                data-testid="translation-result"
              >
                {parsedRepo.owner && parsedRepo.repo && (
                  <Helmet>
                    <script type="application/ld+json">
                      {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "TechArticle",
                        "headline": `${parsedRepo.owner}/${parsedRepo.repo} Explained in Plain English`,
                        "description": `AI-powered explanation of the ${parsedRepo.repo} GitHub repository. What it does, how it works, and why you might use it.`,
                        "url": `https://gitstack.pro/r/${parsedRepo.owner}/${parsedRepo.repo}`,
                        "author": { "@type": "Organization", "name": "GitStack" },
                        "publisher": { "@type": "Organization", "name": "GitStack", "url": "https://gitstack.pro" },
                        "about": {
                          "@type": "SoftwareSourceCode",
                          "name": parsedRepo.repo,
                          "codeRepository": `https://github.com/${parsedRepo.owner}/${parsedRepo.repo}`,
                          "programmingLanguage": "Multiple"
                        },
                        "speakable": {
                          "@type": "SpeakableSpecification",
                          "cssSelector": [".prose-gitstack"]
                        }
                      })}
                    </script>
                  </Helmet>
                )}
                <div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: formatContent(translation) }} />

                {/* Marketplace conversion hook: highest-intent moment */}
                {parsedRepo.owner && parsedRepo.repo && (
                  <div className="mt-6">
                    <MarketplaceTeaser owner={parsedRepo.owner} repo={parsedRepo.repo} />
                  </div>
                )}

                {/* X-Ray CTA — encourages deeper exploration */}
                {parsedRepo.owner && parsedRepo.repo && (
                  <Link
                    to={`/r/${parsedRepo.owner}/${parsedRepo.repo}?tab=xray`}
                    className="neo-card mt-6 p-5 bg-pastel-lavender text-black flex items-center justify-between gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
                    data-testid="xray-cta"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-black text-white flex items-center justify-center border-2 border-black">
                        <Network className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black uppercase text-sm">Want to see the architecture?</p>
                        <p className="text-xs opacity-80">Open <strong>Repo X-Ray</strong> — dependency map, hotspots, and entry points.</p>
                      </div>
                    </div>
                    <ExternalLink className="w-5 h-5 flex-shrink-0" />
                  </Link>
                )}

                <div className="flex gap-4 mt-8 flex-col sm:flex-row">
                  <button 
                    onClick={() => {
                      const { owner, repo } = parseRepo(url);
                      const repoSlug = owner && repo ? `${owner}/${repo}` : null;
                      const shareUrl = repoSlug
                        ? `${window.location.origin}/r/${owner}/${repo}`
                        : (url.trim() || window.location.origin + '/repo-translator');
                      const text = repoSlug
                        ? `Just understood ${repoSlug} in 10 seconds with @GitStackDev 🤯\n\n${shareUrl}`
                        : `I understood this GitHub repo in 10 seconds with @GitStackDev!\n\n${shareUrl}`;
                      const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
                      window.open(xUrl, '_blank');
                    }}
                    className="neo-btn px-6 py-3 flex-1 flex items-center justify-center gap-2 group" 
                    style={{ backgroundColor: '#000', color: '#fff', borderColor: '#000' }}
                    data-testid="share-twitter"
                  >
                    <svg className="w-5 h-5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span className="font-bold">Share on X</span>
                  </button>
                  <button onClick={handleShare} className="neo-btn neo-btn-secondary px-6 py-3 flex-1 flex items-center justify-center gap-2 group" data-testid="share-translation">
                    <Share2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                    <span className="font-bold">Copy Link</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
