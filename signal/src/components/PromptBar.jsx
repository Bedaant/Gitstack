import React, { useState } from 'react';
import { Send, Zap, RotateCcw } from 'lucide-react';

export default function PromptBar({ onGenerate, hasTrace, onNew }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setTimeout(() => {
      onGenerate(prompt);
      setLoading(false);
    }, 600);
  };

  return (
    <header className="border-b border-signal-border px-5 py-3 flex items-center gap-4 bg-[#0a0a0c]">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-signal-purple flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight hidden sm:block">Claude Signal</span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex gap-2 max-w-2xl">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={hasTrace ? "Ask a follow-up or try a new prompt..." : "Describe what you want to build..."}
          className="flex-1 bg-signal-card border border-signal-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-signal-purple/40 placeholder-gray-500 transition-all"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="signal-btn-primary flex items-center gap-1.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Generate
        </button>
      </form>

      {hasTrace && onNew && (
        <button
          onClick={onNew}
          className="signal-btn-ghost text-sm flex items-center gap-1.5 shrink-0"
          title="New session"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      )}
    </header>
  );
}
