"""Generate professional marketing thumbnails for all 10 products.

Uses Pillow to create dark-themed hero images, feature breakdowns,
and pricing comparison cards similar to Canva-quality designs.

Run:  cd backend && python scripts/generate_marketing_thumbnails.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = "frontend/public/product-images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Try to load nice fonts; fall back to defaults
def load_fonts():
    fonts = {}
    candidates = [
        ("Inter-Bold.ttf", "Inter-Regular.ttf"),
        ("Roboto-Bold.ttf", "Roboto-Regular.ttf"),
        ("OpenSans-Bold.ttf", "OpenSans-Regular.ttf"),
        ("arialbd.ttf", "arial.ttf"),
    ]
    for bold, regular in candidates:
        try:
            fonts["bold_large"] = ImageFont.truetype(bold, 52)
            fonts["bold_med"] = ImageFont.truetype(bold, 36)
            fonts["bold_small"] = ImageFont.truetype(bold, 24)
            fonts["regular"] = ImageFont.truetype(regular, 20)
            fonts["regular_small"] = ImageFont.truetype(regular, 16)
            return fonts
        except Exception:
            continue
    # fallback
    f = ImageFont.load_default()
    fonts["bold_large"] = f
    fonts["bold_med"] = f
    fonts["bold_small"] = f
    fonts["regular"] = f
    fonts["regular_small"] = f
    return fonts

FONTS = load_fonts()

# Color palettes per product
PALETTES = {
    "customerbook":   {"primary": "#6366F1", "accent": "#818CF8", "bg_dark": "#0F172A", "bg_card": "#1E293B", "text": "#F8FAFC", "sub": "#CBD5E1"},
    "appointmentpro": {"primary": "#10B981", "accent": "#34D399", "bg_dark": "#064E3B", "bg_card": "#065F46", "text": "#F8FAFC", "sub": "#A7F3D0"},
    "invoicefast":    {"primary": "#F59E0B", "accent": "#FBBF24", "bg_dark": "#451A03", "bg_card": "#78350F", "text": "#F8FAFC", "sub": "#FDE68A"},
    "shopone":        {"primary": "#EC4899", "accent": "#F472B6", "bg_dark": "#500724", "bg_card": "#831843", "text": "#F8FAFC", "sub": "#FBCFE8"},
    "emailauto":      {"primary": "#3B82F6", "accent": "#60A5FA", "bg_dark": "#1E3A8A", "bg_card": "#1E40AF", "text": "#F8FAFC", "sub": "#BFDBFE"},
    "businesssite":   {"primary": "#8B5CF6", "accent": "#A78BFA", "bg_dark": "#2E1065", "bg_card": "#4C1D95", "text": "#F8FAFC", "sub": "#DDD6FE"},
    "whatsappbot":    {"primary": "#22C55E", "accent": "#4ADE80", "bg_dark": "#052E16", "bg_card": "#14532D", "text": "#F8FAFC", "sub": "#BBF7D0"},
    "teamtrack":      {"primary": "#F97316", "accent": "#FB923C", "bg_dark": "#431407", "bg_card": "#7C2D12", "text": "#F8FAFC", "sub": "#FED7AA"},
    "communityhub":   {"primary": "#06B6D4", "accent": "#22D3EE", "bg_dark": "#083344", "bg_card": "#164E63", "text": "#F8FAFC", "sub": "#A5F3FC"},
    "seoblog":        {"primary": "#22C55E", "accent": "#4ADE80", "bg_dark": "#052E16", "bg_card": "#14532D", "text": "#F8FAFC", "sub": "#BBF7D0"},
}

PRODUCTS = {
    "customerbook": {
        "headline": "NEVER LOSE\nA LEAD AGAIN",
        "subhead": "Track customers, follow-ups, and deals\nin one simple dashboard.",
        "features": ["Contact Database", "Deal Pipeline", "Follow-up Reminders", "Revenue Dashboard", "Mobile Access"],
        "price": "2,400",
        "vs_price": "43,200",
        "vs_product": "HubSpot Starter",
        "save": "40,800",
        "screen_items": ["Total Leads: 248", "Deals Won: 12", "Pipeline: 4.2L"],
    },
    "appointmentpro": {
        "headline": "STOP THE\nSCHEDULING CHAOS",
        "subhead": "Let clients book and pay upfront.\nZero back-and-forth.",
        "features": ["Branded Booking Page", "Deposit Collection", "Auto Zoom Links", "SMS Reminders", "Calendar Sync"],
        "price": "2,000",
        "vs_price": "12,000",
        "vs_product": "Calendly Pro",
        "save": "10,000",
        "screen_items": ["Next: 2:00 PM", "Today: 4 calls", "Deposits: 3"],
    },
    "invoicefast": {
        "headline": "GST INVOICES\nIN 2 CLICKS",
        "subhead": "Create professional invoices, collect payments,\nand send auto-reminders.",
        "features": ["GST-Compliant", "Pay Now Button", "Payment Reminders", "Client Portal", "Recurring Invoices"],
        "price": "1,600",
        "vs_price": "18,000",
        "vs_product": "QuickBooks",
        "save": "16,400",
        "screen_items": ["Invoiced: 2.5L", "Paid: 1.8L", "Pending: 70K"],
    },
    "shopone": {
        "headline": "YOUR OWN\nONLINE STORE",
        "subhead": "No Shopify fees. Keep 100% of every sale.\nOwn your business.",
        "features": ["Product Catalog", "Shopping Cart", "Payment Collection", "Order Tracking", "Zero Fees"],
        "price": "2,900",
        "vs_price": "34,000",
        "vs_product": "Shopify Basic",
        "save": "34,000",
        "screen_items": ["Orders: 47", "Revenue: 1.2L", "Visitors: 1.8K"],
    },
    "emailauto": {
        "headline": "TURN VISITORS\nINTO CUSTOMERS",
        "subhead": "Automated welcome sequences, abandoned cart\nrecovery, and newsletters.",
        "features": ["Welcome Sequences", "Abandoned Cart", "Follow-up Emails", "Newsletter Broadcast", "Open Tracking"],
        "price": "1,200",
        "vs_price": "13,200",
        "vs_product": "Mailchimp",
        "save": "12,000",
        "screen_items": ["Subscribers: 1,240", "Open Rate: 42%", "Sequences: 5"],
    },
    "businesssite": {
        "headline": "A WEBSITE THAT\nLOADS IN 1 SECOND",
        "subhead": "Professional 5-page site that ranks on Google\nand converts visitors.",
        "features": ["5 Essential Pages", "SEO Ready", "Mobile Perfect", "Contact Form", "Blog Included"],
        "price": "2,900",
        "vs_price": "18,000",
        "vs_product": "Wix Premium",
        "save": "15,100",
        "screen_items": ["Page Speed: 0.8s", "SEO Score: 96", "Pages: 5"],
    },
    "whatsappbot": {
        "headline": "AUTO-REPLY\n24/7 ON WHATSAPP",
        "subhead": "Answer common questions, send order updates,\nand collect leads while you sleep.",
        "features": ["Instant Auto-Reply", "Order Updates", "Lead Collection", "Payment Reminders", "24/7 Available"],
        "price": "2,400",
        "vs_price": "1,80,000",
        "vs_product": "Hiring Assistant",
        "save": "1,75,100",
        "screen_items": ["Chats: 89 today", "Leads: 12", "Replies: 100%"],
    },
    "teamtrack": {
        "headline": "TRACK YOUR\nTEAM. NO CHAOS.",
        "subhead": "Attendance, tasks, leave, and payroll\nfor small teams.",
        "features": ["Attendance Tracking", "Task Assignments", "Leave Management", "Payroll Calculation", "Payslips"],
        "price": "1,900",
        "vs_price": "30,000",
        "vs_product": "Keka HR",
        "save": "28,100",
        "screen_items": ["Present: 8", "On Leave: 2", "Tasks: 24"],
    },
    "communityhub": {
        "headline": "OWN YOUR\nCOMMUNITY",
        "subhead": "Private, branded community space.\nNo platform risk. No bans.",
        "features": ["Discussion Forums", "Course Hosting", "Member Profiles", "Search Everything", "You Own It"],
        "price": "2,400",
        "vs_price": "36,000",
        "vs_product": "Circle.so",
        "save": "33,600",
        "screen_items": ["Members: 340", "Topics: 56", "Courses: 3"],
    },
    "seoblog": {
        "headline": "RANK ON\nGOOGLE",
        "subhead": "Get free customers every day with a blog\nbuilt for search rankings.",
        "features": ["Lightning Fast", "SEO Optimized", "Auto Sitemap", "Analytics Built-in", "Mobile Friendly"],
        "price": "1,500",
        "vs_price": "9,600",
        "vs_product": "WordPress + Plugins",
        "save": "8,100",
        "screen_items": ["Visitors: 12.6K", "Top Page: 4.2K", "SEO Score: 98"],
    },
}


def draw_gradient_bg(draw, w, h, color1, color2):
    """Draw a simple top-to-bottom gradient."""
    for y in range(h):
        r = int(color1[0] + (color2[0] - color1[0]) * y / h)
        g = int(color1[1] + (color2[1] - color1[1]) * y / h)
        b = int(color1[2] + (color2[2] - color1[2]) * y / h)
        draw.line([(0, y), (w, y)], fill=(r, g, b))


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def draw_rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    """Draw a rounded rectangle."""
    x1, y1, x2, y2 = xy
    r = radius
    draw.pieslice([x1, y1, x1 + r*2, y1 + r*2], 180, 270, fill=fill)
    draw.pieslice([x2 - r*2, y1, x2, y1 + r*2], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - r*2, x1 + r*2, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - r*2, y2 - r*2, x2, y2], 0, 90, fill=fill)
    draw.rectangle([x1 + r, y1, x2 - r, y2], fill=fill)
    draw.rectangle([x1, y1 + r, x2, y2 - r], fill=fill)
    if outline:
        draw.arc([x1, y1, x1 + r*2, y1 + r*2], 180, 270, fill=outline, width=width)
        draw.arc([x2 - r*2, y1, x2, y1 + r*2], 270, 360, fill=outline, width=width)
        draw.arc([x1, y2 - r*2, x1 + r*2, y2], 90, 180, fill=outline, width=width)
        draw.arc([x2 - r*2, y2 - r*2, x2, y2], 0, 90, fill=outline, width=width)
        draw.line([(x1 + r, y1), (x2 - r, y1)], fill=outline, width=width)
        draw.line([(x1 + r, y2), (x2 - r, y2)], fill=outline, width=width)
        draw.line([(x1, y1 + r), (x1, y2 - r)], fill=outline, width=width)
        draw.line([(x2, y1 + r), (x2, y2 - r)], fill=outline, width=width)


def draw_checkmark(draw, x, y, size, color):
    """Draw a checkmark icon."""
    draw.line([(x, y + size//2), (x + size//3, y + size)], fill=color, width=3)
    draw.line([(x + size//3, y + size), (x + size, y)], fill=color, width=3)


def draw_laptop_mockup(draw, x, y, w, h, palette, screen_items):
    """Draw a laptop with screen content."""
    # Laptop base
    draw.polygon([
        (x - 20, y + h), (x + w + 20, y + h),
        (x + w + 40, y + h + 15), (x - 40, y + h + 15)
    ], fill="#334155")
    # Screen bezel
    draw_rounded_rect(draw, [x, y, x + w, y + h], 8, fill="#1e293b", outline="#475569", width=2)
    # Screen
    draw_rounded_rect(draw, [x + 8, y + 8, x + w - 8, y + h - 8], 4, fill="#0f172a")
    # Header bar
    draw.rectangle([x + 8, y + 8, x + w - 8, y + 30], fill=palette["primary"])
    # Title
    draw.text((x + 18, y + 10), "Dashboard", font=FONTS["regular_small"], fill="#ffffff")
    # Screen items
    sy = y + 45
    for item in screen_items:
        draw_rounded_rect(draw, [x + 18, sy, x + w - 18, sy + 28], 4, fill=palette["bg_card"])
        draw.text((x + 28, sy + 4), item, font=FONTS["regular_small"], fill=palette["text"])
        sy += 36
    # Up arrow/trend
    ax, ay = x + w - 50, y + h - 50
    draw.polygon([(ax, ay+30), (ax+15, ay), (ax+30, ay+30)], fill=palette["accent"])


def generate_hero_thumbnail(slug, data, palette):
    """Generate the main hero thumbnail (dark, headline + laptop)."""
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), palette["bg_dark"])
    draw = ImageDraw.Draw(img)

    # Background gradient effect (subtle)
    bg_rgb = hex_to_rgb(palette["bg_dark"])
    for y in range(h):
        shade = int(255 * 0.03 * (1 - abs(y - h/2) / (h/2)))
        draw.line([(0, y), (w, y)], fill=(min(255, bg_rgb[0]+shade), min(255, bg_rgb[1]+shade), min(255, bg_rgb[2]+shade)))

    # Accent glow at top
    draw.ellipse([w//2 - 300, -200, w//2 + 300, 200], fill=palette["primary"])
    # Redraw gradient overlay to soften glow
    for y in range(200):
        alpha = int(255 * (1 - y/200))
        draw.line([(0, y), (w, y)], fill=bg_rgb)

    # Headline (left side)
    lines = data["headline"].split("\n")
    y = 80
    for line in lines:
        draw.text((60, y), line, font=FONTS["bold_large"], fill="#ffffff")
        y += 65

    # Subhead
    sub_lines = data["subhead"].split("\n")
    y += 10
    for line in sub_lines:
        draw.text((60, y), line, font=FONTS["regular"], fill=palette["sub"])
        y += 28

    # Feature bullets
    y += 20
    for feat in data["features"][:4]:
        draw_rounded_rect(draw, [60, y, 85, y + 20], 10, fill=palette["accent"])
        draw_checkmark(draw, 63, y + 3, 14, "#ffffff")
        draw.text((95, y), feat, font=FONTS["regular"], fill="#ffffff")
        y += 32

    # CTA Badge
    badge_y = y + 10
    badge_w = 280
    draw_rounded_rect(draw, [60, badge_y, 60 + badge_w, badge_y + 50], 8, fill=palette["accent"])
    draw.text((80, badge_y + 8), "ONE-TIME PAYMENT", font=FONTS["bold_small"], fill="#ffffff")
    draw.text((80, badge_y + 28), "NO MONTHLY FEES", font=FONTS["regular_small"], fill="#ffffff")

    # Laptop mockup (right side)
    draw_laptop_mockup(draw, 620, 100, 520, 380, palette, data["screen_items"])

    # Brand watermark
    draw.text((w - 180, h - 40), "gitstack.co", font=FONTS["regular_small"], fill=palette["sub"])

    return img


def generate_features_thumbnail(slug, data, palette):
    """Generate features breakdown thumbnail (light, list with icons)."""
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), "#f8fafc")
    draw = ImageDraw.Draw(img)

    # Left panel - dark
    draw.rectangle([0, 0, 500, h], fill=palette["bg_dark"])
    draw.text((60, 80), data["headline"].replace("\n", " "), font=FONTS["bold_med"], fill="#ffffff")
    draw.text((60, 160), "Everything you need to grow\nyour business.", font=FONTS["regular"], fill=palette["sub"])

    # Feature list on right
    y = 80
    for feat in data["features"]:
        draw_rounded_rect(draw, [540, y, 580, y + 40], 8, fill=palette["primary"])
        draw_checkmark(draw, 548, y + 10, 18, "#ffffff")
        draw.text((600, y + 6), feat, font=FONTS["bold_small"], fill="#1e293b")
        y += 70

    # Price badge
    draw_rounded_rect(draw, [540, y + 20, 740, y + 80], 8, fill=palette["accent"])
    draw.text((560, y + 28), f"Rs {data['price']}", font=FONTS["bold_med"], fill="#ffffff")
    draw.text((560, y + 58), "One-time", font=FONTS["regular_small"], fill="#ffffff")

    return img


def generate_pricing_thumbnail(slug, data, palette):
    """Generate pricing comparison thumbnail."""
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), palette["bg_dark"])
    draw = ImageDraw.Draw(img)

    # Title
    draw.text((w//2 - 280, 60), "SAVE THOUSANDS EVERY YEAR", font=FONTS["bold_med"], fill="#ffffff")

    # Left card - Traditional
    draw_rounded_rect(draw, [100, 140, 520, 520], 16, fill="#1e293b", outline="#475569", width=2)
    draw.text((140, 170), "Traditional Way", font=FONTS["bold_small"], fill="#94a3b8")

    items = [
        ("Software", f"Rs {data['vs_price']}/year"),
        ("Hosting", "Rs 3,600/year"),
        ("Plugins/Addons", "Rs 3,600/year"),
        ("Developer", "Rs 24,000/year"),
    ]
    y = 220
    for label, price in items:
        draw.text((140, y), label, font=FONTS["regular"], fill="#cbd5e1")
        draw.text((380, y), price, font=FONTS["regular"], fill="#cbd5e1")
        y += 40

    draw.line([(140, y), (480, y)], fill="#475569", width=2)
    y += 15
    draw.text((140, y), "Total Cost", font=FONTS["bold_small"], fill="#f87171")
    total_vs = int(data['vs_price'].replace(',', '')) + 31300
    draw.text((300, y), f"Rs {total_vs:,}+/year", font=FONTS["bold_small"], fill="#f87171")

    # VS circle
    draw.ellipse([540, 300, 660, 420], fill="#ffffff")
    draw.text((580, 345), "VS", font=FONTS["bold_med"], fill="#1e293b")

    # Right card - Our product
    draw_rounded_rect(draw, [680, 140, 1100, 520], 16, fill=palette["primary"], outline=palette["accent"], width=3)
    draw.text((720, 170), slug.replace("-", " ").title(), font=FONTS["bold_small"], fill="#ffffff")

    y = 220
    benefits = ["Everything Included", "No Monthly Fees", "No Developer Needed", "Lifetime Access"]
    for ben in benefits:
        draw_checkmark(draw, 730, y + 5, 16, "#ffffff")
        draw.text((760, y), ben, font=FONTS["regular"], fill="#ffffff")
        y += 40

    draw.line([(720, y), (1060, y)], fill="#ffffff", width=2)
    y += 15
    draw.text((720, y), "One-Time Payment", font=FONTS["bold_small"], fill="#ffffff")
    y += 32
    draw.text((720, y), f"Rs {data['price']}", font=FONTS["bold_med"], fill="#ffffff")

    # Bottom savings banner
    draw_rounded_rect(draw, [w//2 - 250, 540, w//2 + 250, 600], 30, fill=palette["accent"])
    draw.text((w//2 - 200, 555), f"YOU SAVE Rs {data['save']} IN THE FIRST YEAR!", font=FONTS["bold_small"], fill="#ffffff")

    return img


def generate_all():
    for slug, data in PRODUCTS.items():
        palette = PALETTES[slug]
        print(f"Generating thumbnails for {slug}...")

        hero = generate_hero_thumbnail(slug, data, palette)
        hero.save(os.path.join(OUTPUT_DIR, f"{slug}-hero.png"), "PNG")

        features = generate_features_thumbnail(slug, data, palette)
        features.save(os.path.join(OUTPUT_DIR, f"{slug}-features.png"), "PNG")

        pricing = generate_pricing_thumbnail(slug, data, palette)
        pricing.save(os.path.join(OUTPUT_DIR, f"{slug}-pricing.png"), "PNG")

    print(f"\nAll thumbnails saved to {OUTPUT_DIR}")
    print("Files generated:")
    for slug in PRODUCTS:
        print(f"  {slug}-hero.png")
        print(f"  {slug}-features.png")
        print(f"  {slug}-pricing.png")


if __name__ == "__main__":
    generate_all()
