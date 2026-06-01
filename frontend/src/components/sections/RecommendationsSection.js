import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const ToolChip = ({ tool }) => (
  <Link
    to={`/tools/${tool.tool_id || tool.id || tool.name}`}
    className="block border-2 border-foreground p-4 neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background"
  >
    <div className="font-bold text-sm mb-1 line-clamp-1">{tool.name}</div>
    <div className="text-xs text-muted-foreground line-clamp-2">{tool.description}</div>
    {tool.stars && (
      <div className="text-xs text-muted-foreground mt-1">⭐ {tool.stars}</div>
    )}
  </Link>
);

export const RecommendationsSection = () => {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        if (user) {
          const res = await axios.get(`${API}/recommendations`, { withCredentials: true });
          const recs = res.data.recommendations || [];
          if (recs.length > 0) {
            setTools(recs);
            setIsFallback(false);
            return;
          }
        }
        // Fallback: show popular tools for new/unauthed users
        const res = await axios.get(`${API}/tools`, { params: { limit: 6, sort: "popular" } });
        const list = res.data.results || res.data.tools || res.data || [];
        setTools(list.slice(0, 6));
        setIsFallback(true);
      } catch {
        setTools([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Never render an empty section (prevents silent failure on home page)
  if (!loading && tools.length === 0) return null;

  const title = isFallback ? "Popular Right Now" : "For You";
  const subtitle = isFallback
    ? "Trending open-source tools other founders are exploring."
    : "Personalized picks based on what you've been exploring.";

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          {title}
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">{subtitle}</p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-2 border-foreground h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {tools.map((t, i) => <ToolChip key={i} tool={t} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export default RecommendationsSection;
