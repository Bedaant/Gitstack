import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Flame, Loader2 } from "lucide-react";
import { Header } from "../components/Header";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

const commonTools = ['Notion', 'Slack', 'Zapier', 'Airtable', 'Typeform', 'Calendly', 'Mailchimp', 'Intercom', 'Stripe', 'Webflow', 'Figma', 'Canva'];

export default function RoastMyStack() {
  const [selectedTools, setSelectedTools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roast, setRoast] = useState(null);

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
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black border-4 border-red-500 shadow-[6px_6px_0px_0px_#EF4444] mb-6">
              <Flame className="w-10 h-10 text-red-500" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="roast-title">
              Roast My Stack
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Select the tools you're using. Get brutally honest feedback.
            </p>
          </div>

          <div className="mb-8">
            <p className="font-mono text-sm uppercase tracking-wider text-zinc-500 mb-4">Select your tools:</p>
            <div className="flex flex-wrap gap-2">
              {commonTools.map(tool => (
                <button
                  key={tool}
                  onClick={() => toggleTool(tool)}
                  className={`px-4 py-2 border-2 border-black font-semibold transition-all ${
                    selectedTools.includes(tool) 
                      ? 'bg-black text-white' 
                      : 'bg-white hover:bg-pastel-yellow'
                  }`}
                  data-testid={`tool-chip-${tool.toLowerCase()}`}
                >
                  {tool}
                </button>
              ))}
            </div>
            {selectedTools.length > 0 && (
              <p className="mt-4 text-sm text-zinc-500">
                Selected: {selectedTools.join(', ')}
              </p>
            )}
          </div>

          <button 
            onClick={handleRoast}
            disabled={loading || selectedTools.length === 0}
            className="neo-btn neo-btn-danger px-8 py-4 w-full text-lg disabled:opacity-50 mb-8"
            data-testid="roast-submit"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Flame className="w-6 h-6 mr-2" /> Roast My Stack</>}
          </button>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4" style={{ borderTopColor: '#EF4444' }}></div>
              <p className="font-bold text-lg">Preparing your roast...</p>
            </div>
          )}

          {roast && (
            <div className="neo-card p-8 bg-black text-white border-red-500" data-testid="roast-result">
              <div className="prose-gitstack prose-invert" dangerouslySetInnerHTML={{ __html: formatContent(roast) }} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
