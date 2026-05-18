#!/usr/bin/env python3
"""
Seed script: Insert curated voice AI / calling agent repos into github_repos.
Run: cd backend && python scripts/seed_voice_repos.py
"""
import os
import asyncio
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

# Curated voice/calling/repos that the scraper misses
VOICE_REPOS = [
    {
        "full_name": "fonoster/fonoster",
        "name": "fonoster",
        "owner": "fonoster",
        "description": "The open-source alternative to Twilio. Build scalable voice and messaging apps with the Fonoster API.",
        "stars": 7200,
        "forks": 340,
        "language": "TypeScript",
        "topics": ["twilio-alternative", "voice", "sms", "telephony", "sip", "webrtc", "api"],
        "html_url": "https://github.com/fonoster/fonoster",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "sms-messaging", "sales-dialer", "customer-support", "telephony"],
        "replaces_saas": ["Twilio", "RingCentral", "Vonage"],
    },
    {
        "full_name": "hkjarral/AVA-AI-Voice-Agent-for-Asterisk",
        "name": "AVA-AI-Voice-Agent-for-Asterisk",
        "owner": "hkjarral",
        "description": "Open-source AI voice agent for Asterisk/FreePBX. Modular pipeline with OpenAI Realtime, Deepgram, ElevenLabs, Google Live API.",
        "stars": 420,
        "forks": 28,
        "language": "Python",
        "topics": ["voice-agent", "asterisk", "pbx", "ai-voice", "realtime", "openai", "sip"],
        "html_url": "https://github.com/hkjarral/AVA-AI-Voice-Agent-for-Asterisk",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "ai-phone-agent", "sales-automation", "customer-support", "ivr"],
        "replaces_saas": ["Five9", "Aircall", "Dialpad"],
    },
    {
        "full_name": "aicc2025/sip-to-ai",
        "name": "sip-to-ai",
        "owner": "aicc2025",
        "description": "Turn any SIP call into a realtime AI voice agent. Pure Python bridge for OpenAI Realtime, Deepgram, Gemini Live, Grok Voice.",
        "stars": 380,
        "forks": 22,
        "language": "Python",
        "topics": ["sip", "rtp", "voice-ai", "openai-realtime", "deepgram", "gemini-live", "call-center"],
        "html_url": "https://github.com/aicc2025/sip-to-ai",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "ai-phone-agent", "sales-dialer", "call-center", "sip-trunking"],
        "replaces_saas": ["Twilio", "RingCentral"],
    },
    {
        "full_name": "VectorlyApp/open-telephony-stack",
        "name": "open-telephony-stack",
        "owner": "VectorlyApp",
        "description": "HIPAA-eligible DIY Twilio alternative for voice AI telephone applications. Uses Asterisk PBX and AWS Chime SIP trunking.",
        "stars": 290,
        "forks": 18,
        "language": "Python",
        "topics": ["telephony", "asterisk", "sip", "voice-ai", "hipaa", "aws-chime", "pbx"],
        "html_url": "https://github.com/VectorlyApp/open-telephony-stack",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "healthcare-phone", "sales-dialer", "customer-support", "telephony"],
        "replaces_saas": ["Twilio", "Five9", "Aircall"],
    },
    {
        "full_name": "Iamsdt/audiocall",
        "name": "audiocall",
        "owner": "Iamsdt",
        "description": "Open-source AI voice calling agent for Twilio phone calls, built with FastAPI, Google ADK, and Gemini Live API.",
        "stars": 210,
        "forks": 15,
        "language": "Python",
        "topics": ["voice-agent", "twilio", "ai-calling", "gemini-live", "fastapi", "sales"],
        "html_url": "https://github.com/Iamsdt/audiocall",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "sales-outbound", "ai-phone-agent", "appointment-scheduling", "lead-generation"],
        "replaces_saas": ["Vapi", "Bland AI", "Retell"],
    },
    {
        "full_name": "avijeett007/Knotie-AI",
        "name": "Knotie-AI",
        "owner": "avijeett007",
        "description": "Completely open-source inbound/outbound AI Sales Agent that communicates with potential leads and customers.",
        "stars": 580,
        "forks": 45,
        "language": "Python",
        "topics": ["sales-agent", "voice-ai", "outbound-calling", "ai-sales", "twilio", "lead-generation"],
        "html_url": "https://github.com/avijeett007/Knotie-AI",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["sales-outbound", "lead-generation", "voice-calling", "customer-support", "crm-integration"],
        "replaces_saas": ["Vapi", "Bland AI", "Outreach"],
    },
    {
        "full_name": "askjohngeorge/ai-dialer",
        "name": "ai-dialer",
        "owner": "askjohngeorge",
        "description": "Autonomous Voice Agent for Appointment Scheduling. AI-powered outbound calls with lead management dashboard.",
        "stars": 180,
        "forks": 12,
        "language": "TypeScript",
        "topics": ["ai-dialer", "voice-agent", "appointment-scheduling", "outbound-calling", "vapi"],
        "html_url": "https://github.com/askjohngeorge/ai-dialer",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["appointment-scheduling", "voice-calling", "sales-outbound", "lead-management", "healthcare"],
        "replaces_saas": ["Vapi", "Calendly", "Chili Piper"],
    },
    {
        "full_name": "livekit/livekit",
        "name": "livekit",
        "owner": "livekit",
        "description": "End-to-end stack for WebRTC. SFU media server and SDKs for building real-time voice and video applications.",
        "stars": 12400,
        "forks": 890,
        "language": "Go",
        "topics": ["webrtc", "sfu", "real-time", "video", "voice", "live-streaming", "sdk"],
        "html_url": "https://github.com/livekit/livekit",
        "license": "Apache-2.0",
        "repo_type": "building_block",
        "use_cases": ["video-conferencing", "live-streaming", "voice-calling", "real-time-chat"],
        "replaces_saas": ["Twilio Video", "Agora", "Daily.co"],
    },
    {
        "full_name": "livekit-examples/outbound-caller-python",
        "name": "outbound-caller-python",
        "owner": "livekit-examples",
        "description": "AI agent that makes outbound calls using SIP and Dispatch APIs. Detects voicemail, transfers to humans, schedules meetings.",
        "stars": 320,
        "forks": 40,
        "language": "Python",
        "topics": ["voice-agent", "outbound-calling", "livekit", "sip", "ai-calling", "sales"],
        "html_url": "https://github.com/livekit-examples/outbound-caller-python",
        "license": "Apache-2.0",
        "repo_type": "complete_solution",
        "use_cases": ["sales-outbound", "voice-calling", "appointment-scheduling", "call-center", "lead-generation"],
        "replaces_saas": ["Vapi", "Bland AI", "Retell"],
    },
    {
        "full_name": "twilio-labs/call-gpt",
        "name": "call-gpt",
        "owner": "twilio-labs",
        "description": "Generative AI phone call toolkit using Twilio Media Streams. Build voice bots with GPT function calling.",
        "stars": 1900,
        "forks": 280,
        "language": "JavaScript",
        "topics": ["voice-agent", "twilio", "gpt", "openai", "phone-calls", "ai-calling"],
        "html_url": "https://github.com/twilio-labs/call-gpt",
        "license": "MIT",
        "repo_type": "complete_solution",
        "use_cases": ["voice-calling", "customer-support", "sales-outbound", "ivr", "appointment-scheduling"],
        "replaces_saas": ["Vapi", "Bland AI"],
    },
]

# Additional hot repos the scraper might miss
BONUS_REPOS = [
    {
        "full_name": "comfyanonymous/ComfyUI",
        "name": "ComfyUI",
        "owner": "comfyanonymous",
        "description": "The most powerful and modular diffusion model GUI, api and backend with a graph/nodes interface.",
        "stars": 78000,
        "forks": 8400,
        "language": "Python",
        "topics": ["stable-diffusion", "image-generation", "ai", "gui", "diffusion", "comfyui"],
        "html_url": "https://github.com/comfyanonymous/ComfyUI",
        "license": "GPL-3.0",
        "repo_type": "complete_solution",
        "use_cases": ["image-generation", "ai-art", "design-automation", "content-creation"],
        "replaces_saas": ["Midjourney", "DALL-E", "Leonardo.ai"],
    },
    {
        "full_name": "nocodb/nocodb",
        "name": "nocodb",
        "owner": "nocodb",
        "description": "Open Source Airtable Alternative. Turns any MySQL, PostgreSQL, SQL Server, SQLite & MariaDB into a smart spreadsheet.",
        "stars": 56000,
        "forks": 3800,
        "language": "TypeScript",
        "topics": ["database", "spreadsheet", "airtable-alternative", "no-code", "low-code", "sql"],
        "html_url": "https://github.com/nocodb/nocodb",
        "license": "AGPL-3.0",
        "repo_type": "complete_solution",
        "use_cases": ["database-management", "internal-tools", "crm", "project-management", "data-entry"],
        "replaces_saas": ["Airtable", "SmartSuite", "Notion Database"],
    },
    {
        "full_name": "langgenius/dify",
        "name": "dify",
        "owner": "langgenius",
        "description": "Dify is an open-source LLM app development platform. Orchestrate LLM apps with agent, RAG, workflow.",
        "stars": 95000,
        "forks": 14200,
        "language": "TypeScript",
        "topics": ["llm", "ai", "rag", "agent", "workflow", "openai", "chatbot"],
        "html_url": "https://github.com/langgenius/dify",
        "license": "Apache-2.0",
        "repo_type": "complete_solution",
        "use_cases": ["ai-chatbot", "rag", "workflow-automation", "customer-support", "internal-tools"],
        "replaces_saas": ["Chatbase", "Stack AI", "Voiceflow"],
    },
    {
        "full_name": "infiniflow/ragflow",
        "name": "ragflow",
        "owner": "infiniflow",
        "description": "RAGFlow is an open-source RAG engine based on deep document understanding. Best for enterprise knowledge bases.",
        "stars": 48000,
        "forks": 4500,
        "language": "Python",
        "topics": ["rag", "llm", "knowledge-base", "document-processing", "ai", "search"],
        "html_url": "https://github.com/infiniflow/ragflow",
        "license": "Apache-2.0",
        "repo_type": "complete_solution",
        "use_cases": ["knowledge-base", "document-search", "customer-support", "internal-tools", "rag"],
        "replaces_saas": ["Glean", "Coveo", "Algolia"],
    },
]


async def main():
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017/gitstack")
    db_name = os.environ.get("DB_NAME", "gitstack")

    client = AsyncIOMotorClient(mongo_url, maxPoolSize=10)
    db = client[db_name]

    all_repos = VOICE_REPOS + BONUS_REPOS
    inserted = 0
    updated = 0

    for repo in all_repos:
        doc = {
            "repo_id": repo["full_name"].replace("/", "_").lower(),
            "full_name": repo["full_name"],
            "name": repo["name"],
            "owner": repo["owner"],
            "description": repo["description"],
            "stars": repo["stars"],
            "forks": repo.get("forks", 0),
            "language": repo["language"],
            "topics": repo["topics"],
            "html_url": repo["html_url"],
            "license": repo.get("license"),
            "contributors": 0,
            "source": "curated_seed",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "classified_at": datetime.now(timezone.utc).isoformat(),
            "ai_description": None,
            "repo_type": repo["repo_type"],
            "use_cases": repo["use_cases"],
            "replaces_saas": repo["replaces_saas"],
            "upvotes": 0,
        }

        result = await db.github_repos.update_one(
            {"full_name": repo["full_name"]},
            {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )

        if result.upserted_id:
            inserted += 1
            print(f"  + Inserted: {repo['full_name']} ({repo['repo_type']})")
        else:
            updated += 1
            print(f"  ~ Updated:  {repo['full_name']} ({repo['repo_type']})")

    print(f"\nDone: {inserted} inserted, {updated} updated. Total: {len(all_repos)}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
