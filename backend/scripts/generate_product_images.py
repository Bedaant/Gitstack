"""Generate neo-brutalist product mockup images for GitStack marketplace.

Run:
    cd backend && python scripts/generate_product_images.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "public", "product-images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Colors
BG = "#FFFFFF"
FG = "#09090B"
PRIMARY = "#2563EB"
MINT = "#A7F3D0"
YELLOW = "#FEF08A"
LAVENDER = "#E9D5FF"
PINK = "#FBCFE8"
MUTED = "#F4F4F5"

PRODUCTS = [
    {
        "id": "open-crm",
        "title": "OpenCRM",
        "tagline": "Customer management that replaces HubSpot",
        "features": ["Contact database", "Deal pipeline", "Email sync", "Team roles"],
        "color": MINT,
        "icon": "👥",
    },
    {
        "id": "bookstack",
        "title": "BookStack",
        "tagline": "Self-hosted booking that beats Calendly",
        "features": ["Calendar slots", "Stripe payments", "Auto Zoom links", "Reminders"],
        "color": YELLOW,
        "icon": "📅",
    },
    {
        "id": "invoiceforge",
        "title": "InvoiceForge",
        "tagline": "Invoicing for freelancers & agencies",
        "features": ["PDF invoices", "Stripe/PayPal", "Recurring bills", "Client portal"],
        "color": LAVENDER,
        "icon": "💰",
    },
    {
        "id": "visionkit",
        "title": "VisionKit",
        "tagline": "Computer vision API starter",
        "features": ["Object detection", "OCR text extract", "Image classify", "FastAPI server"],
        "color": PINK,
        "icon": "👁️",
    },
    {
        "id": "mcp-notion",
        "title": "MCP-Notion",
        "tagline": "Connect AI agents to Notion",
        "features": ["Database queries", "Page creation", "Block editing", "AI sync"],
        "color": MINT,
        "icon": "📝",
    },
    {
        "id": "mcp-slack",
        "title": "MCP-Slack",
        "tagline": "AI agents in your Slack workspace",
        "features": ["Channel search", "Send messages", "Thread replies", "File upload"],
        "color": YELLOW,
        "icon": "💬",
    },
    {
        "id": "saas-boiler",
        "title": "SaaS-Boiler",
        "tagline": "Launch your startup this weekend",
        "features": ["Next.js + Auth", "Stripe payments", "Admin dashboard", "Emails"],
        "color": LAVENDER,
        "icon": "🚀",
    },
    {
        "id": "ai-agent",
        "title": "AI-Agent-Template",
        "tagline": "Build AI agents that actually work",
        "features": ["ReAct pattern", "Tool calling", "Memory", "Streaming"],
        "color": PINK,
        "icon": "🤖",
    },
    {
        "id": "clerk-auth",
        "title": "Clerk-Auth-Skill",
        "tagline": "Enterprise auth for Next.js apps",
        "features": ["Organizations", "Role-based access", "Webhooks", "Protected routes"],
        "color": MINT,
        "icon": "🔐",
    },
    {
        "id": "deployscript",
        "title": "DeployScript",
        "tagline": "One-command Docker deployments",
        "features": ["5 stack configs", "SSL auto-renew", "Health checks", "Monitoring"],
        "color": YELLOW,
        "icon": "⚡",
    },
]


def get_font(size):
    """Try to load a decent font, fall back to default."""
    for name in ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except:
            continue
    return ImageFont.load_default()


def get_font_regular(size):
    for name in ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except:
            continue
    return ImageFont.load_default()


def draw_neo_shadow(draw, x, y, w, h, offset=6):
    """Draw brutalist shadow."""
    draw.rectangle([x + offset, y + offset, x + offset + w, y + offset + h], fill=FG)


def draw_feature_box(draw, x, y, w, h, color, icon, text, font_small, font_tiny):
    draw_neo_shadow(draw, x, y, w, h, 4)
    draw.rectangle([x, y, x + w, y + h], fill=color, outline=FG, width=3)
    # Icon
    draw.text((x + 12, y + 10), icon, font=font_small, fill=FG)
    # Text
    draw.text((x + 12, y + 40), text, font=font_tiny, fill=FG)


def generate_hero(product):
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    font_title = get_font(48)
    font_tagline = get_font_regular(22)
    font_feature = get_font(18)
    font_small = get_font(14)
    font_icon = get_font(32)

    # Shadow for main card
    draw_neo_shadow(draw, 30, 30, W - 60, H - 60, 8)
    draw.rectangle([30, 30, W - 30, H - 30], fill=BG, outline=FG, width=4)

    # Header bar
    draw.rectangle([30, 30, W - 30, 100], fill=product["color"], outline=FG, width=4)
    draw.text((50, 45), product["icon"], font=font_icon, fill=FG)
    draw.text((100, 42), product["title"], font=font_title, fill=FG)

    # Tagline
    draw.text((50, 120), product["tagline"], font=font_tagline, fill="#52525B")

    # Feature boxes - 2x2 grid
    box_w, box_h = 340, 90
    gap = 20
    start_x, start_y = 50, 170
    positions = [
        (start_x, start_y),
        (start_x + box_w + gap, start_y),
        (start_x, start_y + box_h + gap),
        (start_x + box_w + gap, start_y + box_h + gap),
    ]
    for i, feat in enumerate(product["features"]):
        if i < 4:
            x, y = positions[i]
            colors = [MINT, YELLOW, LAVENDER, PINK]
            draw_feature_box(draw, x, y, box_w, box_h, colors[i], "✓", feat, font_feature, font_small)

    # Bottom CTA bar
    draw.rectangle([50, 470, W - 50, 550], fill=PRIMARY, outline=FG, width=4)
    cta_text = f"Pay once · Own forever · {product['title']}"
    bbox = draw.textbbox((0, 0), cta_text, font=font_tagline)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, 500), cta_text, font=font_tagline, fill="white")

    # Border
    draw.rectangle([0, 0, W - 1, H - 1], outline=FG, width=8)

    path = os.path.join(OUTPUT_DIR, f"{product['id']}.png")
    img.save(path, "PNG")
    print(f"  Generated {path}")


def generate_detail_1(product):
    """Dashboard/mockup style image."""
    W, H = 800, 600
    img = Image.new("RGB", (W, H), MUTED)
    draw = ImageDraw.Draw(img)

    font_title = get_font(28)
    font_text = get_font_regular(16)
    font_bold = get_font(16)

    # Browser chrome
    draw.rectangle([40, 40, W - 40, 80], fill=FG, outline=FG, width=3)
    draw.ellipse([55, 52, 70, 67], fill="#EF4444")
    draw.ellipse([75, 52, 90, 67], fill="#F59E0B")
    draw.ellipse([95, 52, 110, 67], fill="#22C55E")
    draw.text((120, 50), f"https://gitstack.pro/marketplace/{product['id']}", font=font_text, fill="white")

    # Content area
    draw.rectangle([40, 80, W - 40, H - 40], fill=BG, outline=FG, width=4)

    # Sidebar
    draw.rectangle([40, 80, 180, H - 40], fill=product["color"], outline=FG, width=3)
    for i, feat in enumerate(product["features"]):
        draw.text((55, 110 + i * 40), f"▸ {feat}", font=font_text, fill=FG)

    # Main content - mock dashboard
    draw.text((200, 100), f"{product['title']} Dashboard", font=font_title, fill=FG)

    # Stats cards
    stats = [("Users", "1,247"), ("Revenue", "₹89K"), ("Growth", "+34%")]
    for i, (label, val) in enumerate(stats):
        x = 200 + i * 190
        draw_neo_shadow(draw, x, 150, 170, 80, 4)
        draw.rectangle([x, 150, x + 170, 230], fill=[MINT, YELLOW, LAVENDER][i], outline=FG, width=3)
        draw.text((x + 15, 160), label, font=font_text, fill="#52525B")
        draw.text((x + 15, 185), val, font=font_title, fill=FG)

    # Table/chart area
    draw.rectangle([200, 260, W - 60, 520], fill=MUTED, outline=FG, width=3)
    draw.text((220, 270), "Recent Activity", font=font_bold, fill=FG)
    for i in range(5):
        y = 310 + i * 35
        draw.rectangle([220, y, W - 80, y + 25], fill=BG, outline=FG, width=2)
        draw.text((230, y + 3), f"● Activity {i+1}: {product['features'][i % 4]} updated", font=font_text, fill=FG)

    path = os.path.join(OUTPUT_DIR, f"{product['id']}-detail.png")
    img.save(path, "PNG")
    print(f"  Generated {path}")


def generate_benefit(product):
    """Before/After benefit image."""
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    font_title = get_font(36)
    font_text = get_font_regular(20)
    font_bold = get_font(20)

    draw.text((50, 40), f"Why {product['title']}?", font=font_title, fill=FG)

    # Before box
    draw_neo_shadow(draw, 50, 100, 330, 400, 6)
    draw.rectangle([50, 100, 380, 500], fill="#FECACA", outline=FG, width=4)
    draw.text((70, 120), "BEFORE", font=font_title, fill="#991B1B")
    before_items = ["❌ Monthly SaaS fees", "❌ Vendor lock-in", "❌ Data owned by others", "❌ Limited customization"]
    for i, item in enumerate(before_items):
        draw.text((70, 180 + i * 60), item, font=font_text, fill="#7F1D1D")

    # Arrow
    draw.polygon([(400, 280), (440, 260), (440, 275), (480, 275), (480, 285), (440, 285), (440, 300)], fill=PRIMARY, outline=FG)

    # After box
    draw_neo_shadow(draw, 500, 100, 250, 400, 6)
    draw.rectangle([500, 100, 750, 500], fill=product["color"], outline=FG, width=4)
    draw.text((520, 120), "AFTER", font=font_title, fill=FG)
    after_items = ["✅ Pay once", "✅ Own forever", "✅ Your data", "✅ Full control"]
    for i, item in enumerate(after_items):
        draw.text((520, 180 + i * 60), item, font=font_text, fill=FG)

    # Price tag
    draw.rectangle([50, 520, 750, 580], fill=PRIMARY, outline=FG, width=4)
    draw.text((70, 535), f"Get {product['title']} + save ₹50,000+/year on SaaS", font=font_bold, fill="white")

    path = os.path.join(OUTPUT_DIR, f"{product['id']}-benefit.png")
    img.save(path, "PNG")
    print(f"  Generated {path}")


if __name__ == "__main__":
    print(f"Generating product images to {OUTPUT_DIR}...")
    for p in PRODUCTS:
        print(f"\n{p['title']}:")
        generate_hero(p)
        generate_detail_1(p)
        generate_benefit(p)
    print(f"\nDone. Generated {len(PRODUCTS) * 3} images.")
