import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Linkedin, Mail, Github, Skull, Sparkles, BookOpen, Lightbulb, Flame, AlertTriangle, Scale, ShoppingBag, Briefcase, Shield, Loader2, CheckCircle2, Layout } from "lucide-react";
import axios from "axios";
import { API } from "../utils/api";

const productLinks = [
  { name: "Stack Generator", path: "/stack-generator", icon: Sparkles },
  { name: "Dead Tool Detector", path: "/dead-tool-detector", icon: Skull },
  { name: "Repo Translator", path: "/repo-translator", icon: BookOpen },
  { name: "Roast My Stack", path: "/roast-my-stack", icon: Flame },
  { name: "Your Idea Exists", path: "/idea-exists", icon: Lightbulb },
  { name: "Comparison Engine", path: "/compare", icon: Scale },
  { name: "Repo of the Day", path: "/repo-of-the-day", icon: Sparkles },
];

const navLinks = [
  { name: "Marketplace", path: "/marketplace", icon: ShoppingBag },
  { name: "Sell on GitStack", path: "/sell", icon: Briefcase },
  { name: "README Badge", path: "/readme-badge", icon: Shield },
  { name: "Collections", path: "/collections" },
  { name: "All Tools", path: "/tools" },
  { name: "Solutions Directory", path: "/solutions", icon: Layout },
  { name: "Founder Stacks", path: "/founder-stacks" },
];

const legalLinks = [
  { name: "About", path: "/about" },
  { name: "Terms", path: "/terms" },
  { name: "Privacy", path: "/privacy" },
];

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) return;
    setLoading(true);
    try {
      await axios.post(`${API}/newsletter/subscribe`, { email });
      setSubscribed(true);
    } catch {
      // silently fail in footer
    }
    setLoading(false);
  };

  return (
    <footer className="bg-foreground text-background border-t-4 border-primary">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo-white.svg" alt="GitStack" className="w-8 h-8" />
              <span className="text-xl font-extrabold tracking-tight">GitStack</span>
            </Link>
            <p className="text-sm text-background/70 leading-relaxed">
              The layer between GitHub tools existing and you actually using them. Built for non-tech founders.
            </p>
          </div>

          {/* AI Tools */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">AI Tools</h4>
            <ul className="space-y-2">
              {productLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-background/70 hover:text-background transition-colors flex items-center gap-2">
                    <link.icon className="w-3 h-3" /> {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">Explore</h4>
            <ul className="space-y-2">
              {navLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-background/70 hover:text-background transition-colors flex items-center gap-2">
                    {link.icon && <link.icon className="w-3 h-3" />} {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-background/50">Built By</h4>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm">Bedaant Srivastav</p>
                <div className="flex items-center gap-3 mt-1">
                  <a href="mailto:bedaantsrivastav2001@gmail.com" className="text-background/70 hover:text-background transition-colors" aria-label="Email Bedaant" data-testid="footer-email-bedaant">
                    <Mail className="w-4 h-4" />
                  </a>
                  <a href="https://www.linkedin.com/in/bedaant-srivastav-18510a120/" target="_blank" rel="noopener noreferrer" className="text-background/70 hover:text-background transition-colors" aria-label="LinkedIn Bedaant" data-testid="footer-linkedin-bedaant">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Atul Raj Sharan</p>
                <p className="text-xs text-background/60">Working Partner</p>
                <div className="flex items-center gap-3 mt-1">
                  <a href="https://www.linkedin.com/in/atul-raj-sharan-03b356a2/" target="_blank" rel="noopener noreferrer" className="text-background/70 hover:text-background transition-colors" aria-label="LinkedIn Atul" data-testid="footer-linkedin-atul">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-border pt-8 pb-6">
          <div className="max-w-xl mx-auto text-center">
            <p className="font-bold text-sm uppercase tracking-wider mb-3">Subscribe to GitStack Weekly</p>
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-bold">You're subscribed! See you Monday.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@startup.com"
                  className="flex-1 px-4 py-2 border-2 border-background bg-transparent text-background placeholder-background/50 font-semibold text-sm focus:border-primary outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="neo-btn neo-btn-primary px-4 py-2 text-sm font-black border-2 border-background"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Subscribe"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-background/60">
            GitStack {new Date().getFullYear()} — GitHub, simplified for founders
          </p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {legalLinks.map(l => (
              <Link key={l.path} to={l.path} className="text-xs text-background/70 hover:text-background transition-colors">
                {l.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-background/70 hover:text-background transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="mailto:bedaantsrivastav2001@gmail.com" className="text-background/70 hover:text-background transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
