import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Skull, Loader2, Share2, TrendingDown, DollarSign, ExternalLink, ArrowRight } from "lucide-react";
import { MarketplaceTeaser } from "../components/marketplace/MarketplaceTeaser";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { GitHubLink } from "../components/ui/GitHubLink";

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
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop overpaying. Paste your SaaS subscriptions and we'll find free open-source equivalents.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-12">
            <textarea
              value={paidTools}
              onChange={(e) => setPaidTools(e.target.value)}
              placeholder="e.g., Typeform, Calendly, Zapier, Mailchimp..."
              className="neo-input p-4 h-32 resize-none mb-4 focus:ring-4 ring-pastel-mint/30"
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
            <div className="space-y-4" data-testid="detector-skeleton">
              <div className="text-center py-6">
                <div className="inline-flex items-center gap-3 mb-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="font-black text-xl md:text-2xl uppercase italic">Analyzing $ Burn Rate...</p>
                </div>
                <p className="text-muted-foreground font-mono text-sm">Scanning GitHub for better alternatives</p>
              </div>
              {/* Skeleton preview cards */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="neo-card p-5 animate-pulse">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 w-40 bg-muted"></div>
                    <div className="h-6 w-24 bg-pastel-mint/50 border-2 border-black"></div>
                  </div>
                  <div className="h-3 bg-muted w-full mb-2"></div>
                  <div className="h-3 bg-muted w-3/4"></div>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {results && results.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="neo-card p-8 bg-pastel-mint text-center border-4 border-black border-dashed relative overflow-hidden text-black">
                  <DollarSign className="absolute -left-4 -top-4 w-24 h-24 text-foreground/5 -rotate-12" />
                  <p className="text-sm font-mono uppercase tracking-widest mb-1 font-bold">Estimated Annual Savings</p>
                  <p className="text-7xl font-black italic drop-shadow-md">
                    ${totalSavings.toLocaleString()}
                  </p>
                  <p className="text-xs font-bold uppercase mt-2 text-foreground/70 tracking-wider">Per Year · Forever</p>
                </div>

                <div className="neo-card bg-background overflow-hidden border-4 border-foreground shadow-[8px_8px_0px_0px_hsl(var(--foreground))]">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-foreground text-background text-[10px] font-mono uppercase tracking-widest font-black">
                    <div>Paid Tool</div>
                    <div>Price</div>
                    <div>Free Alternative</div>
                    <div className="text-background/70">Save / Migrate</div>
                  </div>
                  {results.map((item, idx) => (
                    <motion.div
                      key={`${item.paidTool}-${idx}`}
                      initial={{ background: "hsl(var(--background))" }}
                      whileHover={{ background: "var(--pastel-mint)" }}
                      className="grid grid-cols-4 gap-4 p-5 border-t-2 border-foreground items-start transition-colors"
                      data-testid={`result-row-${item.paidTool}`}
                    >
                      <div className="font-bold text-lg">{item.paidTool}</div>
                      <div className="text-muted-foreground font-mono text-xs pt-1">{item.monthlyCost}</div>
                      <div>
                        {item.githubUrl ? (
                          <GitHubLink url={item.githubUrl} label={item.freeAlternative} className="text-primary font-black" />
                        ) : (
                          <span className="text-primary font-black underline decoration-4 underline-offset-4">{item.freeAlternative}</span>
                        )}
                        {item.alternativeDescription && (
                          <p className="text-xs text-muted-foreground mt-1 font-medium leading-snug">{item.alternativeDescription}</p>
                        )}
                        {item.githubUrl && (() => {
                          const m = item.githubUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
                          return m ? (
                            <div className="mt-2">
                              <MarketplaceTeaser owner={m[1]} repo={m[2]} variant="inline" />
                            </div>
                          ) : null;
                        })()}
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
                  className="neo-btn neo-btn-secondary px-6 py-5 w-full font-black text-xl hover:bg-pastel-yellow hover:text-black transition-colors" 
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
