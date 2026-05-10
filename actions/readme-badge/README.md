# GitStack README Badge Action

Auto-injects a GitStack tech-stack analysis badge into your repository's `README.md`.

## What it does

Every time this action runs, it ensures your README contains a branded badge section linking to:

- **Tech Stack Analysis** on [GitStack](https://gitstack.pro)
- **Plain English Translation** of your repo
- **Repo X-Ray** architecture view

## Usage

Add this workflow to `.github/workflows/gitstack-badge.yml`:

```yaml
name: GitStack Badge

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  badge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: GitStackHQ/gitstack-readme-badge@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | **Yes** | — | GitHub token with `repo` scope |
| `readme-path` | No | `README.md` | Path to README file |
| `gitstack-url` | No | `https://gitstack.pro` | GitStack instance base URL |
| `badge-style` | No | `for-the-badge` | Shields.io badge style |
| `commit-message` | No | `docs: add GitStack analysis badge` | Git commit message |
| `section-title` | No | `## Tech Stack` | Markdown heading for badge block |

## Outputs

| Output | Description |
|--------|-------------|
| `gitstack-url` | Full GitStack analysis URL for this repo |
| `embed-url` | Embeddable widget URL for this repo |

## How it looks

```markdown
## Tech Stack

[![GitStack Stack](https://img.shields.io/badge/Analyzed%20by-GitStack-6C5CE7?style=for-the-badge&logo=github)](https://gitstack.pro/r/owner/repo)
[![GitStack Translate](https://img.shields.io/badge/Plain%20English-Explanation-00B894?style=for-the-badge)](https://gitstack.pro/r/owner/repo)
[![GitStack X-Ray](https://img.shields.io/badge/Repo%20X--Ray-Architecture-E17055?style=for-the-badge)](https://gitstack.pro/r/owner/repo)

> 🔍 [View full tech-stack analysis on GitStack](https://gitstack.pro/r/owner/repo) · [Embed this repo](https://gitstack.pro/embed/r/owner/repo)
```

The action uses HTML comment markers (`<!-- GITSTACK-BADGE:START -->` / `<!-- GITSTACK-BADGE:END -->`) so it can safely update the section on future runs without touching the rest of your README.
