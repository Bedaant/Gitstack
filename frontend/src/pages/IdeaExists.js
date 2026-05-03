import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Search, Lightbulb, Loader2, Star, Github, ArrowRight, Sparkles } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";

export default function IdeaExists() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState(null);
  const [apiError, setApiError] = useState(false);

  const LOADING_STEPS = [
    "Parsing your idea...",
    "Scanning 300M+ GitHub repos...",
    "Ranking by relevance...",
    "Writing founder's analysis...",
  ];

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => setLoadingStep(s => (s + 1) % LOADING_STEPS.length), 2500);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;

    setLoading(true);
    setResults(null);
    setApiError(false);
    try {
      const res = await axios.post(`${API}/ai/idea-exists`, { idea });
      setResults(res.data);
    } catch (e) {
      setApiError(true);
      toast.error("Search failed — check your connection and try again.");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Does My Idea Already Exist? — Find Similar GitHub Projects"
        description="Type your startup idea and discover existing open-source projects building the same thing. Validate your idea or find a foundation to build on. Free and instant."
        path="/idea-exists"
      />
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
              className="inline-flex items-center justify-center w-20 h-20 bg-pastel-mint border-4 border-black neo-shadow-lg mb-6"
            >
              <Lightbulb className="w-10 h-10" strokeWidth={2} />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="idea-exists-title">
              Your Idea Already Exists
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Don't start from zero. Find existing open-source engines you can fork, improve, or learn from.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-12">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. I want to build an AI agent that manages my LinkedIn and replies to recruiters..."
              className="neo-input p-4 h-32 resize-none mb-4 focus:ring-4 ring-pastel-mint/30"
              data-testid="idea-input"
            />
            <button 
              type="submit" 
              disabled={loading || !idea.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-xl font-black disabled:opacity-50 flex items-center justify-center gap-2 group"
              data-testid="idea-submit"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Search className="w-6 h-6 transition-transform group-hover:scale-110" /> 
                  Find My Blueprint
                </>
              )}
            </button>
          </form>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-6 w-12 h-12 border-4" style={{ borderTopColor: 'hsl(var(--primary))' }}></div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-black text-2xl uppercase italic"
                >
                  {LOADING_STEPS[loadingStep]}
                </motion.p>
              </AnimatePresence>
              <p className="text-muted-foreground font-mono text-sm mt-2">Usually takes 10–20 seconds</p>
            </div>
          )}

          {apiError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-10 text-center bg-pastel-pink border-4 border-black shadow-[8px_8px_0px_0px_hsl(var(--foreground))] text-black"
            >
              <p className="text-2xl font-black uppercase mb-2">Search Failed</p>
              <p className="text-foreground/70 font-medium mb-6">Something went wrong on our end. Check your connection and try again.</p>
              <button
                onClick={() => { setApiError(false); }}
                className="neo-btn neo-btn-primary px-8 py-3 font-black"
              >
                Try Again
              </button>
            </motion.div>
          )}

          <AnimatePresence>
            {results && results.similar_projects?.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="p-6 bg-pastel-mint text-center border-4 border-black shadow-[8px_8px_0px_0px_hsl(var(--foreground))] relative overflow-hidden text-black">
                  <Sparkles className="absolute right-4 top-4 w-12 h-12 text-foreground/10" />
                  <p className="text-sm font-mono uppercase tracking-widest mb-1 font-bold">Discovery Report</p>
                  <p className="text-4xl font-black italic">Found {results.count} Engines</p>
                  <p className="text-sm font-bold mt-2 text-foreground/70">These projects have already solved the hard parts of your idea.</p>
                </div>

                <div className="space-y-6">
                  {results.similar_projects.map((project, idx) => (
                    <motion.div 
                      key={`${project.name}-${idx}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-8 group hover:border-primary transition-all shadow-[8px_8px_0px_0px_hsl(var(--foreground))] bg-background border-2 border-foreground" 
                      data-testid={`similar-project-${project.name}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
                        <div>
                          <h3 className="text-2xl font-black uppercase tracking-tight group-hover:text-primary transition-colors underline decoration-black/10 underline-offset-8 decoration-4">
                            {project.name}
                          </h3>
                          <p className="text-xs font-mono text-muted-foreground mt-2 font-bold">{project.full_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-muted px-3 py-1 border-2 border-foreground uppercase">{project.language}</span>
                          <span className="flex items-center gap-1 text-sm font-black border-2 border-foreground px-3 py-1 bg-pastel-yellow text-black">
                            <Star className="w-4 h-4 text-foreground" fill="currentColor" /> {project.stars}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground mb-6 leading-relaxed text-lg font-medium italic">"{project.description}"</p>
                      
                      <div className="bg-muted border-l-8 border-foreground p-6 mb-6 space-y-4">
                        <div>
                          <p className="text-xs font-black uppercase text-muted-foreground mb-1">Founder's Take:</p>
                          <p className="text-base font-bold italic text-foreground">“{project.whyRelevant}”</p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase text-primary mb-1">How to execute:</p>
                          <p className="text-base font-black text-foreground">{project.howToUse}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t-2 border-foreground/5">
                        <a 
                          href={project.githubUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="neo-btn neo-btn-secondary px-8 py-3 font-bold bg-background"
                        >
                          <Github className="w-5 h-5 mr-3" /> Source Code
                        </a>
                        <Link 
                          to={`/repo/${project.full_name}`}
                          className="neo-btn neo-btn-primary px-8 py-3 font-black flex items-center gap-2"
                        >
                          Human Translation <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {results && results.similar_projects?.length === 0 && (
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="neo-card p-12 text-center bg-pastel-yellow border-4 border-black text-black"
            >
              <Lightbulb className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-3xl font-black uppercase italic mb-2">Zero Precedents Found!</h2>
              <p className="text-muted-foreground font-bold max-w-md mx-auto">This idea is dangerously unique. You might be onto something massive. Let's build a custom stack for it.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-10 py-4 mt-8 font-black uppercase text-lg">
                Finalize My Stack
              </Link>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
