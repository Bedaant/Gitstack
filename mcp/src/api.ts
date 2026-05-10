import axios from "axios";

const BASE_URL = process.env.GITSTACK_API_URL ?? "https://gitstack.pro/api";

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
    const params: Record<string, string> = { search: q };
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
    // Backend expects {tool1, tool2}
    const res = await client.post("/ai/compare", { tool1: tool_a, tool2: tool_b });
    return res.data;
  },

  async suggestStack(idea: string, budget?: string): Promise<unknown> {
    const res = await client.post("/ai/stack-generator", { idea, budget });
    return res.data;
  },
};
