import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Sparkles, Star, Github, ArrowRight } from "lucide-react";
import { API } from "../../utils/api";
import { formatContent } from "../../utils/sanitize";

export const RepoOfTheDay = () => {
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepoOfDay = async () => {
      try {
        const res = await axios.get(`${API}/repo-of-the-day`);
        setRepo(res.data);
      } catch (e) {
        console.error("Error fetching repo of the day:", e);
      }
      setLoading(false);
    };
    fetchRepoOfDay();
  }, []);

  if (loading) {
    return (
      <section className="py-12 px-4 bg-pastel-yellow border-y-4 border-black">
        <div className="max-w-5xl mx-auto text-center py-8">
          <div className="spinner mx-auto"></div>
        </div>
      </section>
    );
  }

  if (!repo) return null;

  return (
    <section className="py-12 px-4 bg-pastel-yellow border-y-4 border-black text-black">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-foreground text-background flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Repo of the Day</h2>
            <p className="text-sm opacity-70">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        
        <div className="neo-card p-8 bg-background">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-black">{repo.name}</h3>
              <p className="text-sm font-mono text-muted-foreground">{repo.full_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-sm font-semibold">
                <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {repo.stars?.toLocaleString()}
              </span>
              <span className="text-xs font-mono bg-muted px-2 py-1 border border-border">{repo.language}</span>
            </div>
          </div>
          
          <p className="text-muted-foreground mb-6">{repo.description}</p>
          
          {repo.translation && (
            <div className="border-t-2 border-foreground pt-6">
              <div 
                className="prose-gitstack text-sm"
                dangerouslySetInnerHTML={{
                  __html: formatContent(
                    (repo.translation?.slice(0, 800) ?? '') +
                    (repo.translation?.length > 800 ? '...' : '')
                  )
                }} 
              />
            </div>
          )}
          
          <div className="flex gap-4 mt-6">
            <a 
              href={repo.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-btn neo-btn-primary px-6 py-2"
            >
              <Github className="w-5 h-5 mr-2" /> View on GitHub
            </a>
            <Link to={`/repo/${repo.full_name}`} className="neo-btn neo-btn-secondary px-6 py-2">
              Full Translation <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
