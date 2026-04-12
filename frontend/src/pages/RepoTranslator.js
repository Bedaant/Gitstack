import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { BookOpen, Github, Loader2, Share2 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

export default function RepoTranslator() {
  const location = useLocation();
  const [url, setUrl] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preUrl = params.get('url');
    if (preUrl) setUrl(preUrl);
  }, [location.search]);
  const [loading, setLoading] = useState(false);
  const [translation, setTranslation] = useState(null);

  const handleShare = () => {
    const shareUrl = url.trim() || window.location.origin + '/repo-translator';
    const text = `I understood this GitHub repo in 10 seconds with GitStack!\n\n${shareUrl}\n\nTry it: ${window.location.origin}/repo-translator`;
    if (navigator.share) {
      navigator.share({ title: 'I understood this in 10 seconds!', text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleTranslate = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    setLoading(true);
    setTranslation(null);
    try {
      const res = await axios.post(`${API}/ai/repo-translator`, { github_url: url });
      setTranslation(res.data.translation);
    } catch (e) {
      toast.error("Failed to translate repo");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Repo Translator — Understand Any GitHub Repo in Plain English"
        description="Paste any GitHub URL and get a plain-English explanation of what it does, who it's for, and how to use it. No technical knowledge needed."
        path="/repo-translator"
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-mint border-4 border-black neo-shadow-lg mb-6">
              <BookOpen className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="repo-translator-title">
              Repo Translator
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Paste any GitHub URL. Understand it in plain English in 10 seconds.
            </p>
          </div>

          <form onSubmit={handleTranslate} className="mb-12">
            <div className="relative">
              <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value || "")}
                onPaste={(e) => {
                  const pastedData = e.clipboardData.getData("text");
                  if (pastedData) setUrl(pastedData);
                }}
                placeholder="https://github.com/username/repo"
                className="neo-input pl-14"
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
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <p className="font-bold text-lg">Reading the README...</p>
              <p className="text-zinc-500">Translating tech jargon to human</p>
            </div>
          )}

          <AnimatePresence>
            {translation && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-8 bg-pastel-mint border-4 border-black" 
                data-testid="translation-result"
              >
                <div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: formatContent(translation) }} />
                <button onClick={handleShare} className="neo-btn neo-btn-secondary px-6 py-3 w-full mt-8 flex items-center justify-center gap-2 group" data-testid="share-translation">
                  <Share2 className="w-5 h-5 transition-transform group-hover:rotate-12" />
                  <span className="font-bold">"I understood this in 10 seconds" — Share it</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
