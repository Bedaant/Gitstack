import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Skull, Loader2, Share2 } from "lucide-react";
import { Header } from "../components/Header";
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
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-pink border-4 border-black neo-shadow-lg mb-6">
              <Skull className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="dead-tool-title">
              Dead Tool Detector
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Paste the SaaS tools you currently pay for. We'll find free open-source alternatives.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-12">
            <textarea
              value={paidTools}
              onChange={(e) => setPaidTools(e.target.value)}
              placeholder="e.g., Typeform, Calendly, Hotjar, Zapier, Mailchimp..."
              className="neo-input h-32 resize-none mb-4"
              data-testid="dead-tool-input"
            />
            <button 
              type="submit" 
              disabled={loading || !paidTools.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg disabled:opacity-50"
              data-testid="dead-tool-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Skull className="w-6 h-6 mr-2" /> Find Free Alternatives</>}
            </button>
          </form>

          {results && results.length > 0 && (
            <div className="space-y-6">
              <div className="neo-card p-6 bg-pastel-mint text-center">
                <p className="text-sm font-mono uppercase tracking-widest mb-1">Total Annual Savings</p>
                <p className="text-5xl font-black">${totalSavings.toLocaleString()}/yr</p>
              </div>

              <div className="neo-card overflow-hidden">
                <div className="grid grid-cols-4 gap-4 p-4 bg-black text-white text-xs font-mono uppercase tracking-wider">
                  <div>You Pay For</div>
                  <div>Monthly Cost</div>
                  <div>Free Alternative</div>
                  <div className="text-green-400">You Save/Year</div>
                </div>
                {results.map((item) => (
                  <div key={`${item.paidTool}-${item.freeAlternative}`} className="grid grid-cols-4 gap-4 p-4 border-t-2 border-black items-center" data-testid={`result-row-${item.paidTool}`}>
                    <div className="font-bold">{item.paidTool}</div>
                    <div className="text-zinc-500">{item.monthlyCost}</div>
                    <div className="text-primary font-semibold">{item.freeAlternative}</div>
                    <div className="text-green-600 font-bold">{item.annualSavings}</div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleShare}
                className="neo-btn neo-btn-secondary px-6 py-3 w-full" 
                data-testid="share-results"
              >
                <Share2 className="w-5 h-5 mr-2" /> Share "I'm saving ${totalSavings}/yr"
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
