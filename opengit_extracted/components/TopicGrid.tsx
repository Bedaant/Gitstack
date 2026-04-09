'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Bot, Palette, Brain, Zap, LineChart, CreditCard, ArrowRight, Loader2, Star } from 'lucide-react';
import { Modal } from './ui/Modal';
import { GoogleGenAI } from '@google/genai';

const topics = [
  { name: 'Claude skills', count: 34, icon: Bot, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { name: 'UI/UX tools', count: 52, icon: Palette, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  { name: 'Agent training', count: 28, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { name: 'Automation', count: 61, icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  { name: 'Data & analytics', count: 44, icon: LineChart, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { name: 'Payments & billing', count: 19, icon: CreditCard, color: 'text-orange-400', bg: 'bg-orange-400/10' },
];

interface TopicTool {
  name: string;
  description: string;
  stars: string;
  difficulty: string;
}

export function TopicGrid() {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tools, setTools] = useState<TopicTool[] | null>(null);

  const handleTopicClick = async (topicName: string) => {
    setSelectedTopic(topicName);
    setLoading(true);
    setTools(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `List 5 popular open-source GitHub repositories for the category: "${topicName}".
        Return ONLY a valid JSON array of objects with these exact keys:
        "name" (string),
        "description" (string, plain English, no jargon),
        "stars" (string, e.g., "12k"),
        "difficulty" (string, "Beginner", "Intermediate", or "Advanced")`,
        config: {
          responseMimeType: "application/json",
        }
      });
      const data = JSON.parse(response.text || "[]");
      setTools(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <section className="py-20 px-4 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h2 className="text-3xl font-display font-medium tracking-tight text-white mb-2">Browse by Topic</h2>
          <p className="text-zinc-500 font-light">Explore curated tools by category.</p>
        </div>
        <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 group">
          View all <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {topics.map((topic, i) => (
          <motion.div
            key={topic.name}
            onClick={() => handleTopicClick(topic.name)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-3xl bg-white/[0.02] ring-1 ring-white/[0.05] hover:bg-white/[0.04] hover:ring-white/[0.1] transition-all duration-300 cursor-pointer group flex items-center gap-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
          >
            <div className={`w-12 h-12 rounded-2xl ${topic.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
              <topic.icon className={`w-5 h-5 ${topic.color}`} />
            </div>
            <div>
              <h3 className="font-medium text-white tracking-tight">{topic.name}</h3>
              <p className="text-sm text-zinc-500 font-light mt-0.5">{topic.count} repos</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Modal isOpen={!!selectedTopic} onClose={() => setSelectedTopic(null)} title={`Tools for ${selectedTopic}`}>
        <div className="text-left">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <p className="text-zinc-400 font-light text-lg animate-pulse">Curating the best tools...</p>
            </div>
          ) : tools ? (
            <div className="flex flex-col gap-4">
              {tools.map((tool, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx} 
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-medium text-white tracking-tight">{tool.name}</h4>
                    <div className={`text-xs px-2.5 py-1 rounded-md font-medium tracking-wide ${
                      tool.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                      tool.difficulty === 'Intermediate' ? 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20' :
                      'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                    }`}>
                      {tool.difficulty}
                    </div>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4 leading-relaxed font-light">{tool.description}</p>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                    <Star className="w-3.5 h-3.5" />
                    {tool.stars} stars
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}
