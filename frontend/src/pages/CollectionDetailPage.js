import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Clock, Star, CheckCircle2, Github, ExternalLink } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function CollectionDetailPage() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollection = async () => {
      try {
        const res = await axios.get(`${API}/collections/${collectionId}`);
        setCollection(res.data.collection);
        setTools(res.data.tools);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchCollection();
  }, [collectionId]);

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

  if (!collection) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold mb-4">Collection not found</h1>
          <Link to="/collections" className="neo-btn neo-btn-primary px-6 py-2">Browse Collections</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate('/collections')} className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-black mb-6" data-testid="back-to-collections">
            <ArrowLeft className="w-4 h-4" /> Back to Collections
          </button>

          <div className={`neo-card p-8 mb-8 ${collection.bg_color || 'bg-pastel-mint'}`} data-testid="collection-header">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-3">{collection.title}</h1>
            <p className="text-lg text-zinc-600 mb-4">{collection.description}</p>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold px-3 py-1 ${
                collection.difficulty === 'Beginner' ? 'badge-beginner' : 
                collection.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
              }`}>
                {collection.difficulty}
              </span>
              <span className="text-sm text-zinc-500 flex items-center gap-1">
                <Clock className="w-4 h-4" /> {collection.completion_time}
              </span>
              <span className="text-sm text-zinc-500">{tools.length} tools</span>
            </div>
          </div>

          <p className="text-sm font-mono uppercase tracking-wider text-zinc-500 mb-6">
            Tools in this collection — follow in order
          </p>

          {tools.length > 0 ? (
            <div className="space-y-4">
              {tools.map((tool, i) => (
                <div key={tool.tool_id} className="neo-card p-6" data-testid={`collection-tool-${i}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold">{tool.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xs font-bold px-2 py-1 ${
                              tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                              tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                            }`}>
                              {tool.difficulty}
                            </span>
                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {tool.setup_time}
                            </span>
                            <span className="text-xs flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {tool.stars}
                            </span>
                          </div>
                        </div>
                        <a href={tool.github_url} target="_blank" rel="noopener noreferrer" className="neo-btn neo-btn-secondary px-3 py-1 text-xs">
                          <Github className="w-3 h-3 mr-1" /> GitHub
                        </a>
                      </div>

                      <p className="text-zinc-600 mb-4">{tool.description}</p>

                      {tool.setup_steps && tool.setup_steps.length > 0 && (
                        <div className="border-t-2 border-zinc-200 pt-4">
                          <h4 className="text-sm font-bold mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" /> Quick Setup
                          </h4>
                          <ol className="space-y-1">
                            {tool.setup_steps.slice(0, 3).map((step, j) => (
                              <li key={`step-${tool.tool_id}-${j}`} className="text-sm text-zinc-600 flex gap-2">
                                <span className="font-mono text-primary font-bold">{j + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                          <Link to={`/tools/${tool.tool_id}`} className="text-sm text-primary font-semibold mt-2 inline-flex items-center gap-1 hover:underline">
                            Full setup guide <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="neo-card p-8 text-center bg-pastel-yellow">
              <p className="text-zinc-600">No tools found for this collection. The tools may not be seeded yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
