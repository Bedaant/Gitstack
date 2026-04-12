import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Star, ExternalLink, Globe } from "lucide-react";
import { API } from "../../utils/api";

export const CommunityStacks = () => {
  const [featured, setFeatured] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStacks = async () => {
      try {
        const [featuredRes, publishedRes] = await Promise.allSettled([
          axios.get(`${API}/stacks/featured`),
          axios.get(`${API}/stacks/public`),
        ]);
        if (featuredRes.status === "fulfilled") setFeatured(featuredRes.value.data || []);
        if (publishedRes.status === "fulfilled") setPublished(publishedRes.value.data || []);
      } catch (e) {
        console.error("Error fetching stacks:", e);
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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 mb-1 font-black">Community</p>
            <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">What Founders Actually Used</h2>
            <p className="text-zinc-600 mt-1">Real tech stacks — from open-source repos and the GitStack community.</p>
          </div>
          <Link to="/stack-generator" className="neo-btn neo-btn-primary px-5 py-3 font-black text-sm whitespace-nowrap flex-shrink-0">
            Build Your Stack →
          </Link>
        </div>

        {/* User-published stacks */}
        {published.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-primary" />
              <p className="font-black text-sm uppercase tracking-wide text-primary">Shared by Founders</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {published.slice(0, 6).map((stack) => (
                <Link
                  key={stack.slug}
                  to={`/s/${stack.slug}`}
                  className="neo-card p-5 bg-white block hover:bg-pastel-yellow transition-colors border-2 border-black"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 bg-primary text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                      {(stack.idea || "S").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-sm leading-snug line-clamp-2">{stack.idea || "Untitled Stack"}</h3>
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">{stack.tools?.length || 0} tools</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(stack.tools || []).slice(0, 4).map((t, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-zinc-100 border border-zinc-200 font-mono">
                        {t.name || t}
                      </span>
                    ))}
                    {(stack.tools || []).length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 bg-zinc-100 border border-zinc-200 font-mono text-zinc-400">
                        +{stack.tools.length - 4}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Featured (GitHub-sourced) stacks */}
        {featured.length > 0 && (
          <div>
            {published.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
                <p className="font-black text-sm uppercase tracking-wide">Featured Open-Source Stacks</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map(stack => (
                <a
                  key={stack.stack_id}
                  href={stack.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo-card p-6 bg-white block hover:bg-pastel-yellow transition-colors"
                  data-testid={`stack-${stack.stack_id}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-bold text-sm">
                      {stack.owner?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold">{stack.name}</h3>
                      <span className="text-xs text-primary">{stack.owner}</span>
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
        )}
      </div>
    </section>
  );
};
