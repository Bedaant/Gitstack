import React from "react";
import { Link } from "react-router-dom";

/**
 * GitStackLink - Converts GitHub URLs to branded gitstack.pro links
 * 
 * Usage:
 * <GitStackLink githubUrl="https://github.com/vercel/next.js">View Repo</GitStackLink>
 * 
 * Features:
 * - Automatically converts github.com URLs to gitstack.pro/r/:owner/:repo format
 * - Falls back to external link for non-GitHub URLs
 * - Preserves all link attributes (className, target, etc.)
 */

export const GitStackLink = ({ 
  githubUrl, 
  children, 
  className = "", 
  showIcon = false,
  external = false,
  ...props 
}) => {
  // Parse GitHub URL
  const parseGitHubUrl = (url) => {
    if (!url) return null;
    
    // Match github.com/:owner/:repo patterns
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /github\.com\/([^\/]+)\/([^\/]+)\/.*/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""), // Remove .git suffix
        };
      }
    }
    
    return null;
  };

  const repoInfo = parseGitHubUrl(githubUrl);
  
  // If not a GitHub URL or explicitly external, render external link
  if (!repoInfo || external) {
    return (
      <a 
        href={githubUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className={className}
        {...props}
      >
        {children}
        {showIcon && (
          <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        )}
      </a>
    );
  }

  // Convert to gitstack.pro format
  const gitstackUrl = `/r/${repoInfo.owner}/${repoInfo.repo}`;
  
  return (
    <Link 
      to={gitstackUrl}
      className={className}
      {...props}
    >
      {children}
    </Link>
  );
};

/**
 * Utility function to convert any GitHub URL to gitstack.pro format
 * Useful for transforming data before display
 */
export const toGitStackUrl = (githubUrl) => {
  if (!githubUrl) return null;
  
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return githubUrl;
  
  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  
  return `https://gitstack.pro/r/${owner}/${repo}`;
};

/**
 * Helper to get OG image URL for a repo
 */
export const getRepoOgImageUrl = (owner, repo) => {
  return `https://gitstack.pro/og/repo/${owner}/${repo}`;
};

export default GitStackLink;
