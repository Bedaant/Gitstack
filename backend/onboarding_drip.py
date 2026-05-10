"""GitStack Onboarding Drip — Intent-based, Primary-inbox optimized.

Trigger: Clerk signup (or poll users collection every 6h)
Goal: Turn signups into active users based on their intent.

Intent detection:
  - Tracked links in welcome email (GET /onboarding/intent?token=xxx&type=...)
  - Frontend can also POST intent directly
  - Falls back to "tool-hunter" if unknown

Sequence:
  Day 0  → Welcome + "What are you here for?" (universal)
  Day 1  → First Daily Drop (universal)
  Day 2  → Intent-specific first touch
  Day 3  → Stack Generator deep dive (universal)
  Day 5  → Repo Translator + Roast My Stack (universal)
  Day 7  → Intent-specific conversion
  Day 10 → Re-engagement (if no activity)
  Day 14 → Social proof (intent-specific)

Design: Primary-inbox rules
  - NO images (text-only logo)
  - NO colored backgrounds on cards
  - Minimal HTML: text, links, spacing, 3px left-border accents
  - Cream background for brand feel
  - Reply prompts in every email
"""

import os
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from loguru import logger

from utils.email import send_email

SITE_URL = os.environ.get("FRONTEND_URL", "https://gitstack.pro")
HELP_EMAIL = os.environ.get("SMTP_HELP_EMAIL", "help@gitstack.pro")

# ── Design Tokens ─────────────────────────────────────────────
_CREAM = "#FDF7EB"
_CHARCOAL = "#2A2A2A"
_RED = "#C53B3A"
_GREEN = "#0C9367"
_BLUE = "#09407E"
_YELLOW = "#F1B333"
_ORANGE = "#F07633"
_PURPLE = "#6758A5"
_MUTED = "#6B6560"

_FONT_HEADING = "Georgia, 'Times New Roman', serif"
_FONT_BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
_FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace"

# Marketplace categories
MARKETPLACE_CATEGORIES = ["SaaS", "MCP Servers", "Computer Vision", "Templates", "Skills", "Other"]


# ── Shared Helpers ────────────────────────────────────────────

def _logo(badge: str = None) -> str:
    """Text-only logo — no images."""
    badge_html = ""
    if badge:
        badge_html = (
            f'<span style="display:inline-block;margin-left:8px;padding:2px 8px;background:{_CHARCOAL};'
            f'color:{_CREAM};font-family:{_FONT_MONO};font-size:9px;font-weight:700;'
            f'text-transform:uppercase;letter-spacing:1px;border-radius:9999px;">{badge}</span>'
        )
    return (
        f'<span style="font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{_CHARCOAL};letter-spacing:-1px;">Git</span>'
        f'<span style="font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{_RED};letter-spacing:-1px;">Stack</span>'
        f'{badge_html}'
    )


def _hero(title: str, subtitle: str = "", accent: str = _ORANGE) -> str:
    sub = f'<p style="margin:6px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_MUTED};line-height:1.5;">{subtitle}</p>' if subtitle else ""
    return f"""
    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_HEADING};font-size:22px;font-weight:700;color:{accent};line-height:1.3;">{title}</p>
      {sub}
    </td></tr>
    """


def _divider() -> str:
    return f'<tr><td style="padding:0 0 16px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid {_CHARCOAL};"></td></tr></table></td></tr>'


def _section(title: str, body: str, accent: str = _ORANGE) -> str:
    """Text section with 3px colored left border."""
    return f"""
    <tr><td style="padding:0 0 20px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:3px;background:{accent};font-size:0;line-height:0;">&nbsp;</td>
          <td style="padding-left:12px;">
            <p style="margin:0;font-family:{_FONT_HEADING};font-size:17px;font-weight:700;color:{_CHARCOAL};">{title}</p>
            <p style="margin:6px 0 0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">{body}</p>
          </td>
        </tr>
      </table>
    </td></tr>
    """


def _link(text: str, url: str, accent: str = _RED) -> str:
    """Text link instead of pill button."""
    return f'<a href="{url}" style="color:{accent};font-family:{_FONT_BODY};font-size:15px;font-weight:600;text-decoration:underline;">{text} →</a>'


def _reply_prompt(text: str = "What are you building? Hit reply and tell me — I read every response.") -> str:
    return f"""
    <tr><td style="padding:16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px dashed {_CHARCOAL};padding-top:16px;">
          <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
            <strong>{text.split(' — ')[0]}</strong>{' — ' + text.split(' — ')[1] if ' — ' in text else ''}
          </p>
        </td></tr>
      </table>
    </td></tr>
    """


def _ps(text: str) -> str:
    return f'<tr><td style="padding:0 0 16px;"><p style="margin:0;font-family:{_FONT_BODY};font-size:13px;color:{_MUTED};line-height:1.5;"><strong>P.S.</strong> {text}</p></td></tr>'


def _footer(preferences_url: str, unsubscribe_url: str) -> str:
    return f"""
    <tr><td style="padding:16px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="border-top:1px solid {_CHARCOAL};padding-top:16px;">
          <p style="margin:0;font-family:{_FONT_BODY};font-size:11px;color:{_MUTED};line-height:1.5;">
            <a href="{preferences_url}" style="color:{_MUTED};text-decoration:underline;">Preferences</a>
            &nbsp;·&nbsp;
            <a href="{unsubscribe_url}" style="color:{_MUTED};text-decoration:underline;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="{SITE_URL}" style="color:{_MUTED};text-decoration:underline;">gitstack.pro</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
    """


def _email_shell(title: str, body: str, preferences_url: str = None, unsubscribe_url: str = None) -> str:
    footer = _footer(preferences_url, unsubscribe_url) if preferences_url and unsubscribe_url else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:{_CREAM};font-family:{_FONT_BODY};color:{_CHARCOAL};">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        {body}
        {footer}
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════
# UNIVERSAL EMAILS (sent to everyone)
# ═══════════════════════════════════════════════════════════════════

# ── Email 1: Welcome ──────────────────────────────────────────

def render_welcome(user_name: str, token: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 0: Universal welcome with intent detection links."""
    intent_links = f"""
    <tr><td style="padding:0 0 20px;">
      <p style="margin:0 0 12px;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        <strong>What brings you to GitStack?</strong> Click the link that fits:
      </p>
      <p style="margin:0 0 8px;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("I'm building something — generate my stack", f"{SITE_URL}/onboarding/intent?token={token}&type=stack-builder", _GREEN)}
      </p>
      <p style="margin:0 0 8px;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("I want to buy services/templates", f"{SITE_URL}/onboarding/intent?token={token}&type=buyer", _BLUE)}
      </p>
      <p style="margin:0 0 8px;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("I want to sell my skills/products", f"{SITE_URL}/onboarding/intent?token={token}&type=seller", _PURPLE)}
      </p>
      <p style="margin:0;font-family:{_FONT_BODY};font-size:15px;color:{_CHARCOAL};line-height:1.6;">
        {_link("Just here to discover tools", f"{SITE_URL}/onboarding/intent?token={token}&type=tool-hunter", _ORANGE)}
      </p>
    </td></tr>
    """

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 0</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Welcome to GitStack", "The open-source toolkit for founders who'd rather own their stack than rent it.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        GitStack is three things in one: <strong>discover open-source tools</strong>, <strong>build complete stacks</strong>, and <strong>buy or sell services</strong> in the marketplace.
      </p>
    </td></tr>

    {_section("1. Daily Drop", "Every morning: 3 curated tools that replace expensive SaaS. Real GitHub stars, real documentation, real savings.", _ORANGE)}
    {_section("2. Stack Generator", "Tell us what you're building and get a complete open-source stack — database, auth, hosting, analytics.", _BLUE)}
    {_section("3. Marketplace", "Buy setup services, SaaS templates, MCP servers, and skills. Or sell your own — keep 80%.", _PURPLE)}

    {_divider()}
    {intent_links}

    {_reply_prompt("What are you building? Hit reply and tell me — I read every response.")}
    {_ps("If this landed in Promotions, drag it to Primary so you don't miss tomorrow's tools.")}
    """
    return _email_shell("Welcome to GitStack", body, preferences_url, unsubscribe_url)


# ── Email 2: First Daily Drop ─────────────────────────────────

def render_first_daily_drop(user_name: str, tools: list, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 1: Universal — everyone gets the Daily Drop."""
    tools_html = ""
    for i, tool in enumerate(tools):
        accent = [_ORANGE, _GREEN, _PURPLE][i % 3]
        name = tool.get("name", "Unknown Tool")
        tagline = tool.get("tagline") or tool.get("description", "")
        url = tool.get("url", SITE_URL)
        icon = tool.get("icon_emoji", "🛠️")
        tools_html += _section(f"{icon} {name}", f"{tagline}<br><br>{_link('See how it works', url, accent)}", accent)

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo('Daily Drop')}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 1</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Your first Daily Drop", "3 open-source tools that save founders money.", _RED)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Here's how this works: every morning I send 3 open-source tools that replace expensive SaaS. No ads, no fluff — just tools with real GitHub stars, real documentation, and real savings.
      </p>
    </td></tr>

    {tools_html}

    {_reply_prompt("Reply and tell me what tool category you'd like to see next — AI, auth, analytics, hosting?")}
    {_ps("If this landed in Promotions, drag it to Primary so you don't miss tomorrow's tools.")}
    """
    return _email_shell("3 tools that save founders money", body, preferences_url, unsubscribe_url)


# ── Email 4: Stack Generator ──────────────────────────────────

def render_stack_generator(user_name: str, stack: dict, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 3: Universal — everyone benefits from stack generator."""
    categories = {
        "database": ("🗄️ Database", _BLUE),
        "auth": ("🔐 Auth", _GREEN),
        "hosting": ("🚀 Hosting", _ORANGE),
        "analytics": ("📊 Analytics", _PURPLE),
        "storage": ("☁️ Storage", _YELLOW),
        "search": ("🔍 Search", _RED),
    }

    tools_html = ""
    for key, (label, accent) in categories.items():
        tool = stack.get(key)
        if not tool:
            continue
        name = tool.get("name", "Unknown")
        tagline = tool.get("tagline") or tool.get("description", "")
        url = tool.get("url", SITE_URL)
        tools_html += _section(f"{label}: {name}", f"{tagline}<br><br>{_link('Learn more', url, accent)}", accent)

    total = stack.get("total_monthly_savings", 0)
    savings = f'<tr><td style="padding:0 0 20px;"><p style="margin:0;font-family:{_FONT_HEADING};font-size:16px;color:{_CHARCOAL};">💰 Estimated savings: <strong>${total}/mo</strong> vs. equivalent SaaS.</p></td></tr>' if total else ""

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 3</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Your open-source stack is ready", "Everything you need to build and ship — without the SaaS tax.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You told us you're building something. Here's a complete open-source stack tailored for you — every tool battle-tested by founders.
      </p>
    </td></tr>

    {tools_html}
    {savings}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Generate a new stack", f"{SITE_URL}/stack-generator", _RED)}</p></td></tr>

    {_reply_prompt("Need help setting any of these up? Reply and I'll point you to the best tutorials.")}
    {_ps("Each tool in this stack is self-hostable. No vendor lock-in, no surprise pricing hikes.")}
    """
    return _email_shell("Your open-source stack is ready", body, preferences_url, unsubscribe_url)


# ── Email 5: Repo Translator ──────────────────────────────────

def render_repo_translator(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 5: Universal — advanced feature showcase."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 5</td>
        </tr>
      </table>
    </td></tr>

    {_hero("The hidden feature most people miss", "Paste any GitHub repo and get instant human-readable context.", _YELLOW)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Found a cool open-source project but the README is sparse? Our Repo Translator reads the code and explains what it does, how to run it, and what to watch out for.
      </p>
    </td></tr>

    {_section("How it works", "Paste any GitHub URL → Select your stack type → Get a one-page summary in plain English. No more digging through 2,000 lines of code to understand what a tool does.", _ORANGE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Try Repo Translator", f"{SITE_URL}/repo-translator", _RED)}</p></td></tr>

    {_section("Roast My Stack", "Already have a stack? Upload it and we'll rate every tool on cost, security, and scalability — then suggest open-source replacements.", _RED)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Roast your stack", f"{SITE_URL}/roast-my-stack", _RED)}</p></td></tr>

    {_reply_prompt("Found a repo that's hard to understand? Send me the URL and I'll run it through the translator.")}
    {_ps("Roast My Stack uses real security and cost data — not just opinions.")}
    """
    return _email_shell("The hidden feature most people miss", body, preferences_url, unsubscribe_url)


# ═══════════════════════════════════════════════════════════════════
# INTENT-SPECIFIC EMAILS (Day 2 — First Touch)
# ═══════════════════════════════════════════════════════════════════

# ── Buyer: Day 2 ──────────────────────────────────────────────

def render_buyer_first_touch(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 2: Buyer sees marketplace categories and featured services."""
    categories_html = ""
    for cat, accent in zip(MARKETPLACE_CATEGORIES, [_ORANGE, _GREEN, _BLUE, _PURPLE, _YELLOW, _RED]):
        categories_html += _section(cat, f"Browse {cat} listings on the marketplace.<br><br>{_link(f'See {cat} listings', f'{SITE_URL}/marketplace?category={cat.lower().replace(chr(32), chr(45))}', accent)}", accent)

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo('Marketplace')}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 2</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Browse the Marketplace", "Buy setup services, templates, and skills from verified contributors.", _BLUE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        GitStack Marketplace is where open-source contributors sell their expertise. Need a Supabase setup? An n8n workflow? A custom MCP server? Someone here has built it before.
      </p>
    </td></tr>

    {_section("How buying works", "Browse → Buy → Contributor delivers in 48 hours → You review and approve. If it's not right, we refund. No escrow headaches.", _GREEN)}

    {categories_html}

    {_reply_prompt("What are you looking to buy? Reply and I'll point you to the best listings.")}
    {_ps("New listings are added every week. Check back for fresh skills and templates.")}
    """
    return _email_shell("Browse the GitStack Marketplace", body, preferences_url, unsubscribe_url)


# ── Seller: Day 2 ─────────────────────────────────────────────

def render_seller_first_touch(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 2: Seller sees how to become a contributor."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo('Marketplace')}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 2</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Become a Contributor", "Sell your skills, templates, and setup services. Keep 80% of every sale.", _PURPLE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You're good at something — Supabase setup, n8n automation, MCP server building, template creation. Founders on GitStack need that expertise and are willing to pay for it.
      </p>
    </td></tr>

    {_section("How selling works", "List your service → Set your price → Buyer purchases → You deliver in 48 hours → Get paid. We handle the transaction, you keep 80%.", _GREEN)}
    {_section("What you can sell", "<strong>SaaS setups</strong> — Configure Supabase, n8n, Plausible for clients<br><br><strong>MCP Servers</strong> — Build custom Model Context Protocol integrations<br><br><strong>Templates</strong> — Sell boilerplate code, starter kits, themes<br><br><strong>Skills</strong> — One-time consultations, code reviews, architecture advice<br><br><strong>Computer Vision</strong> — OCR pipelines, object detection setups, image processing workflows", _ORANGE)}
    {_section("Seller dashboard", "Track orders, communicate with buyers, manage payouts, and build your reputation with reviews.", _BLUE)}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("List your first service", f"{SITE_URL}/marketplace/sell", _RED)}</p></td></tr>

    {_reply_prompt("What skill do you want to sell? Reply and I'll help you price and position it.")}
    {_ps("Top contributors earn $500-2,000/month selling setup services and templates.")}
    """
    return _email_shell("Become a GitStack Contributor", body, preferences_url, unsubscribe_url)


# ── Stack Builder: Day 2 ──────────────────────────────────────

def render_stack_builder_first_touch(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 2: Stack builder sees advanced stack features."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 2</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Deep Dive: Stack Generator", "Go beyond the basics — build production-ready stacks.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        The Stack Generator isn't just a toy — it's how serious founders choose infrastructure. Here's how to get the most out of it.
      </p>
    </td></tr>

    {_section("1. Be specific", "Instead of 'SaaS app', try 'SaaS app with real-time collaboration, 10k users, EU data residency'. The more specific, the better the stack.", _ORANGE)}
    {_section("2. Check compatibility", "Every tool in your stack is tested for compatibility. No more 'does X work with Y?' — we verify it.", _BLUE)}
    {_section("3. Estimate real costs", "We compare self-hosted vs managed pricing so you know exactly what you're saving. Often 80-95% cheaper than equivalent SaaS.", _GREEN)}
    {_section("4. Get it set up", "Don't want to configure it yourself? Hire a contributor from the marketplace to set up your entire stack in 48 hours.", _PURPLE)}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Build your production stack", f"{SITE_URL}/stack-generator", _RED)}</p></td></tr>

    {_reply_prompt("What are you building? Reply with details and I'll suggest the perfect stack.")}
    {_ps("The average stack saves $147/month in SaaS subscriptions.")}
    """
    return _email_shell("Deep Dive: Stack Generator", body, preferences_url, unsubscribe_url)


# ── Tool Hunter: Day 2 ────────────────────────────────────────

def render_tool_hunter_first_touch(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 2: Tool hunter sees advanced discovery features."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 2</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Beyond the Daily Drop", "Advanced ways to discover open-source tools.", _ORANGE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        The Daily Drop is just the beginning. Here are four more ways to find the perfect tool for your stack.
      </p>
    </td></tr>

    {_section("1. Trending This Week", "See what's gaining stars fast — often the best signal of a tool's momentum. We update this every 6 hours.", _RED)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("See trending", f"{SITE_URL}/trending", _RED)}</p></td></tr>

    {_section("2. Collections", "Curated lists by category: AI/ML, Auth, Analytics, Hosting, Databases, Automation. Each collection is battle-tested by founders.", _BLUE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Browse collections", f"{SITE_URL}/collections", _RED)}</p></td></tr>

    {_section("3. Repo of the Day", "One exceptional repo every day — not just popular, but genuinely useful. With setup guide and business use case.", _GREEN)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("See today's repo", f"{SITE_URL}/repo-of-the-day", _RED)}</p></td></tr>

    {_section("4. Search by Replaces", "Looking for a specific SaaS replacement? Search 'replaces: Zapier' or 'replaces: Firebase' and find the open-source alternative.", _PURPLE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Search replacements", f"{SITE_URL}/search", _RED)}</p></td></tr>

    {_reply_prompt("What SaaS are you trying to replace? Reply and I'll find the best open-source alternative.")}
    {_ps("We index 10,000+ repos. If it exists and it's good, we probably have it.")}
    """
    return _email_shell("Beyond the Daily Drop", body, preferences_url, unsubscribe_url)


# ═══════════════════════════════════════════════════════════════════
# INTENT-SPECIFIC EMAILS (Day 7 — Conversion)
# ═══════════════════════════════════════════════════════════════════

# ── Buyer: Day 7 ──────────────────────────────────────────────

def render_buyer_conversion(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 7: Buyer is ready to make their first purchase."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo('Marketplace')}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 7</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Ready to buy?", "Featured services from verified contributors.", _BLUE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You've browsed the marketplace. Now it's time to get something built. Here are our most popular services — all delivered in 48 hours with a money-back guarantee.
      </p>
    </td></tr>

    {_section("Supabase Complete Setup", "Auth + database + storage + edge functions configured for production. Includes Row Level Security, email templates, and API docs.", _GREEN)}
    {_section("n8n Workflow Automation", "Connect your entire stack with 400+ integrations. CRM, email, payments, notifications — all automated.", _ORANGE)}
    {_section("MCP Server Build", "Custom Model Context Protocol server for your use case. Connect any API to Claude, Cursor, or any MCP client.", _PURPLE)}
    {_section("Landing Page Template", "High-converting SaaS landing page built with Next.js + Tailwind. SEO-optimized, fast, and customizable.", _BLUE)}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Browse all services", f"{SITE_URL}/marketplace", _RED)}</p></td></tr>

    {_section("How it works", "1. Browse and buy<br>2. Contributor starts within 24 hours<br>3. Delivery in 48 hours<br>4. You review and approve<br>5. Not satisfied? Full refund.", _GREEN)}

    {_reply_prompt("What do you need built? Reply and I'll match you with the right contributor.")}
    {_ps("First-time buyers get 10% off with code FIRST10.")}
    """
    return _email_shell("Ready to buy?", body, preferences_url, unsubscribe_url)


# ── Seller: Day 7 ─────────────────────────────────────────────

def render_seller_conversion(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 7: Seller is ready to list their first service."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo('Marketplace')}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 7</td>
        </tr>
      </table>
    </td></tr>

    {_hero("List your first service", "Turn your skills into income. Here's exactly how.", _PURPLE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You've seen the marketplace. Now let's get you selling. Here's the step-by-step guide to listing your first service and getting your first buyer.
      </p>
    </td></tr>

    {_section("Step 1: Pick your category", "SaaS, MCP Servers, Computer Vision, Templates, Skills, or Other. Pick where your expertise fits best.", _ORANGE)}
    {_section("Step 2: Write a clear offer", "Don't say 'I do web development'. Say 'I will set up Supabase auth + database + storage for your SaaS in 24 hours'. Specific sells.", _BLUE)}
    {_section("Step 3: Price competitively", "Most successful listings are $49-199 for setup services. Templates sell at $19-49. Skills/consultations at $99-299. Start low, raise prices as you get reviews.", _GREEN)}
    {_section("Step 4: Deliver fast", "48-hour delivery is our standard. Contributors who deliver in 24 hours get 3x more repeat buyers.", _YELLOW)}
    {_section("Step 5: Get reviews", "Your first 5 reviews are everything. Consider offering a discount to early buyers in exchange for honest feedback.", _RED)}

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("List your first service", f"{SITE_URL}/marketplace/sell", _RED)}</p></td></tr>

    {_reply_prompt("What do you want to sell? Reply and I'll help you write the listing.")}
    {_ps("New sellers who list within 7 days of signup are 4x more likely to get their first sale.")}
    """
    return _email_shell("List your first service", body, preferences_url, unsubscribe_url)


# ── Stack Builder: Day 7 ──────────────────────────────────────

def render_stack_builder_conversion(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 7: Stack builder gets hosting + deployment guidance."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 7</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Your stack needs a home", "Hosting, deployment, and maintenance — without the cloud tax.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You've picked your stack. Now you need to host it. Here's how to deploy your open-source tools without paying $500/month to Vercel or AWS.
      </p>
    </td></tr>

    {_section("Coolify — The open-source Heroku", "Self-hosted PaaS that deploys anything. One server, unlimited apps. $5/month instead of $200+.", _BLUE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Learn about Coolify", f"{SITE_URL}/tools/coolifylabs/coolify", _RED)}</p></td></tr>

    {_section("Dokploy — Docker deployments made simple", "Point Dokploy at your GitHub repo and it builds, deploys, and manages SSL automatically.", _ORANGE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Learn about Dokploy", f"{SITE_URL}/tools/dokploy/dokploy", _RED)}</p></td></tr>

    {_section("Hire a deployment expert", "Don't want to deal with servers? A GitStack contributor can set up your entire production environment in 48 hours for $99-199.", _PURPLE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Find a deployment expert", f"{SITE_URL}/marketplace?category=skills", _RED)}</p></td></tr>

    {_reply_prompt("Stuck on deployment? Reply with your stack and I'll point you to the right hosting guide.")}
    {_ps("Self-hosting your entire stack typically costs $20-50/month vs $300-800 for managed equivalents.")}
    """
    return _email_shell("Your stack needs a home", body, preferences_url, unsubscribe_url)


# ── Tool Hunter: Day 7 ────────────────────────────────────────

def render_tool_hunter_conversion(user_name: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 7: Tool hunter joins community + submits tools."""
    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 7</td>
        </tr>
      </table>
    </td></tr>

    {_hero("Join the community", "4,300+ founders discovering and sharing open-source tools.", _ORANGE)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You've been discovering tools for a week. Here's how to go deeper — submit tools, vote on picks, and connect with other founders.
      </p>
    </td></tr>

    {_section("Submit a tool", "Found something great we haven't covered? Submit it and get credited when it gets featured.", _GREEN)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Submit a tool", f"{SITE_URL}/submit", _RED)}</p></td></tr>

    {_section("Vote on tomorrow's picks", "Community voting decides which tools make the Daily Drop. Your vote matters.", _BLUE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Vote on tools", f"{SITE_URL}/vote", _RED)}</p></td></tr>

    {_section("Stack Generator", "Ready to stop just reading about tools and actually build something? Generate a complete stack in 60 seconds.", _PURPLE)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Build your stack", f"{SITE_URL}/stack-generator", _RED)}</p></td></tr>

    {_section("Browse collections", "Curated lists by use case: AI startups, SaaS boilerplates, privacy-focused tools, indie hacker stacks.", _YELLOW)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link("Browse collections", f"{SITE_URL}/collections", _RED)}</p></td></tr>

    {_reply_prompt("What tool should we feature next? Reply with the GitHub URL.")}
    {_ps("Top community contributors get early access to new features and exclusive tool data.")}
    """
    return _email_shell("Join the community", body, preferences_url, unsubscribe_url)


# ═══════════════════════════════════════════════════════════════════
# RE-ENGAGEMENT + SOCIAL PROOF (Day 10 + Day 14)
# ═══════════════════════════════════════════════════════════════════

# ── Day 10: Re-engagement ─────────────────────────────────────

def render_re_engagement(user_name: str, intent: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 10: Sent if user hasn't been active. Gentle nudge."""
    intent_cta = {
        "buyer": ("Browse the marketplace", f"{SITE_URL}/marketplace", "Find services that save you weeks of work."),
        "seller": ("List your first service", f"{SITE_URL}/marketplace/sell", "Turn your skills into income — takes 5 minutes."),
        "stack-builder": ("Generate your stack", f"{SITE_URL}/stack-generator", "Build a complete open-source stack in 60 seconds."),
        "tool-hunter": ("See trending tools", f"{SITE_URL}/trending", "Discover what's hot this week in open source."),
    }
    cta_text, cta_url, cta_sub = intent_cta.get(intent, intent_cta["tool-hunter"])

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 10</td>
        </tr>
      </table>
    </td></tr>

    {_hero("We miss you", "Here's a quick win you can get in 5 minutes.", _YELLOW)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        You signed up for GitStack but haven't dove in yet. No pressure — but here's one thing that takes 5 minutes and might change how you build.
      </p>
    </td></tr>

    {_section(cta_text, cta_sub, _RED)}
    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link(cta_text, cta_url, _RED)}</p></td></tr>

    {_section("Not what you're looking for?", f"Reply and tell me what you need — I'll point you to the right feature. Or <a href='{unsubscribe_url}' style='color:{_MUTED};text-decoration:underline;'>unsubscribe</a> if this isn't for you. No hard feelings.", _MUTED)}

    {_reply_prompt("What would make GitStack useful for you? Reply and I'll personally help.")}
    """
    return _email_shell("We miss you", body, preferences_url, unsubscribe_url)


# ── Day 14: Social Proof ──────────────────────────────────────

def render_social_proof(user_name: str, intent: str, preferences_url: str, unsubscribe_url: str) -> str:
    """Day 14: Intent-specific success stories."""
    stories = {
        "buyer": (
            "How a founder saved $12,000/year",
            "Mark needed auth + database + storage for his SaaS. He bought a Supabase setup service on GitStack for $149. It was live in 36 hours. He's now spent $0 on Firebase for 8 months.",
            f"{SITE_URL}/marketplace",
            "Browse services",
        ),
        "seller": (
            "How a developer made $3,200 in 3 months",
            "Sarah listed n8n workflow automation services on GitStack. Her first sale came in 4 days. By month 3, she had 18 repeat clients and quit her freelance platform that took 20%.",
            f"{SITE_URL}/marketplace/sell",
            "Start selling",
        ),
        "stack-builder": (
            "How a startup cut infrastructure costs by 87%",
            "The team at TaskFlow replaced Vercel, Auth0, and Stripe with Coolify, Keycloak, and LemonSqueezy. Their monthly infra bill dropped from $847 to $112. Same performance, full ownership.",
            f"{SITE_URL}/stack-generator",
            "Build your stack",
        ),
        "tool-hunter": (
            "The tool that replaced 3 SaaS subscriptions",
            "n8n now handles TaskFlow's onboarding emails, Slack notifications, and CRM updates — replacing Zapier ($50/mo), Mailchimp ($30/mo), and a custom integration ($200/mo dev time). Total cost: $0.",
            f"{SITE_URL}/repo-of-the-day",
            "See today's tool",
        ),
    }
    title, story, cta_url, cta_text = stories.get(intent, stories["tool-hunter"])

    body = f"""
    <tr><td style="padding-bottom:16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;">{_logo()}</td>
          <td align="right" style="font-family:{_FONT_MONO};font-size:11px;color:{_MUTED};">Day 14</td>
        </tr>
      </table>
    </td></tr>

    {_hero(title, "Real GitStack users, real results.", _GREEN)}
    {_divider()}

    <tr><td style="padding:0 0 16px;">
      <p style="margin:0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        Hey {user_name or 'there'},
      </p>
      <p style="margin:8px 0 0;font-family:{_FONT_BODY};font-size:16px;color:{_CHARCOAL};line-height:1.6;">
        {story}
      </p>
    </td></tr>

    <tr><td style="padding:0 0 20px;"><p style="margin:0;">{_link(cta_text, cta_url, _RED)}</p></td></tr>

    {_section("Your turn", "Every story starts with one action. Pick one thing from GitStack and try it today. Reply and tell me what you're working on — I read every email.", _ORANGE)}

    {_reply_prompt("What's your biggest challenge right now? Reply and I'll suggest a tool or service.")}
    {_ps("These are real users. Want to be featured? Reply with your story.")}
    """
    return _email_shell(title, body, preferences_url, unsubscribe_url)


# ═══════════════════════════════════════════════════════════════════
# SENDER + SCHEDULER
# ═══════════════════════════════════════════════════════════════════

def _get_user_intent(user: dict) -> str:
    """Get onboarding intent from user doc. Falls back to tool-hunter."""
    intent = user.get("onboarding_intent")
    if intent in ["buyer", "seller", "stack-builder", "tool-hunter"]:
        return intent
    # Try to infer from behavior
    if user.get("seller_profile") or user.get("listed_products"):
        return "seller"
    if user.get("purchases"):
        return "buyer"
    if user.get("saved_stacks"):
        return "stack-builder"
    return "tool-hunter"


async def send_onboarding_email(
    email: str,
    user_name: str,
    email_type: str,
    db: AsyncIOMotorDatabase = None,
    tools: list = None,
    stack: dict = None,
    intent: str = "tool-hunter",
) -> bool:
    """Send a single onboarding drip email.
    
    email_type can be:
      welcome, first_daily_drop, stack_generator, repo_translator,
      buyer_first_touch, seller_first_touch, stack_builder_first_touch, tool_hunter_first_touch,
      buyer_conversion, seller_conversion, stack_builder_conversion, tool_hunter_conversion,
      re_engagement, social_proof
    """

    token = _generate_email_token(email)
    preferences_url = f"{SITE_URL}/newsletter/preferences?token={token}"
    unsubscribe_url = f"{SITE_URL}/newsletter/unsubscribe?token={token}"

    # Map email_type to renderer + subject
    renderers = {
        # Universal
        "welcome": ("Welcome to GitStack — here's how to get started", lambda: render_welcome(user_name, token, preferences_url, unsubscribe_url)),
        "first_daily_drop": ("3 tools that save founders money", lambda: render_first_daily_drop(user_name, tools or [], preferences_url, unsubscribe_url)),
        "stack_generator": ("Your open-source stack is ready", lambda: render_stack_generator(user_name, stack or {}, preferences_url, unsubscribe_url)),
        "repo_translator": ("The hidden feature most people miss", lambda: render_repo_translator(user_name, preferences_url, unsubscribe_url)),
        # Intent-specific Day 2
        "buyer_first_touch": ("Browse the GitStack Marketplace", lambda: render_buyer_first_touch(user_name, preferences_url, unsubscribe_url)),
        "seller_first_touch": ("Become a GitStack Contributor", lambda: render_seller_first_touch(user_name, preferences_url, unsubscribe_url)),
        "stack_builder_first_touch": ("Deep Dive: Stack Generator", lambda: render_stack_builder_first_touch(user_name, preferences_url, unsubscribe_url)),
        "tool_hunter_first_touch": ("Beyond the Daily Drop", lambda: render_tool_hunter_first_touch(user_name, preferences_url, unsubscribe_url)),
        # Intent-specific Day 7
        "buyer_conversion": ("Ready to buy?", lambda: render_buyer_conversion(user_name, preferences_url, unsubscribe_url)),
        "seller_conversion": ("List your first service", lambda: render_seller_conversion(user_name, preferences_url, unsubscribe_url)),
        "stack_builder_conversion": ("Your stack needs a home", lambda: render_stack_builder_conversion(user_name, preferences_url, unsubscribe_url)),
        "tool_hunter_conversion": ("Join the community", lambda: render_tool_hunter_conversion(user_name, preferences_url, unsubscribe_url)),
        # Re-engagement + social proof
        "re_engagement": ("We miss you", lambda: render_re_engagement(user_name, intent, preferences_url, unsubscribe_url)),
        "social_proof": ("How founders are winning with open source", lambda: render_social_proof(user_name, intent, preferences_url, unsubscribe_url)),
    }

    if email_type not in renderers:
        logger.warning(f"Unknown onboarding email type: {email_type}")
        return False

    subject, render_fn = renderers[email_type]

    try:
        html = render_fn()
        await send_email(
            to=email,
            subject=subject,
            body=html,
            sender="hello",
        )
        logger.info(f"Onboarding email sent: {email_type} → {email}")

        if db is not None:
            await db.users.update_one(
                {"email": email},
                {
                    "$push": {
                        "onboarding_drip": {
                            "step": email_type,
                            "sent_at": datetime.now(timezone.utc),
                        }
                    }
                },
            )
        return True
    except Exception as e:
        logger.error(f"Failed to send onboarding email {email_type} to {email}: {e}")
        return False


def _generate_email_token(email: str) -> str:
    import jwt as pyjwt
    secret = os.environ.get("EMAIL_TOKEN_SECRET", os.environ.get("SMTP_PASSWORD", "dev-secret-change-me"))
    payload = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, secret, algorithm="HS256")


async def run_onboarding_drip(db: AsyncIOMotorDatabase) -> dict:
    """Run the intent-based onboarding drip for all users who haven't completed it."""
    results = {"sent": 0, "failed": 0, "skipped": 0}

    now = datetime.now(timezone.utc)
    pipeline = [
        {
            "$match": {
                "email": {"$exists": True, "$ne": ""},
                "$or": [
                    {"onboarding_drip": {"$exists": False}},
                    {"onboarding_drip": {"$not": {"$size": 8}}},
                ],
            }
        },
        {"$sort": {"createdAt": 1}},
        {"$limit": 100},
    ]

    async for user in db.users.aggregate(pipeline):
        email = user.get("email")
        name = user.get("firstName") or user.get("name") or ""
        drip = user.get("onboarding_drip", [])
        signup_at = user.get("createdAt")
        if not signup_at:
            results["skipped"] += 1
            continue
        if isinstance(signup_at, str):
            signup_at = datetime.fromisoformat(signup_at.replace("Z", "+00:00"))
        age_days = (now - signup_at).days

        sent_types = {d["step"] for d in drip}
        intent = _get_user_intent(user)

        # Day 2 intent-specific mapping
        day2_map = {
            "buyer": "buyer_first_touch",
            "seller": "seller_first_touch",
            "stack-builder": "stack_builder_first_touch",
            "tool-hunter": "tool_hunter_first_touch",
        }
        # Day 7 intent-specific mapping
        day7_map = {
            "buyer": "buyer_conversion",
            "seller": "seller_conversion",
            "stack-builder": "stack_builder_conversion",
            "tool-hunter": "tool_hunter_conversion",
        }

        step_map = [
            (0, "welcome", None, None),
            (1, "first_daily_drop", "tools", None),
            (2, day2_map.get(intent, "tool_hunter_first_touch"), None, None),
            (3, "stack_generator", None, "stack"),
            (5, "repo_translator", None, None),
            (7, day7_map.get(intent, "tool_hunter_conversion"), None, None),
            (10, "re_engagement", None, None),
            (14, "social_proof", None, None),
        ]

        for day, step, tools_key, stack_key in step_map:
            if step in sent_types:
                continue
            if age_days >= day:
                kwargs = {"intent": intent}
                if tools_key:
                    kwargs[tools_key] = []
                if stack_key:
                    kwargs[stack_key] = {}
                success = await send_onboarding_email(
                    email=email,
                    user_name=name,
                    email_type=step,
                    db=db,
                    **kwargs,
                )
                if success:
                    results["sent"] += 1
                else:
                    results["failed"] += 1
                break
            else:
                break
        else:
            results["skipped"] += 1

    logger.info(f"Onboarding drip complete: {results}")
    return results
