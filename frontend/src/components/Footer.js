import React from "react";
import { Link } from "react-router-dom";
import { Linkedin, Mail, Github, Skull, Sparkles, BookOpen, Lightbulb, Flame, AlertTriangle, Scale } from "lucide-react";

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
  { name: "Collections", path: "/collections" },
  { name: "All Tools", path: "/tools" },
  { name: "Trending", path: "/#trending" },
  { name: "Founder Stacks", path: "/founder-stacks" },
];

export const Footer = () => {
  return (
    <footer className="bg-black text-white border-t-4 border-primary">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <img src="/logo-white.svg" alt="GitStack" className="w-8 h-8" />
              <span className="text-xl font-extrabold tracking-tight">GitStack</span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed">
              The layer between GitHub tools existing and you actually using them. Built for non-tech founders.
            </p>
          </div>

          {/* AI Tools */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-zinc-300">AI Tools</h4>
            <ul className="space-y-2">
              {productLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                    <link.icon className="w-3 h-3" /> {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-zinc-300">Explore</h4>
            <ul className="space-y-2">
              {navLinks.map(link => (
                <li key={link.path}>
                  <Link to={link.path} className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Team */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider mb-4 text-zinc-300">Built By</h4>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-sm">Bedaant Srivastav</p>
                <div className="flex items-center gap-3 mt-1">
                  <a href="mailto:bedaantsrivastav2001@gmail.com" className="text-zinc-400 hover:text-white transition-colors" aria-label="Email Bedaant" data-testid="footer-email-bedaant">
                    <Mail className="w-4 h-4" />
                  </a>
                  <a href="https://www.linkedin.com/in/bedaant-srivastav-18510a120/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors" aria-label="LinkedIn Bedaant" data-testid="footer-linkedin-bedaant">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Atul Raj Sharan</p>
                <p className="text-xs text-zinc-500">Working Partner</p>
                <div className="flex items-center gap-3 mt-1">
                  <a href="https://www.linkedin.com/in/atul-raj-sharan-03b356a2/" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors" aria-label="LinkedIn Atul" data-testid="footer-linkedin-atul">
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-zinc-500">
            GitStack {new Date().getFullYear()} — GitHub, simplified for founders
          </p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">
              <Github className="w-4 h-4" />
            </a>
            <a href="mailto:bedaantsrivastav2001@gmail.com" className="text-zinc-500 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
