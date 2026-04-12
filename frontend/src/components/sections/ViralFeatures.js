import React from "react";
import { useNavigate } from "react-router-dom";
import { Skull, Flame, Lightbulb, ArrowRight, BookOpen, Sparkles } from "lucide-react";

const features = [
  { id: 'stack-gen', title: 'Stack Generator', desc: 'Build your entire tech stack from an idea', icon: Sparkles, color: 'bg-primary text-white', highlight: true, path: '/stack-generator' },
  { id: 'dead-tool', title: 'Dead Tool Detector', desc: 'Find free alternatives to paid SaaS', icon: Skull, color: 'bg-pastel-pink', path: '/dead-tool-detector' },
  { id: 'repo-translator', title: 'Repo Translator', desc: 'Explain any GitHub repo in plain English', icon: BookOpen, color: 'bg-blue-100', path: '/repo-translator' },
  { id: 'roast', title: 'Roast My Stack', desc: 'Get brutally honest feedback on your tools', icon: Flame, color: 'bg-pastel-yellow', path: '/roast-my-stack' },
  { id: 'idea-exists', title: 'Idea Already Exists', desc: 'Find similar repos to build on top of', icon: Lightbulb, color: 'bg-pastel-mint', path: '/idea-exists' },
];

export const ViralFeatures = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-zinc-50 border-y-4 border-black">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">Founder Tools</h2>
        <p className="text-zinc-500 mb-10 text-lg">Everything you need to build without writing code.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map(f => (
            <button
              key={f.id}
              onClick={() => navigate(f.path)}
              className={`neo-card p-6 text-left ${f.color} relative ${f.highlight ? 'lg:col-span-1' : ''}`}
              data-testid={`feature-${f.id}`}
            >
              {f.highlight && (
                <div className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                  Popular
                </div>
              )}
              <f.icon className="w-8 h-8 mb-4" strokeWidth={2} />
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-600">{f.desc}</p>
              <ArrowRight className="w-5 h-5 mt-4" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
