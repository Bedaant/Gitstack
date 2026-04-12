import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Skull, Loader2, Share2, TrendingDown, DollarSign, ExternalLink, ArrowRight } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";

export default function DeadToolDetector() {
  const [paidTools, setPaidTools] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!paidTools.trim()) return;
    
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/ai/dead-tool-detector`, { paid_tools: paidTools });
      const alts = res.data.alternatives || [];
      setResults(alts);
      
      const savings = alts.reduce((acc, item) => {
        const num = parseInt(item.annualSavings?.replace(/[^0-9]/g, '') || 0);
        return acc + num;
      }, 0);
      setTotalSavings(savings);
    } catch (e) {
      toast.error("Failed to find alternatives");
      console.error(e);
    }
    setLoading(false);
  };

  const handleShare = () => {
    const text = `I found ${results.length} free alternatives and can save $${totalSavings}/year!\n\n${results.map(r => `${r.paidTool} -> ${r.freeAlternative} (Save ${r.annualSavings})`).join('\n')}\n\nTry GitStack: ${window.location.origin}/dead-tool-detector`;
    
    if (navigator.share) {
      navigator.share({ title: `I'm saving $${totalSavings}/year with free tools!`, text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Results copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Dead Tool Detector — Stop Overpaying for SaaS"
        description="Paste your paid SaaS subscriptions and discover free open-source alternatives. Founders save an average of $1,700/year. Free, instant, no signup."
        path="/dead-tool-detector"
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-pastel-pink border-4 border-black neo-shadow-lg mb-6"
            >
              <Skull className="w-10 h-10" strokeWidth={2} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="dead-tool-title">
              Dead Tool Detector
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Stop overpaying. Paste your SaaS subscriptions and we'll find free open-source equivalents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-12">
            <textarea
              value={paidTools}
              onChange={(e) => setPaidTools(e.target.value)}
              placeholder="e.g., Typeform, Calendly, Zapier, Mailchimp..."
              className="neo-input h-32 resize-none mb-4 focus:ring-4 ring-pastel-pink/30"
              data-testid="dead-tool-input"
            />
            <button 
              type="submit" 
              disabled={loading || !paidTools.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-xl font-black flex items-center justify-center gap-2 group disabled:opacity-50"
              data-testid="dead-tool-submit"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Skull className="w-6 h-6 transition-transform group-hover:rotate-12" /> 
                  Find My Free Stack
                </>
              )}
            </button>
          </form>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-6 w-12 h-12 border-4 border-t-black" style={{ borderTopColor: '#000' }}></div>
              <p className="font-black text-2xl uppercase italic">Analyzing $ Burn Rate...</p>
              <p className="text-zinc-500 font-mono">Scanning GitHub for better alternatives</p>
            </div>
          )}

          <AnimatePresence>
            {results && results.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="neo-card p-8 bg-pastel-mint text-center border-4 border-black border-dashed relative overflow-hidden">
                  <DollarSign className="absolute -left-4 -top-4 w-24 h-24 text-black/5 -rotate-12" />
                  <p className="text-sm font-mono uppercase tracking-widest mb-1 font-bold">Estimated Annual Savings</p>
                  <p className="text-7xl font-black italic drop-shadow-md text-black">
                    ${totalSavings.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold uppercase mt-2 text-zinc-600 tracking-wider">Per Year · Forever</p>
                </div>

                <div className="neo-card overflow-hidden border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-black text-white text-[10px] font-mono uppercase tracking-widest font-black">
                    <div>Paid Tool</div>
                    <div>Price</div>
                    <div>Free Alternative</div>
                    <div className="text-green-400">Save / Migrate</div>
                  </div>
                  {results.map((item, idx) => (
                    <motion.div
                      key={`${item.paidTool}-${idx}`}
                      initial={{ background: "white" }}
                      whileHover={{ background: "#F0FDFA" }}
                      className="grid grid-cols-4 gap-4 p-5 border-t-2 border-black items-start transition-colors"
                      data-testid={`result-row-${item.paidTool}`}
                    >
                      <div className="font-bold text-lg">{item.paidTool}</div>
                      <div className="text-zinc-500 font-mono text-xs pt-1">{item.monthlyCost}</div>
                      <div>
                        {item.githubUrl ? (
                          <a href={item.githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-black underline decoration-4 underline-offset-4 inline-flex items-center gap-1 hover:opacity-75">
                            {item.freeAlternative} <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-primary font-black underline decoration-4 underline-offset-4">{item.freeAlternative}</span>
                        )}
                        {item.alternativeDescription && (
                          <p className="text-xs text-zinc-500 mt-1 font-medium leading-snug">{item.alternativeDescription}</p>
                        )}
                      </div>
                      <div>
                        <div className="text-green-600 font-black flex items-center gap-1">
                          <TrendingDown className="w-4 h-4" /> {item.annualSavings}
                        </div>
                        {item.githubUrl && (
                          <Link
                            to={`/repo-translator?url=${encodeURIComponent(item.githubUrl)}`}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 mt-1"
                          >
                            How to migrate <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button 
                  onClick={handleShare}
                  className="neo-btn neo-btn-secondary px-6 py-5 w-full font-black text-xl hover:bg-pastel-yellow transition-colors" 
                  data-testid="share-results"
                >
                  <Share2 className="w-6 h-6 mr-2" /> Share My Savings Score
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
