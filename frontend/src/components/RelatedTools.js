import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API } from "../utils/api";
import { ArrowRight, Star } from "lucide-react";

export const RelatedTools = ({ toolId }) => {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!toolId) return;
    setLoading(true);
    axios
      .get(`${API}/tools/${toolId}/related`)
      .then((res) => {
        setTools(res.data.related || []);
        setLoading(false);
      })
      .catch(() => {
        setTools([]);
        setLoading(false);
      });
  }, [toolId]);

  if (loading || tools.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        Related Tools
        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded">
          SEO
        </span>
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.tool_id}
            to={`/tools/${tool.tool_id}`}
            className="neo-card p-4 hover:border-primary/50 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold group-hover:text-primary transition-colors">
                  {tool.name}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {tool.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 group-hover:text-primary" />
            </div>
            {tool.stars && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                <Star className="w-3 h-3 fill-primary text-primary" />
                {typeof tool.stars === "number"
                  ? tool.stars.toLocaleString()
                  : tool.stars}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedTools;
