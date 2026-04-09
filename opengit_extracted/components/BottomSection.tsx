'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Code2, Layers, ArrowRight, Copy, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

export function BottomSection() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Translate this GitHub repo for a non-tech founder: ${url}. 
        Format exactly like this using Markdown:
        **What it does:** (1 sentence)
        
        **Who it is for:** (short description)
        
        **What you can build:** 
        - (point 1)
        - (point 2)
        - (point 3)
        
        **Difficulty:** (Beginner/Intermediate/Advanced)
        
        **How to start:** 
        1. (step 1)
        2. (step 2)
        3. (step 3)`
      });
      setResult(response.text || "No translation available.");
    } catch (e) {
      console.error(e);
      setResult("Failed to translate. Please check the URL and try again.");
    }
    setLoading(false);
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-10 rounded-[2.5rem] bg-white/[0.02] ring-1 ring-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] relative overflow-hidden group hover:bg-white/[0.03] transition-colors flex flex-col"
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 transform origin-top-right pointer-events-none">
          <Code2 className="w-40 h-40 text-white" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <h2 className="text-3xl font-display font-medium tracking-tight text-white mb-3 relative z-10">Repo Translator</h2>
        <p className="text-zinc-400 mb-10 max-w-[280px] font-light leading-relaxed relative z-10">
          Paste any GitHub URL, understand it in plain English in 10 seconds.
        </p>
        
        <div className="relative z-10 mt-auto">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
            placeholder="https://github.com/..."
            className="w-full h-14 pl-5 pr-14 rounded-2xl bg-black/40 border border-white/10 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 outline-none text-sm text-white placeholder:text-zinc-600 backdrop-blur-md transition-all shadow-inner"
          />
          <button 
            onClick={handleTranslate}
            disabled={loading || !url}
            className="absolute right-1.5 top-1.5 bottom-1.5 w-11 flex items-center justify-center rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 p-5 rounded-2xl bg-black/40 border border-white/10 relative z-10"
          >
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-medium prose-a:text-rose-400">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="p-10 rounded-[2.5rem] bg-white/[0.02] ring-1 ring-white/[0.05] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] relative overflow-hidden group hover:bg-white/[0.03] transition-colors flex flex-col"
      >
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 transform origin-top-right pointer-events-none">
          <Layers className="w-40 h-40 text-white" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <h2 className="text-3xl font-display font-medium tracking-tight text-white mb-3 relative z-10">Community Stacks</h2>
        <p className="text-zinc-400 mb-8 max-w-[280px] font-light leading-relaxed relative z-10">
          Real founder stacks you can copy in one click.
        </p>
        
        <div className="space-y-3 relative z-10 mt-auto">
          {[
            { name: 'Newsletter Business', tools: 4, copies: '1.2k' },
            { name: 'SaaS Waitlist', tools: 3, copies: '856' },
            { name: 'Booking Platform', tools: 5, copies: '432' },
          ].map((stack) => (
            <div key={stack.name} className="flex items-center justify-between p-4 rounded-2xl bg-black/20 border border-white/5 hover:bg-black/40 hover:border-white/10 transition-all cursor-pointer group/item">
              <div>
                <div className="text-sm font-medium text-zinc-200 group-hover/item:text-white transition-colors">{stack.name}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{stack.tools} tools</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs font-medium text-zinc-500">{stack.copies} copies</div>
                <button className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
