# Phase 8 — Repo X-Ray (CodeFlow Integration)

## What
Rebranded the [CodeFlow](https://github.com/braedonsaunders/codeflow) GitHub repo architecture visualizer as **Repo X-Ray**, embedded it into GitStack as a tabbed feature alongside the existing Repo Translator.

## Files
- `frontend/public/xray.html` — static rebranded viewer (generated via `scripts/build-xray.js`)
- `frontend/src/pages/GitHubRepoPage.js` — tabbed interface: "Plain English" vs "Repo X-Ray"
- `frontend/src/pages/RepoXrayPage.js` — standalone landing page with input form
- `frontend/src/pages/RepoTranslator.js` — X-Ray CTA card after translation
- `scripts/build-xray.js` — automated rebranding pipeline (colors, text, logos)
- `frontend/package.json` — `build:xray` npm script

## Key Decisions
- **Kept X-Ray as iframe tab** (not replacing Translator) to ship fast with low risk
- Deeplink support: `?tab=xray` lands directly on the X-Ray tab
- Cleaned up nested `.git` in `xray/` so it tracks as regular files

## Status
✅ Complete
