import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles, Package, Share2, Trash2, BookmarkCheck } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getLocalStacks, deleteLocalStack } from "../utils/localStacks";

export default function Dashboard() {
  const [stacks, setStacks] = useState([]);

  useEffect(() => {
    setStacks(getLocalStacks());
  }, []);

  const handleDelete = (stackId, stackName) => {
    deleteLocalStack(stackId);
    setStacks(getLocalStacks());
    toast.success(`"${stackName.slice(0, 40)}" removed.`);
  };

  const handleShare = (stack) => {
    const text = `My stack for "${stack.name}":\n${stack.tools.map((t, i) => `${i + 1}. ${t.name} — ${t.description}`).join('\n')}\n\nBuilt with GitStack: ${window.location.origin}/stack-generator`;
    if (navigator.share) {
      navigator.share({ title: `My Stack: ${stack.name}`, text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Stack copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="py-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight" data-testid="dashboard-title">
                My Stacks
              </h1>
              <p className="text-zinc-500 mt-1">Your saved stacks — stored locally in this browser.</p>
            </div>
            <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3" data-testid="new-stack-btn">
              <Sparkles className="w-5 h-5 mr-2" /> Generate New Stack
            </Link>
          </div>

          {stacks.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow">
              <Package className="w-16 h-16 mx-auto mb-4 text-zinc-400" />
              <h2 className="text-2xl font-bold mb-2">No stacks saved yet</h2>
              <p className="text-zinc-600 mb-6">Generate a stack and hit "Save Stack" to keep it here.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3">
                Generate My First Stack
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {stacks.map(stack => (
                <div key={stack.stack_id} className="neo-card p-6" data-testid={`my-stack-${stack.stack_id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-lg leading-tight line-clamp-2">{stack.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1 font-mono">
                        {new Date(stack.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <BookmarkCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {stack.tools.slice(0, 4).map(t => (
                      <span key={t.name} className="text-xs font-mono bg-zinc-100 border border-zinc-200 px-2 py-0.5">
                        {t.name}
                      </span>
                    ))}
                    {stack.tools.length > 4 && (
                      <span className="text-xs font-mono text-zinc-400 px-1">+{stack.tools.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-zinc-100 pt-3">
                    <Link
                      to={`/stack-generator?idea=${encodeURIComponent(stack.idea)}`}
                      className="neo-btn neo-btn-primary px-4 py-2 text-sm flex-1 justify-center"
                    >
                      <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                    </Link>
                    <button
                      onClick={() => handleShare(stack)}
                      className="neo-btn neo-btn-secondary px-3 py-2 text-sm"
                      data-testid={`share-stack-${stack.stack_id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(stack.stack_id, stack.name)}
                      className="neo-btn px-3 py-2 text-sm border-red-300 text-red-500 hover:bg-red-50"
                      data-testid={`delete-stack-${stack.stack_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
