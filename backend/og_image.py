"""
Dynamic OG Image Generation for GitStack
Generates PNG-based social share images using Pillow (works on Twitter, Facebook, LinkedIn, Discord, Slack)
"""

from fastapi import APIRouter
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont
import httpx
import io
import os

router = APIRouter(prefix="/og", tags=["og"])

# OG image canonical size for all major platforms
WIDTH = 1200
HEIGHT = 630

# Brand colors
BG_COLOR = (10, 10, 10)        # #0a0a0a
GRID_COLOR = (26, 26, 26)      # #1a1a1a
ACCENT_COLOR = (37, 99, 235)   # #2563eb
TEXT_COLOR = (255, 255, 255)
MUTED_COLOR = (153, 153, 153)  # #999
SUBTLE_COLOR = (102, 102, 102) # #666
STAR_COLOR = (251, 191, 36)    # #fbbf24
LANG_COLOR = (16, 185, 129)    # #10b981
PANEL_COLOR = (26, 26, 26)


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Load a system font with fallbacks. Falls back to default if none found."""
    candidates_bold = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    candidates_regular = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for path in (candidates_bold if bold else candidates_regular):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _truncate(text: str, max_len: int) -> str:
    if not text:
        return ""
    return text[: max_len - 1] + "…" if len(text) > max_len else text


def _format_stars(stars: int) -> str:
    if stars >= 1000:
        return f"{stars/1000:.1f}k".replace(".0k", "k")
    return str(stars) if stars > 0 else "—"


def generate_repo_og_png(owner: str, repo: str, stars: int = 0, language: str = "", description: str = "") -> bytes:
    """Generate a 1200x630 PNG OG image for a GitHub repo."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Subtle grid background
    for x in range(0, WIDTH, 40):
        draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=1)
    for y in range(0, HEIGHT, 40):
        draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=1)

    # Left accent bar
    draw.rectangle([(60, 60), (68, 570)], fill=ACCENT_COLOR)

    # Branding
    font_brand = _load_font(24, bold=True)
    draw.text((100, 100), "gitstack.pro", font=font_brand, fill=SUBTLE_COLOR)

    # Owner / Repo (big title)
    font_title = _load_font(72, bold=True)
    owner_text = f"{owner}/"
    draw.text((100, 160), owner_text, font=font_title, fill=TEXT_COLOR)
    # Get width of owner text to position repo on next line
    draw.text((100, 250), _truncate(repo, 22), font=font_title, fill=ACCENT_COLOR)

    # Description
    font_desc = _load_font(28)
    draw.text((100, 360), _truncate(description or "Explained in plain English", 70), font=font_desc, fill=MUTED_COLOR)

    # Stats panel
    draw.rounded_rectangle([(100, 480), (1100, 560)], radius=8, fill=PANEL_COLOR)

    # Stars (yellow circle dot before count)
    font_stat = _load_font(28, bold=True)
    draw.ellipse([(125, 510), (145, 530)], fill=STAR_COLOR)
    draw.text((160, 506), f"{_format_stars(stars)} stars", font=font_stat, fill=STAR_COLOR)

    # Language (green dot)
    draw.ellipse([(395, 510), (415, 530)], fill=LANG_COLOR)
    draw.text((430, 506), f"{language or 'Unknown'}", font=font_stat, fill=LANG_COLOR)

    # CTA
    font_cta = _load_font(24, bold=True)
    draw.text((720, 510), "Explained in Plain English  >", font=font_cta, fill=SUBTLE_COLOR)

    # Bottom accent
    draw.rectangle([(100, 580), (300, 584)], fill=ACCENT_COLOR)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generate_stack_og_png(slug: str) -> bytes:
    """Generate a 1200x630 PNG OG image for a user stack."""
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    for x in range(0, WIDTH, 40):
        draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=1)
    for y in range(0, HEIGHT, 40):
        draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=1)

    draw.rectangle([(60, 60), (68, 570)], fill=ACCENT_COLOR)

    font_brand = _load_font(24, bold=True)
    draw.text((100, 100), "gitstack.pro", font=font_brand, fill=SUBTLE_COLOR)

    font_label = _load_font(48, bold=True)
    draw.text((100, 220), "Tech Stack", font=font_label, fill=TEXT_COLOR)

    font_title = _load_font(56, bold=True)
    title = slug.replace("-", " ").title()
    draw.text((100, 290), _truncate(title, 28), font=font_title, fill=ACCENT_COLOR)

    font_desc = _load_font(28)
    draw.text((100, 400), "Curated open-source tools for founders", font=font_desc, fill=MUTED_COLOR)

    draw.rectangle([(100, 580), (300, 584)], fill=ACCENT_COLOR)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@router.get("/repo/{owner}/{repo}")
async def get_repo_og_image(owner: str, repo: str):
    """
    Generate PNG OG image for a GitHub repository.
    Example: /og/repo/vercel/next.js
    """
    stars = 0
    language = ""
    description = "Open source tool on GitHub"

    try:
        # Fetch live repo data from GitHub API
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if response.status_code == 200:
                data = response.json()
                stars = data.get("stargazers_count", 0)
                language = data.get("language") or ""
                description = data.get("description") or description
    except Exception:
        pass  # Use fallback values

    png = generate_repo_og_png(owner, repo, stars, language, description)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/stack/{slug}")
async def get_stack_og_image(slug: str):
    """Generate PNG OG image for a user stack."""
    png = generate_stack_og_png(slug)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=3600"},
    )
