#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { gitstack } from "./api.js";

// Define tools with JSON Schema
const TOOLS: Tool[] = [
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

const server = new Server(
  {
    name: "gitstack",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [{ type: "text", text: "Error: No arguments provided" }],
      isError: true,
    };
  }

  try {
    let result: unknown;

    switch (name) {
      case "search_tools":
        result = await gitstack.searchTools(String(args.query), args.category ? String(args.category) : undefined);
        break;
      case "get_trending_repos":
        result = await gitstack.getTrendingRepos(args.tab ? String(args.tab) : undefined);
        break;
      case "find_alternatives":
        result = await gitstack.findAlternatives(String(args.paid_tools));
        break;
      case "translate_repo":
        result = await gitstack.translateRepo(String(args.owner), String(args.repo));
        break;
      case "get_repo_of_day":
        result = await gitstack.getRepoOfDay();
        break;
      case "compare_tools":
        result = await gitstack.compareTools(String(args.tool_a), String(args.tool_b));
        break;
      case "suggest_stack":
        result = await gitstack.suggestStack(String(args.idea), args.budget ? String(args.budget) : undefined);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
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

const transport = new StdioServerTransport();
await server.connect(transport);
