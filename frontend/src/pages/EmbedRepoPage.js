import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Loader2, ExternalLink } from "lucide-react";
import { formatContent } from "../utils/sanitize";
import { SEO } from "../components/SEO";
import { API } from "../utils/api";

/**
 * Embeddable widget for bloggers, READMEs, etc.
 *
 * Usage:
 *   <iframe src="https://gitstack.pro/embed/r/owner/repo"
 *           width="100%" height="600" frameborder="0" />
 *
 * Minimal chrome: no header/footer, just branded translator output with backlink.
 */
export default function EmbedRepoPage() {
  const { owner, repo } = useParams();
  const [translation, setTranslation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!owner || !repo) return;
    setLoading(true);
    axios.get(`${API}/ai/translate-repo/${owner}/${repo}`)
      .then(res => setTranslation(res.data.translation || res.data.summary))
      .catch(() => setError("Could not load translation"))
      .finally(() => setLoading(false));
  }, [owner, repo]);

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const gitstackUrl = `https://gitstack.pro/r/${owner}/${repo}`;

  return (
    <div className="min-h-screen bg-background p-4">
      <SEO
        title={`${owner}/${repo} — AI Summary`}
        description={`Plain English summary of ${owner}/${repo}. Embed this open-source repo explanation in your README or blog with GitStack.`}
        path={`/embed/r/${owner}/${repo}`}
      />
      <div className="max-w-3xl mx-auto">
        <div className="neo-card p-5 mb-3">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                AI Summary via <a href="https://gitstack.pro" target="_blank" rel="noopener noreferrer" className="text-primary underline">GitStack</a>
              </p>
              <h1 className="text-xl font-black mt-1">{owner}/{repo}</h1>
            </div>
            <a
              href={repoUrl}
              target="_blank" rel="noopener noreferrer"
              className="text-xs font-bold border-2 border-foreground px-3 py-1.5 inline-flex items-center gap-1 hover:bg-foreground hover:text-background transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> GitHub
            </a>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-sm text-muted-foreground py-4">{error}</div>
          )}

          {!loading && translation && (
            <div
              className="prose-gitstack text-sm"
              dangerouslySetInnerHTML={{ __html: formatContent(translation) }}
            />
          )}

          <div className="mt-4 pt-3 border-t-2 border-border flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] text-muted-foreground font-semibold">
              Powered by GitStack AI
            </p>
            <a
              href={gitstackUrl}
              target="_blank" rel="noopener noreferrer"
              className="text-xs font-black text-primary hover:underline"
            >
              View full summary on GitStack →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
