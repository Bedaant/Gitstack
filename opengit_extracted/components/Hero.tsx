'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Sparkles, ArrowRight, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GoogleGenAI } from '@google/genai';

const chips = ['AI agent', 'SaaS starter', 'Marketplace', 'Automation', 'UI/design', 'Data tools'];

interface ToolRecommendation {
  name: string;
  description: string;
  difficulty: string;
  setupTime: string;
  setupSteps: string[];
}

export function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToolRecommendation[] | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const handleGenerateStack = async () => {
    if (!prompt) return;
    setIsModalOpen(true);
    setLoading(true);
    setResult(null);
    setExpandedTool(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `I want to build: ${prompt}.
        Act as a smart friend who knows technology. Recommend a stack of 4-6 free/open-source GitHub tools to build this.
        Return ONLY a valid JSON array of objects with these exact keys:
        "name" (string),
        "description" (string, plain English, no jargon, focus on the outcome),
        "difficulty" (string, "Beginner", "Intermediate", or "Advanced"),
        "setupTime" (string, e.g., "15 mins"),
        "setupSteps" (array of strings, 3 simple steps to set it up without code if possible)`,
        config: {
          responseMimeType: "application/json",
        }
      });
      const data = JSON.parse(response.text || "[]");
      setResult(data);
    } catch (e) {
      console.error(e);
      // Fallback or error state could be handled here
    }
    setLoading(false);
  };

  return (
    <section className="pt-16 pb-24 px-4 max-w-5xl mx-auto flex flex-col items-center text-center relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs font-medium text-zinc-300 mb-10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        127 tools, explained in plain English
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-6xl md:text-[5.5rem] leading-[1.05] font-display font-medium tracking-tighter mb-8 text-white"
      >
        GitHub, simplified for <br className="hidden md:block" />
        <span className="text-transparent bg-clip-text bg-gradient-to-br from-rose-300 via-rose-400 to-orange-500">
          non-tech founders
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 font-light tracking-wide leading-relaxed"
      >
        The layer between GitHub tools existing and you actually using them. Discover, understand, and build your idea without writing code.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="relative flex items-center group">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-[2rem] blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <Search className="absolute left-6 w-5 h-5 text-zinc-400 z-10" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateStack()}
            placeholder="What do you want to build? e.g. a chatbot, invoice tool..."
            className="w-full h-16 pl-14 pr-36 rounded-full bg-zinc-900/80 border border-white/10 focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-white placeholder:text-zinc-500 shadow-2xl backdrop-blur-xl text-lg"
          />
          <button 
            onClick={handleGenerateStack}
            className="absolute right-2 h-12 px-6 rounded-full bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95"
          >
            Search
          </button>
        </div>

        <div className="flex overflow-x-auto pb-4 pt-6 gap-2.5 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:justify-center">
          {chips.map((chip, i) => (
            <button
              key={chip}
              onClick={() => setPrompt(chip)}
              className="whitespace-nowrap px-4 py-2 rounded-full bg-white/[0.02] border border-white/[0.05] hover:border-white/20 hover:bg-white/[0.06] text-sm text-zinc-400 hover:text-white transition-all"
            >
              {chip}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.button
        onClick={handleGenerateStack}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-16 group relative inline-flex items-center justify-center gap-3 px-8 py-4 font-medium text-white transition-all duration-300 bg-white/[0.03] border border-white/10 rounded-full hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]"
      >
        <Sparkles className="w-4 h-4 text-rose-400 group-hover:animate-pulse" />
        <span className="tracking-wide">Build my stack</span>
        <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </motion.button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Your Custom Stack">
        <div className="text-left">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-zinc-400 font-light text-lg animate-pulse">Analyzing requirements & finding tools...</p>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-4">
              <p className="text-zinc-400 text-sm mb-2 font-light">Here is the exact sequence of tools you need to build this.</p>
              {result.map((tool, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white font-mono text-sm shadow-inner">
                        0{idx + 1}
                      </div>
                      <h4 className="text-xl font-medium text-white tracking-tight">{tool.name}</h4>
                    </div>
                    <div className={`text-xs px-3 py-1.5 rounded-lg font-medium tracking-wide ${
                      tool.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                      tool.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20' :
                      'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                    }`}>
                      {tool.difficulty}
                    </div>
                  </div>
                  
                  <p className="text-zinc-400 text-sm mb-6 leading-relaxed font-light">{tool.description}</p>
                  
                  {expandedTool === tool.name ? (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-6 pt-6 border-t border-white/10"
                    >
                      <h5 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Guided Setup
                      </h5>
                      <div className="space-y-4">
                        {tool.setupSteps.map((step: string, stepIdx: number) => (
                          <div key={stepIdx} className="flex gap-4 text-sm">
                            <div className="w-6 h-6 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center flex-shrink-0 text-xs font-medium border border-rose-500/20">
                              {stepIdx + 1}
                            </div>
                            <p className="text-zinc-300 font-light leading-relaxed pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6 flex justify-end">
                        <button 
                          onClick={() => setExpandedTool(null)}
                          className="text-xs font-medium text-zinc-500 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
                        >
                          Close guide
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-white/5">
                      <div className="text-xs text-zinc-500 flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4" />
                        {tool.setupTime}
                      </div>
                      <button 
                        onClick={() => setExpandedTool(tool.name)}
                        className="text-sm font-medium bg-white text-zinc-950 px-5 py-2 rounded-full hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                      >
                        Set this up
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
