import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Star, ExternalLink, Users } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";

export default function FounderStacks() {
  const [stacks, setStacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStacks = async () => {
      try {
        const res = await axios.get(`${API}/stacks/featured`);
        setStacks(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchStacks();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="py-12 px-4 flex-1">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-lavender border-4 border-black neo-shadow-lg mb-6 text-black">
              <Users className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="founder-stacks-title">
              What Founders Actually Used
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real tech stacks behind successful open-source projects. Copy them, fork them, build on them.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : stacks.length === 0 ? (
            <div className="neo-card p-12 text-center bg-pastel-yellow text-black">
              <p className="font-bold text-lg">No stacks available yet</p>
              <p className="opacity-70 mt-2">Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stacks.map(stack => (
                <a
                  key={stack.stack_id}
                  href={stack.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo-card p-6 bg-background block hover:border-primary transition-colors"
                  data-testid={`founder-stack-${stack.stack_id}`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center font-bold text-lg">
                      {stack.owner?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{stack.name}</h3>
                      <span className="text-sm text-primary">{stack.owner}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">{stack.description}</p>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {stack.tools.map(tool => (
                      <span key={`${stack.stack_id}-${tool}`} className="text-xs px-2 py-1 bg-muted border border-border font-mono">
                        {tool}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-border">
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {stack.stars}
                    </span>
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      View on GitHub <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link to="/stack-generator" className="neo-btn neo-btn-primary px-8 py-4 text-lg">
              Generate Your Own Stack
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
