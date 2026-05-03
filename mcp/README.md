# @gitstack/mcp

MCP (Model Context Protocol) server for GitStack — fetch trending repos, find open-source alternatives, translate repos, and more from your AI coding agent.

## What it does

This MCP server exposes 7 powerful tools to AI agents like Claude Desktop, Cursor, and Windsurf:

| Tool | Description |
|------|-------------|
| `search_tools` | Search GitStack's curated catalog by keyword |
| `get_trending_repos` | Get trending GitHub repos (updated every 6 hours) |
| `find_alternatives` | Find free OSS alternatives to paid tools |
| `translate_repo` | Get plain-English explanation of any GitHub repo |
| `get_repo_of_day` | Today's featured repo with AI explanation |
| `compare_tools` | Side-by-side comparison of two tools |
| `suggest_stack` | AI-recommended tools for your project idea |

## Install

```bash
npm install -g @gitstack/mcp
```

Or use with `npx` (no install required):

```bash
npx @gitstack/mcp
```

## Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "gitstack": {
      "command": "npx",
      "args": ["@gitstack/mcp"]
    }
  }
}
```

## Configure Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "gitstack": {
      "command": "npx",
      "args": ["@gitstack/mcp"]
    }
  }
}
```

## Self-hosted GitStack

If you're running your own GitStack instance:

```json
{
  "mcpServers": {
    "gitstack": {
      "command": "npx",
      "args": ["@gitstack/mcp"],
      "env": {
        "GITSTACK_API_URL": "https://your-gitstack-instance.com/api"
      }
    }
  }
}
```

## Tool Reference

### search_tools
- **Input**: `query` (string), optional `category` (string)
- **Example**: `"database"`, `"auth"`

### get_trending_repos
- **Input**: optional `tab` ("top_week" | "top_day" | "top_month")
- **Default**: "top_week"

### find_alternatives
- **Input**: `paid_tools` (string)
- **Example**: `"Notion, Linear, Figma"`

### translate_repo
- **Input**: `owner` (string), `repo` (string)
- **Example**: `owner="vercel"`, `repo="next.js"`

### get_repo_of_day
- **Input**: none

### compare_tools
- **Input**: `tool_a` (string), `tool_b` (string)
- **Example**: `tool_a="Supabase"`, `tool_b="Firebase"`

### suggest_stack
- **Input**: `idea` (string), optional `budget` (string)
- **Example**: `idea="SaaS with payments and auth"`, `budget="free only"`

## Development

```bash
cd mcp
npm install
npm run build
npm run dev
```

## License

MIT
