import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Flame, Loader2, Share2, AlertTriangle, Skull } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

const commonTools = ['Notion', 'Slack', 'Zapier', 'Airtable', 'Typeform', 'Calendly', 'Mailchimp', 'Intercom', 'Stripe', 'Webflow', 'Figma', 'Canva', 'Shopify', 'HubSpot', 'Vercel', 'Supabase', 'Railway', 'Netlify', 'PlanetScale', 'Resend', 'Render', 'MongoDB Atlas', 'Auth0', 'Twilio'];

export default function RoastMyStack() {
  const [selectedTools, setSelectedTools] = useState([]);
  const [customTool, setCustomTool] = useState("");
  const [loading, setLoading] = useState(false);
  const [roast, setRoast] = useState(null);

  const addCustomTool = (e) => {
    e.preventDefault();
    const tool = customTool.trim();
    if (!tool || selectedTools.includes(tool)) return;
    setSelectedTools(prev => [...prev, tool]);
    setCustomTool("");
  };

  const handleShare = () => {
    const text = `My stack just got roasted by GitStack! 🔥\n\nTools: ${selectedTools.join(', ')}\n\nGet your stack roasted: ${window.location.origin}/roast-my-stack`;
    if (navigator.share) {
      navigator.share({ title: 'My Stack Got Roasted!', text, url: `${window.location.origin}/roast-my-stack` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Roast copied to clipboard!');
    }
  };

  const toggleTool = (tool) => {
    setSelectedTools(prev => 
      prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]
    );
  };

  const handleRoast = async () => {
    if (selectedTools.length === 0) return;
    
    setLoading(true);
    setRoast(null);
    try {
      const res = await axios.post(`${API}/ai/roast-my-stack`, { tools: selectedTools });
      setRoast(res.data.roast);
    } catch (e) {
      toast.error("Failed to roast your stack");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Roast My Stack — Brutal Honest Feedback on Your SaaS Tools"
        description="Tell us what tools you're paying for and we'll roast your stack. Find out what's overpriced, redundant, and what a smarter founder would use instead."
        path="/roast-my-stack"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Audit Your SaaS Stack for Cost Savings",
          "description": "Get brutally honest feedback on your paid SaaS tools and discover free open-source alternatives.",
          "totalTime": "PT3M",
          "tool": [{ "@type": "HowToTool", "name": "GitStack Roast My Stack" }],
          "step": [
            {
              "@type": "HowToStep",
              "name": "List your current SaaS tools",
              "text": "Enter the paid tools you use monthly. Include everything from hosting to analytics to email marketing.",
              "url": "https://www.gitstack.pro/roast-my-stack"
            },
            {
              "@type": "HowToStep",
              "name": "Get your stack roasted",
              "text": "GitStack's AI analyzes each tool for cost, redundancy, and open-source alternatives.",
              "url": "https://www.gitstack.pro/roast-my-stack"
            },
            {
              "@type": "HowToStep",
              "name": "Implement the recommendations",
              "text": "Replace overpriced tools with free alternatives and track your monthly savings.",
              "url": "https://www.gitstack.pro/roast-my-stack"
            }
          ]
        }}
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [-2, 2, -2]
              }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-foreground border-4 border-red-600 shadow-[6px_6px_0px_0px_#EF4444] mb-6"
            >
              <Flame className="w-10 h-10 text-red-500" strokeWidth={2} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="roast-title">
              Roast My Stack
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Don't be a tool. Tell us what you're using. We'll tell you why you're wasting money and time.
            </p>
          </div>

          <div className="neo-card p-8 bg-background border-4 border-foreground mb-8 shadow-[8px_8px_0px_0px_hsl(var(--foreground))]">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6 font-black">Choose your weapons:</p>
            <div className="flex flex-wrap gap-3">
              {commonTools.map(tool => (
                <button
                  key={tool}
                  onClick={() => toggleTool(tool)}
                  className={`px-5 py-2 border-2 border-foreground font-black text-sm transition-all flex items-center gap-2 ${
                    selectedTools.includes(tool)
                      ? 'bg-foreground text-background -translate-y-1 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)]'
                      : 'bg-background hover:bg-pastel-yellow hover:text-black'
                  }`}
                  data-testid={`tool-chip-${tool.toLowerCase()}`}
                >
                  {tool}
                  {selectedTools.includes(tool) && <Flame className="w-3 h-3" />}
                </button>
              ))}
            </div>
            
            <form onSubmit={addCustomTool} className="mt-6 flex gap-2">
              <input
                type="text"
                value={customTool}
                onChange={(e) => setCustomTool(e.target.value)}
                placeholder="Add a tool not listed above..."
                className="neo-input flex-1 px-4 py-2 text-sm"
                data-testid="custom-tool-input"
              />
              <button type="submit" className="neo-btn neo-btn-secondary px-4 py-2 text-sm font-bold whitespace-nowrap">
                + Add
              </button>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center justify-between border-t-2 border-foreground/5 pt-4"
            >
              <p className="text-sm font-bold text-muted-foreground">
                Selected: <span className="text-foreground">{selectedTools.length} tools</span>
              </p>
              {selectedTools.length > 0 && (
                <button
                  onClick={() => setSelectedTools([])}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Reset All
                </button>
              )}
            </motion.div>
          </div>

          <button 
            onClick={handleRoast}
            disabled={loading || selectedTools.length === 0}
            className="neo-btn neo-btn-danger px-8 py-5 w-full text-xl font-black uppercase tracking-tighter disabled:opacity-50 mb-12 flex items-center justify-center gap-3 group"
            data-testid="roast-submit"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Skull className="w-7 h-7 transition-transform group-hover:scale-125" /> 
                Roast My Stack (Brutally)
              </>
            )}
          </button>

          {loading && (
            <div className="text-center py-16">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-16 h-16 border-8 border-t-red-600 border-border mx-auto mb-6"
              ></motion.div>
              <h2 className="text-3xl font-black uppercase italic text-red-600">Sharpening the Axe...</h2>
              <p className="text-muted-foreground font-mono mt-2 uppercase tracking-widest text-xs">Finding every single flaw in your workflow</p>
            </div>
          )}

          <AnimatePresence>
            {roast && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="neo-card p-4 md:p-12 bg-foreground text-background border-4 border-red-600 relative overflow-hidden shadow-[12px_12px_0px_0px_rgba(239,68,68,0.3)] mb-20" 
                data-testid="roast-result"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Flame className="w-48 h-48" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8 bg-red-600 inline-flex px-4 py-2 font-black uppercase text-sm italic">
                    <AlertTriangle className="w-5 h-5" /> 
                    Founders Beware: Brutal Feedback Ahead
                  </div>
                  
                  <div className="prose-gitstack prose-invert" dangerouslySetInnerHTML={{ __html: formatContent(roast) }} />
                  
                  <div className="mt-12 pt-8 border-t-2 border-background/20 space-y-4">
                    {/* Primary CTAs */}
                    <div className="flex flex-col md:flex-row gap-4">
                      <button onClick={handleShare} className="neo-btn bg-background text-foreground px-10 py-4 font-black text-lg flex-1 group">
                        <Share2 className="w-6 h-6 mr-3 transition-transform group-hover:rotate-12" /> Share My Roast
                      </button>
                      <button
                        onClick={() => setRoast(null)}
                        className="neo-btn bg-muted text-foreground border-border px-6 font-bold"
                      >
                        Try Again
                      </button>
                    </div>

                    {/* Post-roast loop: rebuild */}
                    <div className="bg-foreground border-2 border-background/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-background uppercase tracking-wide text-sm">Your stack got roasted. Now rebuild it properly.</p>
                        <p className="text-background/70 text-xs mt-1">Stack Generator will replace the weak tools with free, battle-tested alternatives.</p>
                      </div>
                      <Link
                        to={`/stack-generator?idea=${encodeURIComponent(`Replace my tools (${selectedTools.join(', ')}) with better free alternatives`)}`}
                        className="neo-btn bg-primary text-background px-6 py-3 font-black text-sm whitespace-nowrap flex-shrink-0"
                      >
                        Rebuild My Stack →
                      </Link>
                    </div>
                  </div>
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
