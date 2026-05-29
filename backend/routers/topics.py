from fastapi import APIRouter, HTTPException
import asyncio
import re
import time
import server

router = APIRouter(tags=["Topics"])

# Expanded keyword map — maps each topic to the actual tags repos use on GitHub
TOPIC_KEYWORDS = {
    "ai-agents": [
        "ai", "artificial-intelligence", "machine-learning", "deep-learning", "llm",
        "chatgpt", "gpt", "openai", "ai-agents", "agent", "agents", "claude",
        "langchain", "rag", "nlp", "natural-language-processing", "transformer",
        "pytorch", "tensorflow", "neural-network", "generative-ai", "mcp",
        "claude-code", "copilot", "chatbot", "llama", "huggingface",
        "crewai", "autogen", "swarm", "openai-agents", "multi-agent", "agentops"
    ],
    "ai-coding-tools": [
        "mcp", "model-context-protocol", "claude-code", "cursor", "cursor-ai",
        "windsurf", "aider", "codeium", "vscode-extension", "copilot-alternative",
        "ide", "coding-assistant", "programming", "autocode"
    ],
    "ai-memory-pkm": [
        "obsidian", "obsidian-plugin", "ai-memory", "mem0", "memgpt", "second-brain",
        "knowledge-graph", "pkm", "personal-knowledge-management", "zettelkasten"
    ],
    "local-ai": [
        "ollama", "vllm", "llamacpp", "lmstudio", "localai", "local-llm", "private-ai"
    ],
    "mcp-tools": [
        "mcp", "model-context-protocol", "mcp-server", "mcp-client", "awesome-mcp"
    ],
    "ai-agents-advanced": [
        "multi-agent", "autonomous-agents", "computer-use", "browser-use", "web-agent",
        "swarm", "crewai", "autogen", "task-automation"
    ],
    "ui-ux": [
        "react", "nextjs", "frontend", "ui", "ux", "design", "css", "tailwind",
        "component", "design-system", "svelte", "vue", "angular", "web",
        "responsive", "animation", "icons", "theme", "dashboard", "template",
        "shadcn", "radix", "headless-ui", "storybook", "figma"
    ],
    "automation": [
        "automation", "devops", "ci-cd", "github-actions", "workflow", "pipeline",
        "docker", "kubernetes", "terraform", "ansible", "jenkins", "deploy",
        "infrastructure", "iac", "scripting", "cron", "task-runner", "cli",
        "n8n", "zapier", "make-alternative"
    ],
    "data-analytics": [
        "database", "sql", "postgresql", "mysql", "mongodb", "redis", "data",
        "analytics", "data-science", "data-engineering", "etl", "visualization",
        "bi", "business-intelligence", "data-pipeline", "spark", "kafka"
    ],
    "voice-speech-ai": [
        "text-to-speech", "speech-to-text", "voice-cloning", "elevenlabs", "tts", "stt", "audio-ai"
    ],
    "code-quality-review": [
        "static-analysis", "code-review", "sonarqube", "code-quality", "lint", "security-scan", "sast"
    ],
    "rag-vector-search": [
        "rag", "vector-database", "vector-db", "embedding", "semantic-search", "pinecone", "chromadb", "qdrant"
    ],
    "scraping-data-extraction": [
        "web-scraping", "playwright", "firecrawl", "scraper", "crawling", "extraction", "headless-browser"
    ],
    "terminal-shell": [
        "dotfiles", "terminal", "zsh", "bash", "tui", "ratatui", "cli", "shell-scripts"
    ],
    "payments": [
        "payments", "stripe", "billing", "ecommerce", "fintech", "invoice", "subscription"
    ],
    "auth": [
        "authentication", "auth", "oauth", "security", "identity", "sso", "login"
    ],
    "email-messaging": [
        "email", "newsletter", "mail", "messaging", "notification", "chat", "realtime"
    ],
    "cms-content": [
        "cms", "content-management", "blog", "markdown", "documentation", "wiki"
    ],
    "mobile-dev": [
        "react-native", "flutter", "mobile", "ios", "android", "expo"
    ],
    "web3-blockchain": [
        "blockchain", "web3", "ethereum", "solidity", "defi", "nft", "crypto"
    ],
    "selfhosted": [
        "self-hosted", "selfhosted", "homelab", "docker-compose", "docker",
        "homeserver", "privacy", "open-source", "alternative", "foss",
        "self-hosting", "linux", "server", "nas", "backup", "reverse-proxy",
        "nginx", "caddy", "traefik", "coolify", "portainer"
    ],
    # === New trending categories ===
    "ai-coding-tools": [
        "claude", "claude-code", "cursor", "cursor-ai", "windsurf", "aider",
        "codeium", "copilot", "mcp", "model-context-protocol", "claude-mcp",
        "ai-coding", "vibe-coding", "code-assistant", "ai-editor",
        "vscode-extension", "neovim", "zed", "coding-assistant", "pair-programming"
    ],
    "ai-memory-pkm": [
        "obsidian", "obsidian-plugin", "ai-memory", "mem0", "memgpt",
        "second-brain", "knowledge-graph", "personal-knowledge-management",
        "zettelkasten", "logseq", "note-taking", "pkm", "digital-garden",
        "roam", "notion-alternative", "knowledge-base", "memory-augmentation"
    ],
    "local-ai": [
        "ollama", "vllm", "llamacpp", "lmstudio", "localai", "local-llm",
        "private-ai", "on-premise-ai", "llama", "mistral", "phi", "gemma",
        "llm-inference", "quantization", "gguf", "onnx", "model-serving",
        "open-weights", "self-hosted-llm", "local-inference"
    ],
    "mcp-tools": [
        "mcp", "model-context-protocol", "mcp-server", "mcp-client",
        "claude-mcp", "mcp-tool", "mcp-integration", "anthropic",
        "tool-use", "function-calling", "tool-calling", "ai-tools"
    ],
    "ai-agents-advanced": [
        "computer-use", "browser-use", "web-agent", "autonomous-agent",
        "openai-agents", "agentops", "crewai", "autogen", "swarm",
        "multi-agent-system", "agent-framework", "task-automation",
        "rpa", "browser-automation", "screen-agent", "desktop-agent"
    ],
    "devtools-modern": [
        "bun", "deno", "biome", "turbo", "turborepo", "pnpm", "mise",
        "nix", "devcontainer", "devpod", "gitpod", "codespaces",
        "zed", "helix", "neovim", "developer-experience", "dx",
        "monorepo", "workspace", "toolchain"
    ],
    "voice-speech-ai": [
        "text-to-speech", "tts", "speech-to-text", "stt", "whisper",
        "voice-cloning", "voice-synthesis", "coqui", "bark", "piper",
        "elevenlabs-alternative", "open-source-voice", "real-time-voice", "voice-agent",
        "asr", "automatic-speech-recognition", "openai-whisper", "faster-whisper",
        "audio-ai", "speech-synthesis", "open-source-tts", "audio-generation",
        "transcription", "diarization", "speaker-recognition"
    ],
    "code-quality-review": [
        "code-review", "static-analysis", "lint", "linter", "code-analysis",
        "open-source-code-review", "sonarqube-alternative", "code-quality",
        "tech-debt", "dependency-check", "security-scan", "sast", "code-smell",
        "refactoring", "complexity", "coverage", "code-metrics", "ast",
        "abstract-syntax-tree", "codemods", "semgrep",
        "eslint", "pylint", "ruff", "mypy", "type-checking"
    ],
    "computer-vision-image-ai": [
        "stable-diffusion", "comfyui", "automatic1111", "diffusers",
        "image-generation", "text-to-image", "controlnet", "lora",
        "yolo", "object-detection", "ocr", "tesseract", "face-detection",
        "image-segmentation", "computer-vision", "opencv", "mediapipe",
        "image-processing", "upscaling", "inpainting", "dreambooth",
        "midjourney-alternative", "dalle-alternative", "sdxl", "flux",
        "open-source-vision"
    ],
    "rag-vector-search": [
        "rag", "vector-database", "vector-store", "embedding", "embeddings",
        "chromadb", "qdrant", "weaviate", "pinecone-alternative", "milvus", "faiss",
        "semantic-search", "knowledge-retrieval", "document-retrieval",
        "retrieval-augmented", "pgvector", "lancedb", "turbopuffer",
        "reranking", "hybrid-search", "dense-retrieval", "ann",
        "open-source-vector-db"
    ],
    "scraping-data-extraction": [
        "web-scraping", "scraper", "crawler", "crawlee", "scrapy",
        "playwright", "puppeteer", "selenium", "cheerio", "beautifulsoup",
        "data-extraction", "web-crawler", "price-tracking", "news-scraper",
        "html-parser", "headless-browser", "firecrawl-alternative",
        "open-source-scraper", "spider", "etl", "data-pipeline"
    ],
    "api-development": [
        "api", "rest-api", "graphql", "openapi", "swagger", "postman-alternative",
        "hoppscotch", "bruno", "insomnia", "api-testing", "api-gateway",
        "api-mock", "api-documentation", "fastapi", "express", "hapi",
        "rate-limiting", "api-proxy", "grpc", "websocket", "http-client",
        "open-source-api-tool", "sdk-generator", "openapi-generator"
    ],
    "terminal-shell": [
        "terminal", "shell", "dotfiles", "zsh", "fish", "bash", "nushell",
        "tmux", "wezterm", "alacritty", "kitty", "starship",
        "oh-my-zsh", "oh-my-posh", "prompt", "plugin", "zsh-plugin",
        "shell-script", "linux", "cli-tool", "tui",
        "terminal-ui", "curses", "ratatui", "foss-cli"
    ],
    "document-pdf-ai": [
        "pdf", "pdf-processing", "ocr", "document-ai", "document-extraction",
        "llamaparse-alternative", "unstructured", "docling", "pdfplumber",
        "document-parsing", "invoice-extraction", "table-extraction",
        "pdf-reader", "pdf-converter", "markdown-extraction",
        "document-intelligence", "form-extraction", "receipt-ocr",
        "open-source-ocr"
    ],
    "game-development": [
        "game-engine", "gamedev", "godot", "pygame", "unity-alternative",
        "indie-game", "game-dev", "2d-game", "3d-game", "retro",
        "emulator", "wasm-game", "webgl", "threejs", "babylonjs",
        "physics-engine", "tilemap", "procedural-generation",
        "roguelike", "ecs", "open-source-game-engine"
    ],
    "monitoring-sre": [
        "monitoring", "observability", "sre", "error-tracking",
        "sentry-alternative", "datadog-alternative", "uptime", "status-page",
        "incident-management", "alerting", "log-management", "logging",
        "prometheus", "grafana", "opentelemetry", "tracing", "apm",
        "application-performance", "glitchtip", "highlight", "axiom-alternative",
        "pagerduty-alternative", "healthcheck", "open-source-observability"
    ],
}


async def get_topic_keywords(topic_id: str, db) -> list:
    """Get keywords for a topic — checks hardcoded dict first, then DB for auto-discovered topics"""
    if topic_id in TOPIC_KEYWORDS:
        return TOPIC_KEYWORDS[topic_id]
    doc = await db.auto_topic_keywords.find_one({"topic_id": topic_id}, {"_id": 0, "keywords": 1})
    if doc:
        return doc.get("keywords", [])
    return []


def _build_topic_query(topic_id: str) -> list:
    """Build a list of regex conditions for matching repos to a topic (sync version for hardcoded topics)"""
    keywords = TOPIC_KEYWORDS.get(topic_id, [])
    if not keywords:
        return []
    return [{"$regex": kw, "$options": "i"} for kw in keywords]


_topics_cache = None
_topics_cache_time = 0


@router.get("/topics")
async def get_topics():
    global _topics_cache, _topics_cache_time

    if _topics_cache and time.time() - _topics_cache_time < 3600 * 6:
        return _topics_cache

    topics = await server.db.topics.find({}, {"_id": 0}).to_list(50)

    async def get_topic_count(topic):
        topic_id = topic.get("topic_id", "")
        topic_name = topic.get("name", "")
        keywords = await get_topic_keywords(topic_id, server.db)
        if not keywords:
            keywords = [topic_name.lower().replace(" ", "-")]

        or_conditions = []
        for kw in keywords:
            or_conditions.append({"tags": {"$regex": kw, "$options": "i"}})
            or_conditions.append({"category": {"$regex": kw, "$options": "i"}})

        gh_or = [{"topics": {"$in": keywords}}]
        for kw in keywords[:8]:
            gh_or.append({"topics": {"$regex": kw, "$options": "i"}})
            gh_or.append({"description": {"$regex": kw, "$options": "i"}})

        async def dummy_count(): return 0

        results = await asyncio.gather(
            server.db.tools.count_documents({"$or": or_conditions}) if or_conditions else dummy_count(),
            server.db.github_repos.count_documents({"$or": gh_or})
        )
        topic["tool_count"] = (results[0] or 0) + (results[1] or 0)
        return topic

    await asyncio.gather(*(get_topic_count(t) for t in topics))

    _topics_cache = topics
    _topics_cache_time = time.time()
    return topics


@router.get("/topics/{topic_id}/tools")
async def get_topic_tools(topic_id: str):
    topic = await server.db.topics.find_one({"topic_id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic_name = topic.get("name", "")
    keywords = await get_topic_keywords(topic_id, server.db)
    if not keywords:
        keywords = [topic_name.lower().replace(" ", "-")]

    or_conditions = []
    for kw in keywords:
        escaped_kw = re.escape(kw)
        or_conditions.append({"tags": {"$regex": escaped_kw, "$options": "i"}})
        or_conditions.append({"category": {"$regex": escaped_kw, "$options": "i"}})

    tools = await server.db.tools.find(
        {"$or": or_conditions} if or_conditions else {},
        {"_id": 0}
    ).to_list(100)

    gh_or = [{"topics": {"$in": keywords}}]
    for kw in keywords[:8]:
        escaped_kw = re.escape(kw)
        gh_or.append({"topics": {"$regex": escaped_kw, "$options": "i"}})
        gh_or.append({"description": {"$regex": escaped_kw, "$options": "i"}})
        gh_or.append({"name": {"$regex": escaped_kw, "$options": "i"}})

    remaining = max(100 - len(tools), 20)
    gh_repos = await server.db.github_repos.find(
        {"$or": gh_or},
        {"_id": 0}
    ).sort("score", -1).limit(remaining).to_list(remaining)

    seen_names = {t["name"].lower() for t in tools}
    for repo in gh_repos:
        if repo.get("name", "").lower() in seen_names:
            continue
        seen_names.add(repo["name"].lower())
        tools.append({
            "tool_id": repo.get("repo_id", repo.get("full_name", "").replace("/", "_")),
            "name": repo.get("name", ""),
            "description": repo.get("description", ""),
            "who_its_for": "Developers and founders",
            "what_you_can_build": [],
            "difficulty": "Intermediate",
            "setup_time": "30 mins",
            "setup_steps": ["Visit the GitHub repo", "Follow the README instructions"],
            "related_tools": [],
            "github_url": repo.get("html_url", f"https://github.com/{repo.get('full_name', '')}"),
            "stars": f"{repo.get('stars', 0):,}",
            "language": repo.get("language", "Unknown"),
            "category": topic_name,
            "tags": repo.get("topics", []),
            "source": "github",
            "full_name": repo.get("full_name", "")
        })

    topic["tool_count"] = len(tools)
    return {"topic": topic, "tools": tools}
