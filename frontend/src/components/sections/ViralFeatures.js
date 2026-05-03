import React from "react";
import { useNavigate } from "react-router-dom";
import { Skull, Flame, Lightbulb, ArrowRight, BookOpen, Sparkles } from "lucide-react";

const features = [
  { id: 'stack-gen', title: 'Stack Generator', desc: 'Build your entire tech stack from an idea', icon: Sparkles, color: 'bg-primary text-primary-foreground', highlight: true, path: '/stack-generator' },
  { id: 'dead-tool', title: 'Dead Tool Detector', desc: 'Find free alternatives to paid SaaS', icon: Skull, color: 'bg-pastel-pink text-black', path: '/dead-tool-detector' },
  { id: 'repo-translator', title: 'Repo Translator', desc: 'Explain any GitHub repo in plain English', icon: BookOpen, color: 'bg-pastel-lavender text-black', path: '/repo-translator' },
  { id: 'roast', title: 'Roast My Stack', desc: 'Get brutally honest feedback on your tools', icon: Flame, color: 'bg-pastel-yellow text-black', path: '/roast-my-stack' },
  { id: 'idea-exists', title: 'Idea Already Exists', desc: 'Find similar repos to build on top of', icon: Lightbulb, color: 'bg-pastel-mint text-black', path: '/idea-exists' },
];

export const ViralFeatures = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-muted border-y-4 border-border">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">Founder Tools</h2>
        <p className="text-muted-foreground mb-10 text-lg">Everything you need to build without writing code.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {features.map(f => (
            <button
              key={f.id}
              onClick={() => navigate(f.path)}
              className={`p-6 text-left border-2 border-border neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all relative ${f.color} ${f.highlight ? 'lg:col-span-1' : ''}`}
              data-testid={`feature-${f.id}`}
            >
              {f.highlight && (
                <div className="absolute -top-1 -right-1 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                  Popular
                </div>
              )}
              <f.icon className="w-8 h-8 mb-4" strokeWidth={2} />
              <h3 className="text-lg font-bold mb-1">{f.title}</h3>
              <p className="text-sm opacity-80">{f.desc}</p>
              <ArrowRight className="w-5 h-5 mt-4" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
