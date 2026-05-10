import React from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Sparkles, DollarSign, ArrowRight } from "lucide-react";

const EXAMPLE_ROAST = `**🔥 What's Redundant:**
You're paying for Zapier AND running n8n... pick one. Zapier is a $600/yr tax you're paying to avoid reading a README.

**💸 What's Overpriced:**
Mailchimp at $65/mo with 800 subscribers. Listmonk is free, self-hosted, and does everything Mailchimp does — you're donating $780/yr to a VC.

**🧠 What a Smarter Founder Would Do:**
Replace Zapier → n8n (free, self-host in 10 min). Replace Mailchimp → Listmonk ($0). Keep Stripe — it's worth it. **You'd save $1,380/year and own your data.**`;

const EXAMPLE_STACK = [
  { name: "Supabase", role: "Database + Auth", difficulty: "Beginner", color: "bg-pastel-mint" },
  { name: "n8n", role: "Automation", difficulty: "Intermediate", color: "bg-pastel-yellow" },
  { name: "Resend", role: "Email delivery", difficulty: "Beginner", color: "bg-pastel-lavender" },
  { name: "Plausible", role: "Analytics", difficulty: "Beginner", color: "bg-pastel-pink" },
];

const EXAMPLE_SAVINGS = [
  { paid: "Zapier", alt: "n8n", saves: "$588/yr" },
  { paid: "Mailchimp", alt: "Listmonk", saves: "$780/yr" },
  { paid: "Typeform", alt: "Formbricks", saves: "$384/yr" },
];

export const SocialProof = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 px-4 bg-muted border-y-4 border-foreground">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-black">What you actually get</p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">See it before you try it</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Example: Stack */}
          <div className="neo-card overflow-hidden border-4 border-foreground shadow-[8px_8px_0px_0px_hsl(var(--foreground))]">
            <div className="bg-primary text-primary-foreground p-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <div>
                <p className="font-black text-sm uppercase tracking-wide">Stack Generator</p>
                <p className="text-xs opacity-75 font-mono">"I want to build a SaaS invoice tool"</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {EXAMPLE_STACK.map((t, i) => (
                <div key={t.name} className={`flex items-center gap-3 p-3 border-2 border-black text-black ${t.color}`}>
                  <span className="w-7 h-7 bg-black text-white text-xs font-black flex items-center justify-center flex-shrink-0">0{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">{t.name}</p>
                    <p className="text-xs text-black/60">{t.role}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 border border-black text-black ${t.difficulty === 'Beginner' ? 'bg-pastel-mint' : 'bg-pastel-yellow'}`}>{t.difficulty}</span>
                </div>
              ))}
              <button
                onClick={() => navigate('/stack-generator?idea=SaaS+invoice+tool+for+freelancers')}
                className="neo-btn neo-btn-primary w-full py-3 font-black text-sm flex items-center justify-center gap-2 mt-2"
              >
                Generate yours <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Example: Roast */}
          <div className="neo-card overflow-hidden border-4 border-red-600 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.4)] bg-foreground text-background">
            <div className="bg-red-600 p-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-background" />
              <div>
                <p className="font-black text-sm uppercase tracking-wide">Roast My Stack</p>
                <p className="text-xs opacity-75 font-mono">Notion, Zapier, Mailchimp, Airtable</p>
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm leading-relaxed text-background space-y-3">
                {EXAMPLE_ROAST.split('\n\n').map((block, i) => {
                  const [head, ...rest] = block.split('\n');
                  return (
                    <div key={i}>
                      <p className="font-black text-background text-sm">{head.replace(/\*\*/g, '')}</p>
                      <p className="text-background/80 text-xs mt-1 leading-relaxed">{rest.join(' ')}</p>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => navigate('/roast-my-stack')}
                className="neo-btn bg-background text-foreground w-full py-3 font-black text-sm flex items-center justify-center gap-2 mt-4"
              >
                Roast my stack <Flame className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>

          {/* Example: Dead Tool Savings */}
          <div className="neo-card overflow-hidden border-4 border-foreground shadow-[8px_8px_0px_0px_hsl(var(--foreground))]">
            <div className="bg-foreground text-background p-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <div>
                <p className="font-black text-sm uppercase tracking-wide">Dead Tool Detector</p>
                <p className="text-xs opacity-75 font-mono">Zapier, Mailchimp, Typeform</p>
              </div>
            </div>
            <div className="p-4">
              <div className="bg-pastel-mint border-2 border-black p-4 text-center mb-4 text-black">
                <p className="text-xs font-mono uppercase tracking-widest font-black text-muted-foreground">Annual Savings</p>
                <p className="text-5xl font-black italic">$1,752</p>
                <p className="text-xs font-bold text-muted-foreground mt-1">Per year · Forever free</p>
              </div>
              <div className="space-y-2">
                {EXAMPLE_SAVINGS.map(s => (
                  <div key={s.paid} className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-sm font-bold">{s.paid}</span>
                    <span className="text-xs text-muted-foreground mx-2">→</span>
                    <span className="text-sm font-black text-primary">{s.alt}</span>
                    <span className="text-xs font-black text-green-600 ml-auto">{s.saves}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/dead-tool-detector')}
                className="neo-btn neo-btn-primary w-full py-3 font-black text-sm flex items-center justify-center gap-2 mt-4"
              >
                Find my savings <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
