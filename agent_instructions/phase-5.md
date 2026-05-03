# Phase 5 — MCP Server NPM Package

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

Create a standalone MCP (Model Context Protocol) server published as an NPM package (`@gitstack/mcp`). AI coding agents (Claude Desktop, Cursor, Windsurf, etc.) can install it and use Gitstack's API to fetch trending repos, find alternatives, translate repos, and more — without leaving their coding environment.

## Prerequisites

None. This phase is fully independent of all other phases.

## Status

- [x] Task 1 — Create `mcp/` directory scaffold (package.json, tsconfig.json)
- [x] Task 2 — Create `mcp/src/api.ts` — typed Gitstack API client
- [x] Task 3 — Create `mcp/src/tools.ts` — MCP tool definitions (inlined in index.ts)
- [x] Task 4 — Create `mcp/src/index.ts` — MCP server entry point
- [x] Task 5 — Create `mcp/README.md` — install + config guide

---

## Directory Structure to Create

```
mcp/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts     ← MCP server entry, registers tools, starts stdio transport
│   ├── tools.ts     ← Tool definitions with JSON Schema inputs
│   └── api.ts       ← Typed HTTP client for gitstack.dev/api
└── README.md
```

---

## Task 1 — package.json and tsconfig.json

### `mcp/package.json`

```json
{
  "name": "@gitstack/mcp",
  "version": "0.1.0",
  "description": "MCP server for Gitstack — fetch trending repos, find OSS alternatives, translate repos and more from your AI coding agent",
  "license": "MIT",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "gitstack-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "axios": "^1.8.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

### `mcp/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Task 2 — API client

**File:** `mcp/src/api.ts`

```typescript
import axios from "axios";

const BASE_URL = process.env.GITSTACK_API_URL ?? "https://gitstack.dev/api";

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

export interface Tool {
  tool_id: string;
  name: string;
  description: string;
  github_url: string;
  stars: string;
  language: string;
  category: string;
  tags: string[];
}

export interface Repo {
  name: string;
  full_name: string;
  description: string;
  url: string;
  stars: number;
  language: string;
}

export const gitstack = {
  async searchTools(q: string, category?: string): Promise<Tool[]> {
    const params: Record<string, string> = { q };
    if (category) params.category = category;
    const res = await client.get<{ tools: Tool[] }>("/tools", { params });
    return res.data.tools ?? (res.data as unknown as Tool[]);
  },

  async getTrendingRepos(tab = "top_week"): Promise<Repo[]> {
    const res = await client.get<{ repos: Repo[] }>("/tools/trending/list", { params: { tab } });
    return res.data.repos ?? (res.data as unknown as Repo[]);
  },

  async findAlternatives(paid_tools: string): Promise<unknown> {
    const res = await client.post("/ai/dead-tool-detector", { paid_tools });
    return res.data;
  },

  async translateRepo(owner: string, repo: string): Promise<unknown> {
    const res = await client.get(`/ai/translate-repo/${owner}/${repo}`);
    return res.data;
  },

  async getRepoOfDay(): Promise<unknown> {
    const res = await client.get("/repo-of-the-day");
    return res.data;
  },

  async compareTools(tool_a: string, tool_b: string): Promise<unknown> {
    const res = await client.post("/ai/compare", { tool_a, tool_b });
    return res.data;
  },

  async suggestStack(idea: string, budget?: string): Promise<unknown> {
    const res = await client.post("/ai/stack-generator", { idea, budget });
    return res.data;
  },
};
```

---

## Task 3 — Tool definitions

**File:** `mcp/src/tools.ts`

```typescript
import { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS: McpTool[] = [
  {
    name: "search_tools",
    description: "Search Gitstack's curated catalog of open-source tools by keyword. Returns tool names, descriptions, GitHub URLs, star counts, and categories.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword, e.g. 'database', 'auth', 'vector store'",
        },
        category: {
          type: "string",
          description: "Optional category filter, e.g. 'database', 'auth', 'devtools'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_trending_repos",
    description: "Get the currently trending GitHub repositories across all languages. Updated every 6 hours.",
    inputSchema: {
      type: "object",
      properties: {
        tab: {
          type: "string",
          enum: ["top_week", "top_day", "top_month"],
          description: "Time range for trending. Default: top_week",
        },
      },
      required: [],
    },
  },
  {
    name: "find_alternatives",
    description: "Find free open-source alternatives to one or more paid SaaS tools. Provide tool names as a comma-separated string.",
    inputSchema: {
      type: "object",
      properties: {
        paid_tools: {
          type: "string",
          description: "Comma-separated list of paid tools to find alternatives for, e.g. 'Notion, Linear, Figma'",
        },
      },
      required: ["paid_tools"],
    },
  },
  {
    name: "translate_repo",
    description: "Get a plain-English explanation of any public GitHub repository — what it does, who it's for, and how to use it. Results are cached for 7 days.",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          description: "GitHub repository owner, e.g. 'vercel'",
        },
        repo: {
          type: "string",
          description: "GitHub repository name, e.g. 'next.js'",
        },
      },
      required: ["owner", "repo"],
    },
  },
  {
    name: "get_repo_of_day",
    description: "Get today's featured GitHub repository on Gitstack, with an AI-generated plain-English explanation.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "compare_tools",
    description: "Get a side-by-side AI comparison of two developer tools — pros, cons, use cases, and recommendation.",
    inputSchema: {
      type: "object",
      properties: {
        tool_a: {
          type: "string",
          description: "First tool name, e.g. 'Supabase'",
        },
        tool_b: {
          type: "string",
          description: "Second tool name, e.g. 'Firebase'",
        },
      },
      required: ["tool_a", "tool_b"],
    },
  },
  {
    name: "suggest_stack",
    description: "Get AI-recommended open-source tool recommendations for a project idea and budget. Returns 4–6 tools with explanations.",
    inputSchema: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "Brief description of the project, e.g. 'a SaaS app with payments and auth'",
        },
        budget: {
          type: "string",
          description: "Optional budget constraint, e.g. 'free only', 'under $50/month'",
        },
      },
      required: ["idea"],
    },
  },
];
```

---

## Task 4 — MCP server entry point

**File:** `mcp/src/index.ts`

```typescript
#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TOOLS } from "./tools.js";
import { gitstack } from "./api.js";

const server = new McpServer({
  name: "gitstack",
  version: "0.1.0",
});

// Register all tools
for (const tool of TOOLS) {
  server.tool(tool.name, tool.description, tool.inputSchema.properties as Record<string, unknown>, async (args) => {
    try {
      let result: unknown;

      switch (tool.name) {
        case "search_tools":
          result = await gitstack.searchTools(args.query as string, args.category as string | undefined);
          break;
        case "get_trending_repos":
          result = await gitstack.getTrendingRepos(args.tab as string | undefined);
          break;
        case "find_alternatives":
          result = await gitstack.findAlternatives(args.paid_tools as string);
          break;
        case "translate_repo":
          result = await gitstack.translateRepo(args.owner as string, args.repo as string);
          break;
        case "get_repo_of_day":
          result = await gitstack.getRepoOfDay();
          break;
        case "compare_tools":
          result = await gitstack.compareTools(args.tool_a as string, args.tool_b as string);
          break;
        case "suggest_stack":
          result = await gitstack.suggestStack(args.idea as string, args.budget as string | undefined);
          break;
        default:
          throw new Error(`Unknown tool: ${tool.name}`);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Note:** After writing this file, run `npm run build` inside the `mcp/` directory to verify TypeScript compiles without errors. Fix any type errors before proceeding.

---

## Task 5 — README

**File:** `mcp/README.md`

Write a README covering:

1. **What it does** — brief one-liner and list of 7 tools
2. **Install**
   ```bash
   npm install -g @gitstack/mcp
   ```
   Or use with `npx`:
   ```bash
   npx @gitstack/mcp
   ```
3. **Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
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
4. **Cursor config** — `.cursor/mcp.json` in project root:
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
5. **Custom API URL** — for self-hosted Gitstack:
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
6. **Tool reference table** — name, description, required inputs

---

## Verification

1. `cd mcp && npm install && npm run build` — builds without TypeScript errors.
2. `node dist/index.js` — process starts and listens on stdio (no output is expected; it waits for MCP JSON-RPC input).
3. Add to Claude Desktop config, restart Claude Desktop — Gitstack tools appear in the tools panel.
4. In Claude Desktop, ask "What's trending on GitHub right now?" — `get_trending_repos` fires and returns real data.
5. Ask "Find open-source alternatives to Notion" — `find_alternatives` fires.
6. Ask "Explain the vercel/next.js repo" — `translate_repo` fires with `owner=vercel` and `repo=next.js`.
