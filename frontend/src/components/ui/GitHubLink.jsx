import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Zap } from "lucide-react";

/**
 * Renders a GitHub link with an "Open on GitStack" button alongside it.
 * Parses github.com/:owner/:repo from any GitHub URL format.
 *
 * @param {string} url - Full GitHub URL, e.g. "https://github.com/vercel/next.js"
 * @param {string} [label] - Link display text. Defaults to the raw URL.
 * @param {string} [className] - Extra classes for the wrapper span.
 */
export const GitHubLink = ({ url, label, className = "" }) => {
  const navigate = useNavigate();

  const match = url?.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  const owner = match?.[1];
  const repo = match?.[2];

  const openOnGitstack = (e) => {
    e.preventDefault();
    if (owner && repo) {
      navigate(`/repo/${owner}/${repo}`);
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 hover:underline"
      >
        {label || url}
        <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
      </a>
      {owner && repo && (
        <button
          onClick={openOnGitstack}
          title="Open on GitStack"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary border border-primary px-1.5 py-0.5 hover:bg-primary hover:text-white transition-colors"
        >
          <Zap className="w-3 h-3" />
          GitStack
        </button>
      )}
    </span>
  );
};
