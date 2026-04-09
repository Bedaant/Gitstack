'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Skull, Flame, Lightbulb, Users, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

const features = [
  {
    id: 'dead-tool',
    title: 'Dead Tool Detector',
    description: 'Paste your paid SaaS tools. Find free open-source alternatives instantly.',
    icon: Skull,
    color: 'text-rose-400',
    bg: 'bg-rose-400/10',
    highlight: true,
  },
  {
    id: 'roast',
    title: 'Roast My Stack',
    description: 'Get brutally honest feedback on what is redundant or overpriced.',
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
  },
  {
    id: 'idea',
    title: 'Your idea already exists',
    description: 'Paste your idea, see matching open-source GitHub repos.',
    icon: Lightbulb,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
  {
    id: 'founders',
    title: 'What founders actually used',
    description: 'Real stacks behind Cal.com, Supabase, Ghost, and more.',
    icon: Users,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    id: 'error',
    title: 'Explain This Error',
    description: 'Paste any tech error, get a plain English explanation and fix.',
    icon: AlertTriangle,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
];

export function ViralFeatures() {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Dead Tool Detector State
  const [paidTools, setPaidTools] = useState('');
  const [deadToolLoading, setDeadToolLoading] = useState(false);
  const [deadToolResult, setDeadToolResult] = useState<any[] | null>(null);

  // Explain Error State
  const [errorText, setErrorText] = useState('');
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorResult, setErrorResult] = useState<string | null>(null);

  const handleDeadTool = async () => {
    if (!paidTools) return;
    setDeadToolLoading(true);
    setDeadToolResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `I am paying for these tools: ${paidTools}. 
        Suggest open-source or free GitHub alternatives.
        Return ONLY a valid JSON array of objects with these exact keys:
        "paidTool" (string), "monthlyCost" (string, estimate it like "$20/mo"), "freeAlternative" (string), "annualSavings" (string like "$240/yr").`,
        config: {
          responseMimeType: "application/json",
        }
      });
      const data = JSON.parse(response.text || "[]");
      setDeadToolResult(data);
    } catch (e) {
      console.error(e);
    }
    setDeadToolLoading(false);
  };

  const handleErrorExplain = async () => {
    if (!errorText) return;
    setErrorLoading(true);
    setErrorResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Explain this error to a non-tech founder: ${errorText}.
        Format exactly like this in Markdown:
        **What this means:** (1 simple sentence)
        
        **Why it happened:** (1 simple sentence)
        
        **What to do next:** 
        1. (step 1)
        2. (step 2)
        3. (step 3)`
      });
      setErrorResult(response.text || "Could not explain error.");
    } catch (e) {
      console.error(e);
      setErrorResult("Failed to explain error.");
    }
    setErrorLoading(false);
  };

  return (
    <section className="py-16 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 mb-8">
        <h2 className="text-3xl font-display font-medium tracking-tight text-white">Founder Tools</h2>
        <p className="text-zinc-500 mt-2 font-light">Everything you need to build without writing code.</p>
      </div>
      <div className="flex overflow-x-auto pb-12 pt-4 gap-6 px-4 md:px-8 snap-x snap-mandatory scrollbar-hide">
        {features.map((feature, i) => (
          <motion.div
            key={feature.id}
            onClick={() => setActiveModal(feature.id)}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="snap-center shrink-0 w-[85vw] md:w-[340px] p-8 rounded-[2rem] bg-white/[0.02] ring-1 ring-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:bg-white/[0.04] hover:ring-white/[0.1] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col"
          >
            {feature.highlight && (
              <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-rose-500 to-orange-500 text-[10px] font-bold uppercase tracking-widest rounded-bl-2xl text-white shadow-lg">
                Most Popular
              </div>
            )}
            <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
              <feature.icon className={`w-6 h-6 ${feature.color}`} />
            </div>
            <h3 className="text-xl font-medium mb-3 text-white tracking-tight">{feature.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8 font-light">{feature.description}</p>
            <div className="flex items-center text-sm font-medium text-zinc-500 group-hover:text-white transition-colors mt-auto">
              Try it out <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dead Tool Detector Modal */}
      <Modal 
        isOpen={activeModal === 'dead-tool'} 
        onClose={() => setActiveModal(null)}
        title="Dead Tool Detector"
      >
        <div className="space-y-6">
          <p className="text-zinc-400 font-light">Paste the SaaS tools you currently pay for, separated by commas.</p>
          <textarea
            value={paidTools}
            onChange={(e) => setPaidTools(e.target.value)}
            placeholder="e.g., Typeform, Calendly, Hotjar, Zapier"
            className="w-full h-32 p-4 rounded-2xl bg-black/40 border border-white/10 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 outline-none text-white placeholder:text-zinc-600 resize-none"
          />
          <button
            onClick={handleDeadTool}
            disabled={deadToolLoading || !paidTools}
            className="w-full py-4 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {deadToolLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Skull className="w-5 h-5" />}
            Find Free Alternatives
          </button>

          {deadToolResult && (
            <div className="mt-8 space-y-4">
              <div className="grid grid-cols-4 gap-4 text-xs font-medium text-zinc-500 uppercase tracking-wider pb-2 border-b border-white/10">
                <div>You Pay For</div>
                <div>Monthly Cost</div>
                <div>Free Alternative</div>
                <div className="text-emerald-400">You Save/Year</div>
              </div>
              {deadToolResult.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-4 text-sm text-zinc-300 items-center py-2 border-b border-white/5 last:border-0">
                  <div className="font-medium text-white">{item.paidTool}</div>
                  <div>{item.monthlyCost}</div>
                  <div className="text-rose-300">{item.freeAlternative}</div>
                  <div className="text-emerald-400 font-bold">{item.annualSavings}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Explain This Error Modal */}
      <Modal 
        isOpen={activeModal === 'error'} 
        onClose={() => setActiveModal(null)}
        title="Explain This Error"
      >
        <div className="space-y-6">
          <p className="text-zinc-400 font-light">Paste any technical error message you encountered while setting up a tool.</p>
          <textarea
            value={errorText}
            onChange={(e) => setErrorText(e.target.value)}
            placeholder="e.g., Error: ENOSPC: System limit for number of file watchers reached..."
            className="w-full h-32 p-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none text-white placeholder:text-zinc-600 font-mono text-sm resize-none"
          />
          <button
            onClick={handleErrorExplain}
            disabled={errorLoading || !errorText}
            className="w-full py-4 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {errorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
            Explain in Plain English
          </button>

          {errorResult && (
            <div className="mt-8 p-6 rounded-2xl bg-black/40 border border-white/10">
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-medium prose-strong:text-blue-400">
                <ReactMarkdown>{errorResult}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </section>
  );
}
