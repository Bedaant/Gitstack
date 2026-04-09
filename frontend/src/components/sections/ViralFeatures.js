import React from "react";
import { useNavigate } from "react-router-dom";
import { Skull, Flame, Lightbulb, Users, ArrowRight, BookOpen } from "lucide-react";

const features = [
  { id: 'dead-tool', title: 'Dead Tool Detector', desc: 'Find free alternatives to paid SaaS', icon: Skull, color: 'bg-pastel-pink', highlight: true, path: '/dead-tool-detector' },
  { id: 'idea-exists', title: 'Your Idea Exists', desc: 'Find similar repos to build on', icon: Lightbulb, color: 'bg-pastel-mint', path: '/idea-exists' },
  { id: 'roast', title: 'Roast My Stack', desc: 'Get brutally honest feedback', icon: Flame, color: 'bg-pastel-yellow', path: '/roast-my-stack' },
  { id: 'repo-translator', title: 'Repo Translator', desc: 'Paste any GitHub link', icon: BookOpen, color: 'bg-blue-100', path: '/repo-translator' },
  { id: 'founders', title: 'Founder Stacks', desc: 'Real stacks behind famous tools', icon: Users, color: 'bg-pastel-lavender', path: '/founder-stacks' },
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
