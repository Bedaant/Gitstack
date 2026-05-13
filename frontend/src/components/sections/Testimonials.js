import React from "react";
import { Quote, Star, Users } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "Built my entire CRM stack for $0. GitStack translated repos I would have never found on my own. The plain English breakdowns are game-changing.",
    name: "Arjun Mehta",
    role: "Indie Founder",
    color: "bg-pastel-mint",
    rating: 5,
  },
  {
    quote: "Replaced Zapier, Mailchimp, and Typeform in one weekend using GitStack's stack generator. Saved $2,100 per year and actually own my data now.",
    name: "Priya Kapoor",
    role: "SaaS Founder",
    color: "bg-pastel-yellow",
    rating: 5,
  },
  {
    quote: "As a non-technical founder, I finally understand what GitHub repos actually do. GitStack is like having a technical co-founder who explains everything.",
    name: "Rahul Sharma",
    role: "Product Manager",
    color: "bg-pastel-lavender",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section className="py-16 px-4 bg-muted border-y-4 border-foreground">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2 font-black flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> Beta Founder Feedback
          </p>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
            Founders who actually ship
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Real stories from early users. Want to be featured here?{" "}
            <a href="mailto:hello@gitstack.pro" className="underline font-bold text-primary">
              Share your story
            </a>.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className={`neo-card p-6 ${t.color} text-black border-4 border-black shadow-[6px_6px_0px_0px_#000] flex flex-col`}
            >
              <Quote className="w-8 h-8 mb-4 opacity-40" />
              <p className="text-sm font-medium leading-relaxed flex-1 mb-6">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-black text-black" />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs text-black/70 font-medium">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
