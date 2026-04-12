import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronRight, Clock, CheckCircle2, Share2, Copy, BookmarkPlus, BookmarkCheck, ExternalLink, Globe, Mail } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";
import { saveStackLocally, isStackSaved } from "../utils/localStacks";

const LOADING_STEPS = [
  "Parsing your idea...",
  "Matching tools to your use case...",
  "Checking GitHub stars & activity...",
  "Assembling your blueprint...",
];

export default function StackGenerator() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialIdea = params.get('idea') || '';

  const [idea, setIdea] = useState(initialIdea);
  const [budget, setBudget] = useState("");
  const [buildingAlone, setBuildingAlone] = useState(null);
  const [needsPayments, setNeedsPayments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [stack, setStack] = useState(null);
  const [expandedTool, setExpandedTool] = useState(null);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [publicSlug, setPublicSlug] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const interval = setInterval(() => {
      setLoadingStep(s => (s + 1) % LOADING_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!idea.trim()) return;

    setLoading(true);
    setStack(null);
    setSaved(false);
    try {
      const res = await axios.post(`${API}/ai/stack-generator`, {
        idea,
        ...(budget && { budget }),
        ...(buildingAlone !== null && { building_alone: buildingAlone }),
        ...(needsPayments !== null && { needs_payments: needsPayments }),
      });
      setStack(res.data.stack || []);
      setSaved(isStackSaved(idea));
    } catch (e) {
      toast.error("Failed to generate stack. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  const handleSave = () => {
    if (!stack || saved) return;
    saveStackLocally(idea, stack);
    setSaved(true);
    toast.success("Stack saved! View it in My Stacks →", {
      action: { label: "View", onClick: () => window.location.href = '/dashboard' },
    });
  };

  const handlePublish = async () => {
    if (!stack || publicSlug || publishing) return;
    setPublishing(true);
    try {
      const name = idea.length > 60 ? idea.slice(0, 57) + '...' : idea;
      const res = await axios.post(`${API}/stacks/publish`, { name, idea, tools: stack });
      setPublicSlug(res.data.stack_id);
      toast.success("Stack published! Share the link →");
    } catch {
      toast.error("Couldn't publish. Try again.");
    }
    setPublishing(false);
  };

  const handleEmailStack = async (e) => {
    e.preventDefault();
    if (!email.trim() || emailSent) return;
    try {
      await axios.post(`${API}/stacks/email-me`, { email: email.trim(), idea, tools: stack });
      setEmailSent(true);
      toast.success("Saved! We'll remind you when it's time to build.");
    } catch {
      toast.error("Couldn't save. Check your email and try again.");
    }
  };

  useEffect(() => {
    if (initialIdea && !stack) {
      handleGenerate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <SEO
        title="Stack Generator — Find Free Tools for Your Idea"
        description="Tell us what you want to build and we'll generate a complete free open-source tech stack for you. No coding required. Used by 1,000+ founders."
        path="/stack-generator"
      />
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
              className="neo-input h-40 resize-none mb-6"
              data-testid="stack-gen-input"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Monthly Budget</p>
                <div className="flex flex-wrap gap-2">
                  {['$0 (free only)', '$50/mo', '$200/mo', '$500+/mo'].map(b => (
                    <button
                      key={b}
                      onClick={() => setBudget(budget === b ? "" : b)}
                      className={`px-3 py-1.5 border-2 border-black text-xs font-bold transition-all ${budget === b ? 'bg-black text-white' : 'bg-white hover:bg-pastel-yellow'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Team Size</p>
                <div className="flex gap-2">
                  {[{label: 'Solo', val: true}, {label: 'With a Team', val: false}].map(({label, val}) => (
                    <button
                      key={label}
                      onClick={() => setBuildingAlone(buildingAlone === val ? null : val)}
                      className={`px-3 py-1.5 border-2 border-black text-xs font-bold transition-all ${buildingAlone === val ? 'bg-black text-white' : 'bg-white hover:bg-pastel-yellow'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Needs Payments?</p>
                <div className="flex gap-2">
                  {[{label: 'Yes', val: true}, {label: 'No', val: false}].map(({label, val}) => (
                    <button
                      key={label}
                      onClick={() => setNeedsPayments(needsPayments === val ? null : val)}
                      className={`px-3 py-1.5 border-2 border-black text-xs font-bold transition-all ${needsPayments === val ? 'bg-black text-white' : 'bg-white hover:bg-pastel-yellow'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
              <AnimatePresence mode="wait">
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="font-bold text-lg"
                >
                  {LOADING_STEPS[loadingStep]}
                </motion.p>
              </AnimatePresence>
              <p className="text-zinc-500 text-sm mt-1">Usually takes 10–20 seconds</p>
            </div>
          )}

          {stack && stack.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-6 font-bold">
                Here's your tailored stack:
              </p>
              
              <AnimatePresence>
                {stack.map((tool, i) => (
                  <motion.div
                    key={`${tool.name}-${i}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <StackToolCard 
                      tool={tool}
                      index={i}
                      expanded={expandedTool === i}
                      onToggle={() => setExpandedTool(expandedTool === i ? null : i)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="flex flex-wrap gap-3 mt-8">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`neo-btn px-6 py-3 flex-1 font-bold ${saved ? 'bg-green-100 border-green-400 text-green-700 cursor-default' : 'neo-btn-primary'}`}
                  data-testid="save-stack"
                >
                  {saved
                    ? <><BookmarkCheck className="w-5 h-5 mr-2" /> Saved to My Stacks</>
                    : <><BookmarkPlus className="w-5 h-5 mr-2" /> Save Stack</>}
                </button>
                <button
                  onClick={() => {
                    const text = `My stack for "${idea}":\n${stack.map((t, i) => `${i+1}. ${t.name} — ${t.description}`).join('\n')}\n\nBuilt with GitStack: ${window.location.origin}/stack-generator`;
                    if (navigator.share) {
                      navigator.share({ title: `My Stack: ${idea.slice(0, 40)}`, text }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(text);
                      toast.success("Stack copied to clipboard!");
                    }
                  }}
                  className="neo-btn neo-btn-secondary px-6 py-3 flex-1"
                  data-testid="share-stack"
                >
                  <Share2 className="w-5 h-5 mr-2" /> Share Stack
                </button>
                <button
                  onClick={() => {
                    const text = stack.map((t, i) => `${i+1}. ${t.name}: ${t.description}`).join('\n');
                    navigator.clipboard.writeText(text);
                    toast.success("Details copied!");
                  }}
                  className="neo-btn neo-btn-secondary px-6 py-3"
                  data-testid="copy-stack"
                >
                  <Copy className="w-5 h-5 mr-2" /> Copy
                </button>
              </div>

              {/* ── Publish publicly ── */}
              <div className="neo-card p-5 bg-pastel-mint border-2 border-black mt-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Share a public link
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">Anyone with the link can view and copy your stack.</p>
                  </div>
                  {publicSlug ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        readOnly
                        value={`${window.location.origin}/s/${publicSlug}`}
                        className="neo-input py-2 text-sm flex-1 min-w-0 bg-white"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/s/${publicSlug}`); toast.success("Link copied!"); }}
                        className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black whitespace-nowrap"
                      >
                        Copy link
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handlePublish}
                      disabled={publishing}
                      className="neo-btn neo-btn-primary px-5 py-2 text-sm font-black flex items-center gap-2 disabled:opacity-50"
                      data-testid="publish-stack"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Globe className="w-4 h-4" /> Publish</>}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Email me this stack ── */}
              <div className="neo-card p-5 bg-pastel-yellow border-2 border-black mt-2">
                <p className="font-black text-sm uppercase tracking-wide flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4" /> Email me this stack
                </p>
                <p className="text-xs text-zinc-600 mb-3">Don't lose it. We'll send it to your inbox so you can build when you're ready.</p>
                {emailSent ? (
                  <p className="text-sm font-black text-green-700">✓ Saved — check your inbox shortly.</p>
                ) : (
                  <form onSubmit={handleEmailStack} className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="neo-input py-2 text-sm flex-1"
                      data-testid="email-stack-input"
                    />
                    <button type="submit" className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black whitespace-nowrap">
                      Send it
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StackToolCard({ tool, index, expanded, onToggle }) {
  return (
    <motion.div 
      layout
      className={`neo-card transition-all ${expanded ? 'border-primary ring-4 ring-primary/10' : ''}`} 
      data-testid={`stack-tool-${index}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 border-2 border-black flex items-center justify-center font-mono font-bold text-lg transition-colors ${expanded ? 'bg-primary text-white scale-110' : 'bg-zinc-100'}`}>
              0{tool.order || index + 1}
            </div>
            <div>
              <Link
                to={`/tools/${tool.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-xl font-bold hover:text-primary hover:underline underline-offset-4 transition-colors inline-flex items-center gap-1 group"
                onClick={e => e.stopPropagation()}
              >
                {tool.name}
                <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-1 ${
                  tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                  tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                }`}>
                  {tool.difficulty}
                </span>
                <span className="text-xs text-zinc-500 flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3" /> {tool.setupTime}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-zinc-600 mb-4 leading-relaxed">{tool.description}</p>
        
        <AnimatePresence>
          {expanded ? (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t-2 border-black/10 pt-4 mt-4 bg-zinc-50 -mx-6 px-6 pb-4">
                <h4 className="font-bold mb-3 flex items-center gap-2 text-zinc-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600" /> Setup Blueprint
                </h4>
                <ol className="space-y-3">
                  {tool.setupSteps?.map((step, j) => (
                    <li key={`setup-${tool.name}-${j}`} className="flex gap-3 items-start">
                      <span className="w-6 h-6 bg-black text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {j + 1}
                      </span>
                      <span className="text-sm text-zinc-700 font-medium">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-4 mt-8 pt-4 border-t border-black/5">
                  <a href={tool.githubUrl} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-secondary px-6 py-2 text-sm bg-white">
                    <ExternalLink className="w-4 h-4 mr-2" /> View Repo
                  </a>
                  <button onClick={onToggle} className="text-sm font-bold text-zinc-400 hover:text-black hover:underline underline-offset-4">
                    Close Blueprint
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <button 
              onClick={onToggle}
              className="neo-btn neo-btn-secondary px-6 py-2 text-sm font-bold bg-white group"
            >
              Set this up <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
