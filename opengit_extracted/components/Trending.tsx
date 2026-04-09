'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Star, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

const tabs = ['Top this week', 'Most starred', 'New & rising', 'Product Hunt picks'];

const tools = [
  {
    rank: 1,
    name: 'Formbricks',
    description: 'Free alternative to Typeform. Build surveys and forms without coding.',
    lang: 'TypeScript',
    langColor: 'bg-blue-400',
    stars: '8.2k',
    difficulty: 'Beginner',
  },
  {
    rank: 2,
    name: 'Cal.com',
    description: 'Open source Calendly alternative. Full control over your scheduling.',
    lang: 'TypeScript',
    langColor: 'bg-blue-400',
    stars: '24.5k',
    difficulty: 'Beginner',
  },
  {
    rank: 3,
    name: 'n8n',
    description: 'Free Zapier alternative. Automate tasks across different services.',
    lang: 'TypeScript',
    langColor: 'bg-blue-400',
    stars: '35.1k',
    difficulty: 'Intermediate',
  },
  {
    rank: 4,
    name: 'Plausible',
    description: 'Simple, privacy-friendly Google Analytics alternative.',
    lang: 'Elixir',
    langColor: 'bg-purple-400',
    stars: '16.8k',
    difficulty: 'Beginner',
  },
];

export function Trending() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);

  const handleToolClick = async (toolName: string) => {
    setSelectedTool(toolName);
    setLoading(true);
    setGuide(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Explain the open-source tool "${toolName}" to a non-technical founder.
        Format exactly like this in Markdown:
        
        **What it is:**
        (1-2 sentences explaining it simply)
        
        **Why you should use it:**
        (1-2 sentences on the business value)
        
        **How to get started (No-code/Low-code):**
        1. (Step 1)
        2. (Step 2)
        3. (Step 3)`
      });
      setGuide(response.text || "Could not generate guide.");
    } catch (e) {
      console.error(e);
      setGuide("Failed to load guide. Please try again.");
    }
    setLoading(false);
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <h2 className="text-3xl font-display font-medium tracking-tight text-white mb-2">Trending Now</h2>
          <p className="text-zinc-500 font-light">The most popular open-source tools this week.</p>
        </div>
        
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all relative ${
                activeTab === tab ? 'text-zinc-950 bg-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.name}
            onClick={() => handleToolClick(tool.name)}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group flex flex-col sm:flex-row sm:items-center gap-4 py-6 border-b border-white/[0.05] hover:bg-white/[0.02] -mx-4 px-4 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-6 flex-1">
              <span className="text-lg font-mono text-zinc-600 w-6 text-center group-hover:text-zinc-400 transition-colors">0{tool.rank}</span>
              <div>
                <h3 className="font-medium text-white text-lg flex items-center gap-2">
                  {tool.name}
                  <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </h3>
                <p className="text-sm text-zinc-400 mt-1 font-light">{tool.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6 ml-12 sm:ml-0 mt-2 sm:mt-0">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                <div className={`w-2 h-2 rounded-full ${tool.langColor} shadow-[0_0_8px_currentColor]`} />
                {tool.lang}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                <Star className="w-3.5 h-3.5 text-zinc-500" />
                {tool.stars}
              </div>
              <div className={`text-xs px-2.5 py-1 rounded-md font-medium tracking-wide ${
                tool.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20'
              }`}>
                {tool.difficulty}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={!!selectedTool} onClose={() => setSelectedTool(null)} title={`About ${selectedTool}`}>
        <div className="text-left">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-zinc-400 font-light text-lg animate-pulse">Writing a simple guide...</p>
            </div>
          ) : guide ? (
            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-display prose-headings:font-medium prose-strong:text-white">
              <ReactMarkdown>{guide}</ReactMarkdown>
            </div>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
