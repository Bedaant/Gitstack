import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Copy, Share2, ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";

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
          <p className="text-zinc-500 mb-8">This stack link may have expired or never existed.</p>
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

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2 font-black">Shared Stack</p>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-3">{idea}</h1>
            <p className="text-zinc-500 text-sm">
              {tools.length} tools · Built with GitStack
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {tools.map((tool, idx) => (
              <div
                key={`${tool.name}-${idx}`}
                className="neo-card p-5 bg-white border-2 border-black flex items-start gap-4"
              >
                <span className="w-8 h-8 bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg">{tool.name}</h3>
                    {tool.difficulty && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 border border-black ${
                        tool.difficulty === "Beginner" ? "bg-green-100" :
                        tool.difficulty === "Intermediate" ? "bg-yellow-100" : "bg-red-100"
                      }`}>
                        {tool.difficulty}
                      </span>
                    )}
                    {tool.isFree && (
                      <span className="text-[10px] font-bold px-2 py-0.5 border border-black bg-pastel-mint">FREE</span>
                    )}
                  </div>
                  {tool.role && <p className="text-zinc-500 text-sm font-medium">{tool.role}</p>}
                  {tool.reason && <p className="text-zinc-600 text-sm mt-1">{tool.reason}</p>}
                  {tool.githubUrl && (
                    <a
                      href={tool.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-2 hover:underline"
                    >
                      View on GitHub <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="neo-card p-6 bg-zinc-50 border-2 border-black flex flex-col sm:flex-row gap-4 items-center justify-between mb-12">
            <div>
              <p className="font-black uppercase text-sm">Build a stack for your own idea</p>
              <p className="text-zinc-500 text-xs mt-0.5">Free, no account needed</p>
            </div>
            <div className="flex gap-3 flex-shrink-0">
              <button onClick={handleCopyLink} className="neo-btn neo-btn-secondary px-4 py-2 font-bold text-sm flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copy Link
              </button>
              <button onClick={handleShare} className="neo-btn neo-btn-secondary px-4 py-2 font-bold text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-4 py-2 font-bold text-sm">
                Build Mine →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
