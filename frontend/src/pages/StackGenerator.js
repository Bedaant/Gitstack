import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronRight, Clock, CheckCircle2, Github, Share2, Copy } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function StackGenerator() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialIdea = params.get('idea') || '';
  
  const [idea, setIdea] = useState(initialIdea);
  const [loading, setLoading] = useState(false);
  const [stack, setStack] = useState(null);
  const [expandedTool, setExpandedTool] = useState(null);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    
    setLoading(true);
    setStack(null);
    try {
      const res = await axios.post(`${API}/ai/stack-generator`, { idea });
      setStack(res.data.stack || []);
    } catch (e) {
      toast.error("Failed to generate stack");
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (initialIdea && !stack) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary border-4 border-black neo-shadow-lg mb-6">
              <Sparkles className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="stack-gen-title">
              Stack Generator
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Tell us what you want to build. We'll recommend the exact tools you need.
            </p>
          </div>

          <div className="mb-12">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I want to build a SaaS that helps freelancers track their time and send invoices..."
              className="neo-input h-40 resize-none mb-4"
              data-testid="stack-gen-input"
            />
            <button 
              onClick={handleGenerate}
              disabled={loading || !idea.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg disabled:opacity-50"
              data-testid="stack-gen-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Sparkles className="w-6 h-6 mr-2" /> Generate My Stack</>}
            </button>
          </div>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <p className="font-bold text-lg">Analyzing your idea...</p>
              <p className="text-zinc-500">Finding the perfect tools for you</p>
            </div>
          )}

          {stack && stack.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-6">
                Here's your stack — tools in order of setup
              </p>
              
              {stack.map((tool, i) => (
                <StackToolCard 
                  key={`${tool.name}-${tool.order || i}`}
                  tool={tool}
                  index={i}
                  expanded={expandedTool === i}
                  onToggle={() => setExpandedTool(expandedTool === i ? null : i)}
                />
              ))}

              <div className="flex gap-4 mt-8">
                <button className="neo-btn neo-btn-primary px-6 py-3 flex-1" data-testid="share-stack">
                  <Share2 className="w-5 h-5 mr-2" /> Share Stack
                </button>
                <button className="neo-btn neo-btn-secondary px-6 py-3 flex-1" data-testid="copy-stack">
                  <Copy className="w-5 h-5 mr-2" /> Copy as Text
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StackToolCard({ tool, index, expanded, onToggle }) {
  return (
    <div className="neo-card p-6" data-testid={`stack-tool-${index}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 border-2 border-black flex items-center justify-center font-mono font-bold text-lg">
            0{tool.order || index + 1}
          </div>
          <div>
            <h3 className="text-xl font-bold">{tool.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2 py-1 ${
                tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
              }`}>
                {tool.difficulty}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {tool.setupTime}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-zinc-600 mb-4">{tool.description}</p>
      
      {expanded ? (
        <div className="border-t-2 border-black pt-4 mt-4">
          <h4 className="font-bold mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Setup Steps
          </h4>
          <ol className="space-y-2">
            {tool.setupSteps?.map((step, j) => (
              <li key={`setup-${tool.name}-${j}`} className="flex gap-3">
                <span className="w-6 h-6 bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {j + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-4 mt-6">
            <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-secondary px-4 py-2 text-sm">
              <Github className="w-4 h-4 mr-2" /> View on GitHub
            </a>
            <button onClick={onToggle} className="text-sm font-semibold text-zinc-500 hover:text-black">
              Close
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={onToggle}
          className="neo-btn neo-btn-secondary px-4 py-2 text-sm"
        >
          Set this up <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      )}
    </div>
  );
}
