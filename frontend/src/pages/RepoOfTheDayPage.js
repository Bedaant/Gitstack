import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Sparkles, Star, Github, ArrowRight, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { API } from "../utils/api";
import { formatContent } from "../utils/sanitize";

export default function RepoOfTheDayPage() {
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleShare = (r) => {
    const text = `Today's Repo of the Day on GitStack: ${r.name}\n${r.description}\n\n${r.html_url}\n\nDiscover open-source tools: ${window.location.origin}/repo-of-the-day`;
    if (navigator.share) {
      navigator.share({ title: `Repo of the Day: ${r.name}`, text, url: r.html_url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
  };

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
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!repo) return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-4xl mx-auto py-20 px-4 text-center">
        <h1 className="text-3xl font-bold">No repo featured for today!</h1>
        <p className="mt-4 text-zinc-500">Check back tomorrow.</p>
        <Link to="/" className="neo-btn neo-btn-primary px-6 py-3 mt-8 inline-block">Go Home</Link>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pastel-yellow border-4 border-black neo-shadow-lg mb-6">
              <Sparkles className="w-10 h-10" strokeWidth={2} />
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4" data-testid="repo-day-title">
              Repo of the Day
            </h1>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Every day we feature one amazing open-source project and translate it for you.
            </p>
          </div>

          <div className="neo-card p-8 bg-white" data-testid="repo-day-content">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-3xl font-black">{repo.name}</h3>
                <p className="text-sm font-mono text-zinc-500">{repo.full_name}</p>
                <p className="text-xs text-zinc-400 mt-1 uppercase font-bold tracking-widest">{new Date(repo.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="flex items-center gap-1 text-lg font-black">
                  <Star className="w-5 h-5 text-yellow-500" fill="currentColor" /> {repo.stars?.toLocaleString()}
                </span>
                <span className="text-sm font-mono bg-zinc-100 px-3 py-1 border-2 border-black">{repo.language}</span>
              </div>
            </div>
            
            <p className="text-xl text-zinc-700 mb-8 border-l-4 border-primary pl-4 italic">
              {repo.description}
            </p>
            
            {repo.translation && (
              <div className="bg-zinc-50 border-4 border-black p-8 neo-shadow mb-8">
                <div 
                  className="prose-gitstack"
                  dangerouslySetInnerHTML={{ __html: formatContent(repo.translation) }} 
                />
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="neo-btn neo-btn-primary px-8 py-4 flex-1 text-center"
              >
                <Github className="w-5 h-5 mr-3" /> View Repo on GitHub
              </a>
              <Link to={`/repo/${repo.full_name}`} className="neo-btn neo-btn-secondary px-8 py-4 flex-1 text-center">
                Full Technical Details <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <button
                onClick={() => handleShare(repo)}
                className="neo-btn neo-btn-secondary px-8 py-4 sm:flex-none flex items-center justify-center gap-2"
                data-testid="share-repo-day"
              >
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
