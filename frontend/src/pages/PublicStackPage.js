import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Share2, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { GitHubLink } from "../components/ui/GitHubLink";
import { ShareButtons } from "../components/ShareButtons";

export default function PublicStackPage() {
  const { slug } = useParams();
  const [stack, setStack] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchStack = async () => {
      try {
        const res = await axios.get(`${API}/stacks/${slug}`);
        setStack(res.data);
      } catch (e) {
        if (e.response?.status === 404) setNotFound(true);
        else toast.error("Failed to load stack");
      }
      setLoading(false);
    };
    fetchStack();
  }, [slug]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: stack?.idea || "Shared Stack", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="py-24 px-4 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-4xl font-black uppercase mb-4">Stack Not Found</h1>
          <p className="text-muted-foreground mb-8">This stack link may have expired or never existed.</p>
          <Link to="/stack-generator" className="neo-btn neo-btn-primary px-8 py-4 font-black">
            Build Your Own Stack
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const tools = stack?.tools || [];
  const idea = stack?.idea || "Untitled Stack";

  const toolNames = tools.slice(0, 5).map(t => t.name).join(", ");
  const seoDescription = `${idea}: a tech stack with ${tools.length} open-source tools${toolNames ? ` including ${toolNames}` : ""}. Free alternatives for non-technical founders.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": idea,
    "description": seoDescription.slice(0, 160),
    "totalTime": "PT2H",
    "step": tools.map((tool, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": tool.name,
      "text": tool.description || tool.reason || `Add ${tool.name} to your stack`,
      "url": tool.githubUrl,
    })),
  };

  return (
    <div className="min-h-screen">
      <SEO
        title={`${idea} — Tech Stack`}
        description={seoDescription.slice(0, 160)}
        path={`/s/${slug}`}
        jsonLd={jsonLd}
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-black">Shared Stack</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-3">{idea}</h1>
            <p className="text-muted-foreground text-sm">
              {tools.length} tools · Built with GitStack
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {tools.map((tool, idx) => (
              <div
                key={`${tool.name}-${idx}`}
                className="neo-card p-5 bg-background border-2 border-foreground flex items-start gap-4"
              >
                <span className="w-8 h-8 bg-foreground text-background text-xs font-black flex items-center justify-center flex-shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg">{tool.name}</h3>
                    {tool.difficulty && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 border border-foreground text-foreground ${
                        tool.difficulty === "Beginner" ? "bg-pastel-mint" :
                        tool.difficulty === "Intermediate" ? "bg-pastel-yellow" : "bg-pastel-pink"
                      }`}>
                        {tool.difficulty}
                      </span>
                    )}
                    {tool.isFree && (
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-foreground bg-pastel-mint text-black">FREE</span>
                    )}
                  </div>
                  {tool.role && <p className="text-muted-foreground text-sm font-medium">{tool.role}</p>}
                  {tool.reason && <p className="text-muted-foreground text-sm mt-1">{tool.reason}</p>}
                  {tool.githubUrl && (
                    <GitHubLink
                      url={tool.githubUrl}
                      label="View on GitHub"
                      className="text-xs text-primary font-bold mt-2"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="neo-card p-6 bg-muted border-2 border-foreground flex flex-col sm:flex-row gap-4 items-center justify-between mb-12">
            <div>
              <p className="font-black uppercase text-sm">Build a stack for your own idea</p>
              <p className="text-muted-foreground text-xs mt-0.5">Free, no account needed</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={handleCopyLink} className="neo-btn neo-btn-secondary px-4 py-2 font-bold text-sm flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <ShareButtons url={window.location.href} title={idea} className="flex-shrink-0" />
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-4 py-2 font-bold text-sm">
                Build Mine →
              </Link>
            </div>
          </div>

          {/* Viral backlink — appears on every shared stack */}
          <div className="text-center py-6 border-t border-muted">
            <p className="text-xs text-muted-foreground">
              Powered by{" "}
              <Link to="/" className="font-bold text-primary hover:underline">
                GitStack
              </Link>{" "}
              — Discover open-source tools for founders
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
