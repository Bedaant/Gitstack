import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, Bookmark } from "lucide-react";
import { getLocalStacks } from "../utils/localStacks";

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stackCount, setStackCount] = useState(0);

  useEffect(() => {
    setStackCount(getLocalStacks().length);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b-4 border-black py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="GitStack" className="w-10 h-10" />
          <span className="text-2xl font-extrabold tracking-tight">GitStack</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          <Link to="/collections" className="font-semibold hover:text-primary transition-colors" data-testid="nav-collections">Collections</Link>
          <Link to="/tools" className="font-semibold hover:text-primary transition-colors" data-testid="nav-tools">Tools</Link>
          <Link to="/dashboard" className="font-semibold hover:text-primary transition-colors flex items-center gap-1.5" data-testid="nav-my-stacks">
            <Bookmark className="w-4 h-4" />
            My Stacks
            {stackCount > 0 && (
              <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 leading-none">{stackCount}</span>
            )}
          </Link>
          <div className="relative group">
            <button className="font-semibold hover:text-primary transition-colors flex items-center gap-1">
              Labs <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute top-full -left-4 pt-2 hidden group-hover:block z-50">
              <div className="bg-white border-4 border-black neo-shadow-lg w-64 p-2">
                <Link to="/dead-tool-detector" className="block p-2 hover:bg-pastel-pink font-bold text-sm border-b-2 border-zinc-100 last:border-0">Dead Tool Detector</Link>
                <Link to="/repo-translator" className="block p-2 hover:bg-blue-100 font-bold text-sm border-b-2 border-zinc-100 last:border-0">Repo Translator</Link>
                <Link to="/roast-my-stack" className="block p-2 hover:bg-pastel-yellow font-bold text-sm border-b-2 border-zinc-100 last:border-0">Roast My Stack</Link>
                <Link to="/idea-exists" className="block p-2 hover:bg-pastel-mint font-bold text-sm border-b-2 border-zinc-100 last:border-0">Your Idea Exists</Link>
                <Link to="/compare" className="block p-2 hover:bg-pastel-lavender font-bold text-sm border-b-2 border-zinc-100 last:border-0">Tool Comparison</Link>
                <Link to="/repo-of-the-day" className="block p-2 hover:bg-pastel-yellow font-bold text-sm">Repo of the Day</Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-2">
            Build Stack
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4">
          <nav className="flex flex-col gap-4">
            <Link to="/collections" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Collections</Link>
            <Link to="/tools" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Tools</Link>
            <Link to="/stack-generator" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Stack Generator</Link>
            <Link to="/dashboard" className="font-semibold text-lg flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Bookmark className="w-5 h-5" /> My Stacks {stackCount > 0 && <span className="bg-primary text-white text-xs font-black px-2 py-0.5">{stackCount}</span>}
            </Link>
            <Link to="/dead-tool-detector" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Dead Tool Detector</Link>
            <Link to="/repo-translator" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Repo Translator</Link>
            <Link to="/roast-my-stack" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Roast My Stack</Link>
            <Link to="/idea-exists" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Your Idea Exists</Link>
            <Link to="/compare" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Tool Comparison</Link>
            <Link to="/repo-of-the-day" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Repo of the Day</Link>
          </nav>
        </div>
      )}
    </header>
  );
};
