import React, { useState, useEffect } from "react";
import axios from "axios";
import { Star, ExternalLink } from "lucide-react";
import { API } from "../../utils/api";

export const CommunityStacks = () => {
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStacks = async () => {
      try {
        const res = await axios.get(`${API}/stacks/featured`);
        setStacks(res.data);
      } catch (e) {
        console.error("Error fetching featured stacks:", e);
      }
      setLoading(false);
    };
    fetchStacks();
  }, []);

  if (loading) {
    return (
      <section className="py-16 px-4 bg-pastel-lavender border-t-4 border-black">
        <div className="max-w-5xl mx-auto text-center py-12">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 bg-pastel-lavender border-t-4 border-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">What Founders Actually Used</h2>
        <p className="text-zinc-600 mb-8">Real tech stacks behind successful open-source projects.</p>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stacks.map(stack => (
            <a 
              key={stack.stack_id} 
              href={stack.repo_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-card p-6 bg-white block" 
              data-testid={`stack-${stack.stack_id}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-sm">
                  {stack.owner?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-bold">{stack.name}</h3>
                  <span className="text-xs text-primary hover:underline">
                    {stack.owner}
                  </span>
                </div>
              </div>
              <p className="text-sm text-zinc-500 mb-3">{stack.description}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {stack.tools.slice(0, 5).map((tool) => (
                  <span key={`${stack.stack_id}-${tool}`} className="text-xs px-2 py-1 bg-zinc-100 border border-zinc-200 font-mono">
                    {tool}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {stack.stars}
                </span>
                <span className="text-xs text-primary font-semibold flex items-center gap-1">
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
