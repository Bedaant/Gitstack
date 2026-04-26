# Phase 2 — gitstack.pro URL Scheme

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

When someone visits `gitstack.pro/vercel/next.js`, they should land on the Repo Translator page pre-loaded with that repository. This creates a memorable shortcut: replace `hub.com` with `stack.pro` in any GitHub URL to instantly get an AI explanation of that repo on Gitstack.

Also: replace all raw `github.com/...` anchor tags in the app with a `GitHubLink` component that shows the original link AND an "Open on GitStack" button.

## Prerequisites

None. This phase is fully independent.

## Status

- [ ] Task 1 — Create `GitHubLink` utility component
- [ ] Task 2 — Add `/:owner/:repo` catch-all route in App.js
- [ ] Task 3 — Replace GitHub links in DeadToolDetector.js
- [ ] Task 4 — Replace GitHub links in ToolDetailPage.js
- [ ] Task 5 — Replace GitHub links in GitHubRepoPage.js
- [ ] Task 6 — Replace GitHub links in PublicStackPage.js
- [ ] Task 7 — Add gitstack.pro as custom domain in render.yaml

---

## Task 1 — Create GitHubLink component

**File:** `frontend/src/components/ui/GitHubLink.jsx` (new file)

This component accepts a GitHub URL, renders it as a normal link, and adds a secondary button that opens the repo in Gitstack's Repo Translator.

```jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Zap } from "lucide-react";

/**
 * Renders a GitHub link with an "Open on GitStack" button alongside it.
 * Parses github.com/:owner/:repo from any GitHub URL format.
 *
 * @param {string} url - Full GitHub URL, e.g. "https://github.com/vercel/next.js"
 * @param {string} [label] - Link display text. Defaults to the raw URL.
 * @param {string} [className] - Extra classes for the wrapper div.
 */
export const GitHubLink = ({ url, label, className = "" }) => {
  const navigate = useNavigate();

  // Extract owner/repo from any github.com URL
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
```

---

## Task 2 — Add /:owner/:repo catch-all route

**File:** `frontend/src/App.js`

This allows `gitstack.pro/vercel/next.js` to route correctly to the Repo Translator page.

1. Create a small redirect component at the top of `App.js` (not in a separate file):

```jsx
import { Navigate, useParams } from "react-router-dom";

const RepoShortlink = () => {
  const { owner, repo } = useParams();
  return <Navigate to={`/repo/${owner}/${repo}`} replace />;
};
```

2. Add the route at the **very bottom** of the `<Routes>` block, just before `<Route path="*" element={<NotFound />} />`:

```jsx
{/* gitstack.pro/:owner/:repo shortlink — must be last before the 404 catch-all */}
<Route path="/:owner/:repo" element={<RepoShortlink />} />
<Route path="*" element={<NotFound />} />
```

**Why this must be last:** React Router v7 uses route specificity — all existing named routes (`/tools`, `/collections`, etc.) will match before this generic `/:owner/:repo`. The only paths that reach this route are two-segment paths that don't match any existing route.

---

## Task 3 — Replace GitHub links in DeadToolDetector.js

**File:** `frontend/src/pages/DeadToolDetector.js`

1. Add import at the top: `import { GitHubLink } from "../components/ui/GitHubLink";`
2. Find all `<a href="...github.com/...">` elements and replace them with `<GitHubLink url={item.githubUrl} label={item.name} />` (adjust prop names to match the actual data shape in the file).

Read the file first to understand the exact data shape and variable names used before making changes.

---

## Task 4 — Replace GitHub links in ToolDetailPage.js

**File:** `frontend/src/pages/ToolDetailPage.js`

1. Add import: `import { GitHubLink } from "../components/ui/GitHubLink";`
2. Find the GitHub URL anchor tag (uses `tool.github_url`).
3. Replace with: `<GitHubLink url={tool.github_url} label="View on GitHub" />`

---

## Task 5 — Replace GitHub links in GitHubRepoPage.js

**File:** `frontend/src/pages/GitHubRepoPage.js`

1. Add import: `import { GitHubLink } from "../components/ui/GitHubLink";`
2. Find the GitHub URL displayed on this page (constructed as `` `https://github.com/${owner}/${repo}` ``).
3. Replace the anchor with: `<GitHubLink url={`https://github.com/${owner}/${repo}`} label="View on GitHub" />`

---

## Task 6 — Replace GitHub links in PublicStackPage.js

**File:** `frontend/src/pages/PublicStackPage.js`

1. Add import: `import { GitHubLink } from "../components/ui/GitHubLink";`
2. Find anchor tags using `tool.githubUrl`.
3. Replace with: `<GitHubLink url={tool.githubUrl} label={tool.name || "GitHub"} />`

---

## Task 7 — Add gitstack.pro as custom domain in render.yaml

**File:** `render.yaml`

Add `customDomains` under the `gitstack-app` static site service:

```yaml
  - type: web
    name: gitstack-app
    runtime: static
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: build
    customDomains:
      - gitstack.pro
      - www.gitstack.pro
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

**DNS step (manual — do not automate):** In the gitstack.pro DNS provider, add a CNAME record pointing `gitstack.pro` to the Render.com static site domain (shown in the Render dashboard under the service's custom domain settings).

---

## Verification

1. Navigate to `/vercel/next.js` in the app — should redirect to `/repo/vercel/next.js` and load the Repo Translator page with Next.js.
2. Open `ToolDetailPage` for any tool — the GitHub link should show both the original link and a "GitStack" button. Clicking the button should navigate to `/repo/:owner/:repo`.
3. Navigate to `/dashboard` — existing links should still work (verify no routes broke).
4. The `/tools` route still works (not captured by `/:owner/:repo`).
5. Once DNS is configured: `https://gitstack.pro/facebook/react` should load the Gitstack app and land on the React repo translator page.
