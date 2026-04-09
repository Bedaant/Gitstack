import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Star } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function TopicToolsPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopicTools = async () => {
      try {
        const res = await axios.get(`${API}/topics/${topicId}/tools`);
        setTopic(res.data.topic);
        setTools(res.data.tools);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTopicTools();
  }, [topicId]);

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

  if (!topic) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-32">
          <h1 className="text-2xl font-bold">Topic not found</h1>
          <Link to="/tools" className="neo-btn neo-btn-primary mt-4 px-6 py-2">Browse All Tools</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className={`neo-card p-8 mb-8 ${topic.bg_color}`}>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="topic-title">
              {topic.name}
            </h1>
            <p className="text-zinc-600">{tools.length} tools in this category</p>
          </div>

          {tools.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-500">No tools found in this category yet.</p>
              <Link to="/tools" className="neo-btn neo-btn-primary mt-4 px-6 py-2">Browse All Tools</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {tools.map(tool => (
                <button
                  key={tool.tool_id}
                  onClick={() => tool.github_url ? window.open(tool.github_url, '_blank') : navigate(`/tools/${tool.tool_id}`)}
                  className="neo-card p-6 text-left"
                  data-testid={`tool-${tool.tool_id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg">{tool.name}</h3>
                    <span className={`text-xs font-bold px-2 py-1 ${
                      tool.difficulty === 'Beginner' ? 'badge-beginner' : 
                      tool.difficulty === 'Intermediate' ? 'badge-intermediate' : 'badge-advanced'
                    }`}>
                      {tool.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 mb-3 line-clamp-2">{tool.description}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="font-mono bg-zinc-100 px-2 py-1 border border-zinc-200">{tool.language}</span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-500" fill="currentColor" /> {tool.stars}
                    </span>
                    {tool.source === 'github' && (
                      <span className="text-xs text-green-600 font-semibold">LIVE</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
