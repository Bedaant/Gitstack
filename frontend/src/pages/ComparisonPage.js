import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Scale, Loader2, ArrowRight, Share2, SwapH, Swords } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

const PRESETS = [
  { t1: "Supabase", t2: "Appwrite" },
  { t1: "n8n", t2: "Zapier" },
  { t1: "Plane", t2: "Jira" },
  { t1: "Ghost", t2: "Substack" },
  { t1: "PostHog", t2: "Mixpanel" },
];

export default function ComparisonPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [t1, setT1] = useState(searchParams.get("t1") || "");
  const [t2, setT2] = useState(searchParams.get("t2") || "");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    const p1 = searchParams.get("t1");
    const p2 = searchParams.get("t2");
    if (p1 && p2) {
      setT1(p1);
      setT2(p2);
      // auto-trigger compare from URL params
      (async () => {
        setLoading(true);
        setComparison(null);
        try {
          const res = await axios.post(`${API}/ai/compare`, { tool1: p1, tool2: p2 });
          setComparison(res.data.comparison);
        } catch {
          toast.error("Comparison failed. Try again.");
        }
        setLoading(false);
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompare = async (tool1 = t1, tool2 = t2) => {
    if (!tool1.trim() || !tool2.trim()) return;
    
    setLoading(true);
    setComparison(null);
    setSearchParams({ t1: tool1, t2: tool2 });
    
    try {
      const res = await axios.post(`${API}/ai/compare`, { 
        tool1: tool1.trim(), 
        tool2: tool2.trim() 
      });
      setComparison(res.data.comparison);
    } catch (e) {
      toast.error("Failed to generate comparison");
      console.error(e);
    }
    setLoading(false);
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const text = `${t1} vs ${t2} — I compared them on GitStack!\n\n${shareUrl}`;
    if (navigator.share) {
      navigator.share({ title: `${t1} vs ${t2} Battle`, text, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Battle URL copied!');
    }
  };

  const handleReset = () => {
    setT1("");
    setT2("");
    setComparison(null);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ rotate: -5 }}
              animate={{ rotate: 5 }}
              transition={{ repeat: Infinity, duration: 4, repeatType: "reverse", ease: "easeInOut" }}
              className="inline-flex items-center justify-center w-20 h-20 bg-pastel-lavender border-4 border-black neo-shadow-lg mb-6"
            >
              <Scale className="w-10 h-10" strokeWidth={2} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="compare-title">
              Tool Comparison
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto font-medium">
              Choose two tools. Get a brutal, founder-focused breakdown of price, setup, and vibes.
            </p>
          </div>

          <div className="neo-card p-4 md:p-10 bg-white mb-12 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="grid md:grid-cols-2 gap-8 items-center relative">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase font-black text-zinc-400 tracking-widest">Contender A</label>
                <input
                  type="text"
                  value={t1}
                  onChange={(e) => setT1(e.target.value)}
                  placeholder="e.g. Supabase"
                  className="neo-input text-2xl font-black focus:bg-pastel-lavender/30 transition-colors"
                  data-testid="tool1-input"
                />
              </div>
              
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex z-10">
                <motion.div 
                  whileHover={{ rotate: 360, scale: 1.2 }}
                  className="bg-black text-white w-14 h-14 rounded-none border-4 border-white flex items-center justify-center font-black rotate-12 shadow-xl cursor-help group"
                >
                  <Swords className="w-6 h-6 group-hover:hidden" />
                  <span className="hidden group-hover:block text-xs uppercase">VS</span>
                </motion.div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase font-black text-zinc-400 tracking-widest">Contender B</label>
                <input
                  type="text"
                  value={t2}
                  onChange={(e) => setT2(e.target.value)}
                  placeholder="e.g. Appwrite"
                  className="neo-input text-2xl font-black focus:bg-pastel-pink/30 transition-colors"
                  data-testid="tool2-input"
                />
              </div>
            </div>
            
            <div className="flex gap-4 mt-10">
              <button 
                onClick={() => handleCompare()}
                disabled={loading || !t1.trim() || !t2.trim()}
                className="neo-btn neo-btn-primary flex-1 py-5 text-xl font-black uppercase tracking-tight disabled:opacity-50 group"
                data-testid="compare-submit"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : (
                  <span className="flex items-center justify-center gap-2">
                    Start Battle <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
                  </span>
                )}
              </button>
              {comparison && (
                <button 
                  onClick={handleReset}
                  className="neo-btn neo-btn-secondary px-8 font-black uppercase text-xs tracking-widest"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {!comparison && !loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-12"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-4 font-black">Community Battles:</p>
              <div className="flex flex-wrap gap-3">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleCompare(p.t1, p.t2)}
                    className="px-6 py-3 border-4 border-black font-black text-sm hover:bg-black hover:text-white hover:-translate-y-1 transition-all bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
                  >
                    {p.t1} <span className="text-[10px] opacity-40 mx-1">×</span> {p.t2}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {loading && (
            <div className="text-center py-24">
              <div className="spinner mx-auto mb-8 w-16 h-16 border-8 border-t-black" style={{ borderTopColor: '#000', borderRadius: 0 }}></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Analyzing Market Cap & GFM...</h2>
              <p className="text-zinc-500 mt-2 font-mono text-sm uppercase tracking-widest">Querying global intelligence on setup times</p>
            </div>
          )}

          <AnimatePresence>
            {comparison && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="neo-card p-6 md:p-12 bg-pastel-lavender border-4 border-black mb-20 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]" 
                data-testid="comparison-result"
              >
                <div className="flex justify-between items-start mb-10 pb-6 border-b-4 border-black/10">
                  <div className="flex items-center gap-4">
                    <div className="bg-black text-white p-3 font-black uppercase text-xs">Battle Report</div>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{t1} vs {t2}</h2>
                  </div>
                  <Swords className="w-8 h-8 opacity-20" />
                </div>

                <div className="prose-gitstack max-w-none" dangerouslySetInnerHTML={{ __html: formatContent(comparison) }} />
                
                <div className="mt-12 pt-8 border-t-4 border-black/10 flex flex-wrap gap-4">
                  <button onClick={handleShare} className="neo-btn neo-btn-primary px-10 py-4 font-black text-lg flex items-center gap-3 active:scale-95 transition-transform">
                    <Share2 className="w-6 h-6" /> Share Analysis
                  </button>
                  <button className="neo-btn neo-btn-secondary px-8 py-4 font-bold border-black flex items-center gap-2" onClick={() => window.print()}>
                    Export PDF
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
