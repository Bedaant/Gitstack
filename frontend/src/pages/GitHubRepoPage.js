import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Star, Clock, Sparkles, Github, Share2 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { formatContent } from "../utils/sanitize";
import { API } from "../utils/api";

export default function GitHubRepoPage() {
  const { owner, repo } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        const res = await axios.get(`${API}/ai/translate-repo/${owner}/${repo}`);
        setData(res.data);
      } catch (e) {
        setError("Failed to translate repository");
        console.error(e);
      }
      setLoading(false);
    };
    fetchTranslation();
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex flex-col items-center justify-center py-32">
          <div className="spinner mb-4"></div>
          <p className="font-bold text-lg">Translating to plain English...</p>
          <p className="text-zinc-500">Reading the README and analyzing</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold mb-4">Repository not found</h1>
          <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-primary px-6 py-2">
            View on GitHub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="neo-card p-8 mb-8" data-testid="github-repo-detail">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black mb-2">{data.name}</h1>
                <p className="text-zinc-500 font-mono text-sm mb-4">{data.full_name}</p>
                <div className="flex flex-wrap items-center gap-3">
                  {data.difficulty && (
                    <span className={`text-sm font-bold px-3 py-1 ${
                      data.difficulty === 'Beginner' ? 'badge-beginner' :
                      data.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {data.difficulty}
                    </span>
                  )}
                  {data.setup_time && (
                    <span className="flex items-center gap-1 text-sm text-zinc-500">
                      <Clock className="w-4 h-4" /> {data.setup_time}
                    </span>
                  )}
                  {data.stars > 0 && (
                    <span className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {data.stars?.toLocaleString()}
                    </span>
                  )}
                  {data.forks > 0 && (
                    <span className="text-sm text-zinc-500">{data.forks?.toLocaleString()} forks</span>
                  )}
                </div>
              </div>
              <a 
                href={data.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="neo-btn neo-btn-secondary px-4 py-2"
                data-testid="github-link"
              >
                <Github className="w-5 h-5 mr-2" /> View on GitHub
              </a>
            </div>

            {data.description && (
              <p className="text-lg text-zinc-600 mb-6 italic">"{data.description}"</p>
            )}

            {data.topics && data.topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {data.topics.map((topic) => (
                  <span key={topic} className="text-xs font-mono px-2 py-1 bg-zinc-100 border border-zinc-200">
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="neo-card p-8 bg-pastel-mint" data-testid="ai-translation">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Plain English Explanation
            </h2>
            <div 
              className="prose-gitstack"
              dangerouslySetInnerHTML={{ __html: formatContent(data.translation) }} 
            />
          </div>

          <div className="flex gap-4 mt-8">
            <a 
              href={data.html_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="neo-btn neo-btn-primary px-6 py-3 flex-1 justify-center"
            >
              <Github className="w-5 h-5 mr-2" /> Start Using This Tool
            </a>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`Check out ${data.name}: ${data.html_url}`);
                toast.success("Link copied!");
              }}
              className="neo-btn neo-btn-secondary px-6 py-3"
              data-testid="share-repo"
            >
              <Share2 className="w-5 h-5 mr-2" /> Share
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

