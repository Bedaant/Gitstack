import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Search, Lightbulb, Loader2, Star, Github } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function IdeaExists() {
  const [idea, setIdea] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!idea.trim()) return;
    
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.post(`${API}/ai/idea-exists`, { idea });
      setResults(res.data);
    } catch (e) {
      toast.error("Failed to search for similar projects");
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-mint border-4 border-black neo-shadow-lg mb-6">
              <Lightbulb className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="idea-exists-title">
              Your Idea Already Exists
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              That's a good thing! Find open-source projects you can build on top of, fork, or get inspired by.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-12">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="I want to build a marketplace for freelancers to sell digital products like templates and courses..."
              className="neo-input h-32 resize-none mb-4"
              data-testid="idea-input"
            />
            <button 
              type="submit" 
              disabled={loading || !idea.trim()}
              className="neo-btn neo-btn-primary px-8 py-4 w-full text-lg disabled:opacity-50"
              data-testid="idea-submit"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Search className="w-6 h-6 mr-2" /> Find Similar Projects</>}
            </button>
          </form>

          {loading && (
            <div className="text-center py-16">
              <div className="spinner mx-auto mb-4"></div>
              <p className="font-bold text-lg">Searching GitHub...</p>
              <p className="text-zinc-500">Finding projects you can build on</p>
            </div>
          )}

          {results && results.similar_projects?.length > 0 && (
            <div className="space-y-6">
              <div className="neo-card p-6 bg-pastel-mint text-center">
                <p className="text-sm font-mono uppercase tracking-widest mb-1">Found</p>
                <p className="text-4xl font-black">{results.count} Similar Projects</p>
                <p className="text-sm text-zinc-600 mt-2">Build on these instead of starting from scratch!</p>
              </div>

              <div className="space-y-4">
                {results.similar_projects.map((project) => (
                  <div key={`${project.name}-${project.full_name}`} className="neo-card p-6" data-testid={`similar-project-${project.name}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold">{project.name}</h3>
                        <p className="text-sm font-mono text-zinc-500">{project.full_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-zinc-100 px-2 py-1 border border-black">{project.language}</span>
                        <span className="flex items-center gap-1 text-sm font-semibold">
                          <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {project.stars}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-zinc-600 mb-4">{project.description}</p>
                    
                    <div className="border-t-2 border-zinc-200 pt-4 mt-4">
                      <p className="text-sm mb-2"><strong>Why it's relevant:</strong> {project.whyRelevant}</p>
                      <p className="text-sm text-primary"><strong>How to use it:</strong> {project.howToUse}</p>
                    </div>
                    
                    <div className="flex gap-3 mt-4">
                      <a 
                        href={project.githubUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="neo-btn neo-btn-secondary px-4 py-2 text-sm"
                      >
                        <Github className="w-4 h-4 mr-2" /> View Repo
                      </a>
                      <Link 
                        to={`/repo/${project.full_name}`}
                        className="neo-btn neo-btn-primary px-4 py-2 text-sm"
                      >
                        Full Translation
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results && results.similar_projects?.length === 0 && (
            <div className="neo-card p-12 text-center bg-pastel-yellow">
              <Lightbulb className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No exact matches found!</h2>
              <p className="text-zinc-600">Your idea might be unique. Try the Stack Generator to find tools to build it.</p>
              <Link to="/stack-generator" className="neo-btn neo-btn-primary px-6 py-3 mt-6 inline-flex">
                Generate My Stack
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
