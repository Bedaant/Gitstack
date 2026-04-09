import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Star, Clock } from "lucide-react";
import { Header } from "../components/Header";
import { API } from "../utils/api";

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await axios.get(`${API}/tools`, { params: { limit: 100 } });
        setTools(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTools();
  }, []);

  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2" data-testid="tools-page-title">
            All Tools
          </h1>
          <p className="text-zinc-500 mb-8">127 open-source tools, explained in plain English.</p>

          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="neo-input pl-12"
              data-testid="tools-search"
            />
          </div>

          {loading ? (
            <div className="text-center py-16">
              <div className="spinner mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTools.map(tool => (
                <button
                  key={tool.tool_id}
                  onClick={() => navigate(`/tools/${tool.tool_id}`)}
                  className="neo-card p-6 text-left"
                  data-testid={`tool-card-${tool.tool_id}`}
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
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {tool.setup_time}
                    </span>
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
