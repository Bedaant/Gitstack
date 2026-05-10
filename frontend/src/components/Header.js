import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ChevronDown, Bookmark, BookOpen, Sparkles, Briefcase } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { getLocalStacks } from "../utils/localStacks";
import { useAuth } from "../context/AuthContext";
import { UserMenu } from "./UserMenu";

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [stackCount, setStackCount] = useState(0);
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const refresh = () => setStackCount(getLocalStacks().length);
    refresh();
    // Listen for stack changes from other parts of the app
    window.addEventListener("stacksUpdated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("stacksUpdated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 isolate bg-background border-b-4 border-foreground py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="GitStack" className="w-10 h-10 dark:invert" />
          <span className="text-2xl font-extrabold tracking-tight">GitStack</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {/* Repo Translator promoted to top nav — flagship feature */}
          <Link to="/repo-translator" className="font-semibold hover:text-primary transition-colors flex items-center gap-1.5" data-testid="nav-translator">
            <BookOpen className="w-4 h-4" /> Translate Repo
          </Link>
          <Link to="/marketplace" className="font-semibold hover:text-primary transition-colors">Marketplace</Link>
          <Link to="/sell" className="font-semibold hover:text-primary transition-colors flex items-center gap-1.5" data-testid="nav-sell">
            <Briefcase className="w-4 h-4" /> Sell
          </Link>
          <Link to="/tools" className="font-semibold hover:text-primary transition-colors" data-testid="nav-tools">Tools</Link>
          <Link to="/collections" className="font-semibold hover:text-primary transition-colors" data-testid="nav-collections">Collections</Link>
          <Link to="/dashboard" className="font-semibold hover:text-primary transition-colors flex items-center gap-1.5" data-testid="nav-my-stacks">
            <Bookmark className="w-4 h-4" />
            My Stacks
            {stackCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-black px-1.5 py-0.5 leading-none">{stackCount}</span>
            )}
          </Link>
          <div className="relative group">
            <button className="font-semibold hover:text-primary transition-colors flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> AI Tools <ChevronDown className="w-4 h-4" />
            </button>
            <div className="absolute top-full -left-4 pt-2 hidden group-hover:block" style={{ zIndex: 9999 }}>
              <div 
                className="bg-background border-4 border-foreground neo-shadow-lg w-64 p-2 relative"
              >
                <Link to="/repo-xray" className="block p-2 hover:bg-pastel-lavender hover:text-black font-bold text-sm border-b-2 border-border last:border-0 flex items-center justify-between">Repo X-Ray <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">NEW</span></Link>
                <Link to="/readme-badge" className="block p-2 hover:bg-pastel-purple hover:text-black font-bold text-sm border-b-2 border-border last:border-0 flex items-center justify-between">README Badge <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">NEW</span></Link>
                <Link to="/dead-tool-detector" className="block p-2 hover:bg-pastel-pink hover:text-black font-bold text-sm border-b-2 border-border last:border-0">Dead Tool Detector</Link>
                <Link to="/roast-my-stack" className="block p-2 hover:bg-pastel-yellow hover:text-black font-bold text-sm border-b-2 border-border last:border-0">Roast My Stack</Link>
                <Link to="/idea-exists" className="block p-2 hover:bg-pastel-mint hover:text-black font-bold text-sm border-b-2 border-border last:border-0">Your Idea Exists</Link>
                <Link to="/compare" className="block p-2 hover:bg-pastel-lavender hover:text-black font-bold text-sm border-b-2 border-border last:border-0">Tool Comparison</Link>
                <Link to="/repo-of-the-day" className="block p-2 hover:bg-pastel-yellow hover:text-black font-bold text-sm">Repo of the Day</Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-2">
            Build Stack
          </Link>
          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={login}
              className="border-2 border-foreground px-4 py-2 text-sm font-bold hover:bg-foreground hover:text-background transition-colors"
              data-testid="header-login"
            >
              Login
            </button>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-4 border-foreground bg-background p-4">
          <nav className="flex flex-col gap-3">
            {/* Primary CTAs at top on mobile */}
            <Link to="/stack-generator" className="neo-btn neo-btn-primary py-3 text-center font-black" onClick={() => setMobileOpen(false)}>
              ✨ Build Stack
            </Link>
            <Link to="/repo-translator" className="neo-btn py-3 text-center font-black bg-pastel-mint text-black border-2 border-black" onClick={() => setMobileOpen(false)}>
              📖 Translate Repo
            </Link>
            <div className="border-t-2 border-border my-1"></div>
            <Link to="/marketplace" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Marketplace</Link>
            <Link to="/sell" className="font-semibold text-lg flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Briefcase className="w-5 h-5" /> Sell on GitStack
            </Link>
            <Link to="/tools" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Tools</Link>
            <Link to="/collections" className="font-semibold text-lg" onClick={() => setMobileOpen(false)}>Collections</Link>
            <Link to="/dashboard" className="font-semibold text-lg flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <Bookmark className="w-5 h-5" /> My Stacks {stackCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-black px-2 py-0.5">{stackCount}</span>}
            </Link>
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-2">More AI Tools</p>
            <Link to="/repo-xray" className="font-semibold flex items-center gap-2" onClick={() => setMobileOpen(false)}>Repo X-Ray <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">NEW</span></Link>
            <Link to="/readme-badge" className="font-semibold flex items-center gap-2" onClick={() => setMobileOpen(false)}>README Badge <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 leading-none">NEW</span></Link>
            <Link to="/dead-tool-detector" className="font-semibold" onClick={() => setMobileOpen(false)}>Dead Tool Detector</Link>
            <Link to="/roast-my-stack" className="font-semibold" onClick={() => setMobileOpen(false)}>Roast My Stack</Link>
            <Link to="/idea-exists" className="font-semibold" onClick={() => setMobileOpen(false)}>Your Idea Exists</Link>
            <Link to="/compare" className="font-semibold" onClick={() => setMobileOpen(false)}>Tool Comparison</Link>
            <Link to="/repo-of-the-day" className="font-semibold" onClick={() => setMobileOpen(false)}>Repo of the Day</Link>
            <div className="flex items-center justify-between">
              <ThemeToggle />
            </div>
            <div className="border-t-2 border-border pt-4 mt-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <img
                    src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-foreground"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{user.name}</p>
                    <button onClick={() => { logout(); setMobileOpen(false); }} className="text-sm text-primary font-semibold">Logout</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { login(); setMobileOpen(false); }} className="w-full neo-btn neo-btn-primary py-3">Login</button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
