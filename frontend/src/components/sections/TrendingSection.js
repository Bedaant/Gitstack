import React, { useState, useEffect } from "react";
import axios from "axios";
import { Star, ExternalLink, TrendingUp } from "lucide-react";
import { API } from "../../utils/api";

const tabs = [
  { id: 'top_week', label: 'Top this week' },
  { id: 'top_day', label: 'Today' },
  { id: 'top_month', label: 'This month' },
  { id: 'new_rising', label: 'New & rising' }
];

export const TrendingSection = () => {
  const [activeTab, setActiveTab] = useState('top_week');
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/tools/trending/list`, { params: { tab: activeTab } });
        setTools(res.data);
      } catch (e) {
        console.error("Error fetching trending:", e);
      }
      setLoading(false);
    };
    fetchTrending();
  }, [activeTab]);

  return (
    <section className="py-16 px-4 border-t-4 border-foreground">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Trending Now</h2>
            <p className="text-muted-foreground mt-1">Live from GitHub — updated every 6 hours.</p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 font-semibold text-sm border-2 border-foreground transition-all ${
                  activeTab === tab.id ? 'bg-foreground text-background' : 'bg-background hover:bg-pastel-yellow hover:text-black'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-0 border-2 border-foreground">
            {tools.slice(0, 10).map((tool, i) => (
              <button
                key={tool.tool_id || tool.full_name}
                onClick={() => {
                  if (tool.full_name) {
                    window.location.href = `/repo/${tool.full_name}`;
                  } else if (tool.github_url) {
                    window.open(tool.github_url, '_blank');
                  }
                }}
                className="w-full flex items-center gap-4 p-4 hover:bg-pastel-yellow hover:text-black transition-colors border-b-2 border-black last:border-b-0 text-left"
                data-testid={`trending-${i}`}
              >
                <span className="font-mono text-xl font-bold text-muted-foreground w-8">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold flex items-center gap-2">
                    {tool.name}
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">{tool.description}</p>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <span className="text-xs font-mono bg-muted px-2 py-1 border border-border">{tool.language}</span>
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Star className="w-4 h-4 text-yellow-500" fill="currentColor" /> {tool.stars}
                  </span>
                  {tool.today_stars && (
                    <span className="text-xs text-green-600 font-semibold">
                      <TrendingUp className="w-3 h-3 inline" /> {tool.today_stars}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
