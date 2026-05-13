"""Generate unique product mockup images for GitStack marketplace.

Run:  cd backend && python scripts/generate_product_images.py
"""
import os
import random
from PIL import Image, ImageDraw, ImageFont

try:
    FONT = ImageFont.truetype("Roboto-Bold.ttf", 28)
    SUB = ImageFont.truetype("Roboto-Regular.ttf", 16)
except Exception:
    try:
        FONT = ImageFont.truetype("arial.ttf", 28)
        SUB = ImageFont.truetype("arial.ttf", 16)
    except Exception:
        FONT = ImageFont.load_default()
        SUB = FONT

BG = "#ffffff"
ACCENTS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
           "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"]


def draw_browser_frame(draw, title):
    draw.rectangle([0, 0, 800, 36], fill="#2d3748")
    draw.rectangle([12, 12, 24, 24], fill="#ff5f56", outline="#e0443e")
    draw.rectangle([30, 12, 42, 24], fill="#ffbd2e", outline="#dea123")
    draw.rectangle([48, 12, 60, 24], fill="#27c93f", outline="#1aab29")
    draw.text((76, 8), title, font=SUB, fill="#e2e8f0")


def draw_crm_mockup(draw, title):
    draw.rectangle([60, 60, 240, 90], fill="#e2e8f0", outline="#cbd5e0")
    draw.rectangle([260, 60, 740, 90], fill="#f7fafc", outline="#cbd5e0")
    y = 110
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1"]
    for i, c in enumerate(colors):
        draw.rectangle([60, y, 240, y+30], fill="#e2e8f0", outline="#cbd5e0")
        draw.rectangle([260, y, 740, y+30], fill="#f7fafc", outline="#cbd5e0")
        draw.rectangle([560, y+5, 660, y+25], fill=c, outline="#cbd5e0")
        y += 40


def draw_booking_mockup(draw, title):
    draw.rectangle([200, 60, 600, 100], fill="#e2e8f0", outline="#cbd5e0")
    draw.text((320, 68), "Your Booking Page", font=FONT, fill="#2d3748")
    y = 120
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        draw.rectangle([250, y, 350, y+30], fill="#f7fafc", outline="#cbd5e0")
        draw.text((270, y+5), day, font=SUB, fill="#2d3748")
        draw.rectangle([360, y, 450, y+30], fill="#4ECDC4", outline="#4ECDC4")
        draw.text((370, y+5), "10:00 AM", font=SUB, fill="#ffffff")
        draw.rectangle([460, y, 550, y+30], fill="#4ECDC4", outline="#4ECDC4")
        draw.text((470, y+5), "2:00 PM", font=SUB, fill="#ffffff")
        y += 40


def draw_invoice_mockup(draw, title):
    draw.rectangle([150, 60, 650, 420], fill="#ffffff", outline="#cbd5e0")
    draw.rectangle([160, 70, 640, 110], fill="#f7fafc", outline="#cbd5e0")
    draw.text((350, 78), "INVOICE #001", font=FONT, fill="#2d3748")
    draw.rectangle([160, 130, 640, 160], fill="#f7fafc", outline="#cbd5e0")
    draw.text((180, 135), "Client: Acme Corp", font=SUB, fill="#2d3748")
    draw.rectangle([160, 180, 640, 210], fill="#f7fafc", outline="#cbd5e0")
    draw.text((180, 185), "Service: Website Design", font=SUB, fill="#2d3748")
    draw.rectangle([160, 230, 640, 260], fill="#f7fafc", outline="#cbd5e0")
    draw.text((180, 235), "Amount: Rs 25,000 + GST", font=SUB, fill="#2d3748")
    draw.rectangle([450, 350, 640, 400], fill="#FF6B6B", outline="#FF6B6B")
    draw.text((500, 365), "PAY NOW", font=FONT, fill="#ffffff")


def draw_store_mockup(draw, title):
    draw.rectangle([60, 60, 380, 240], fill="#f7fafc", outline="#cbd5e0")
    draw.rectangle([80, 80, 200, 180], fill="#DDA0DD", outline="#DDA0DD")
    draw.text((100, 200), "Product 1", font=SUB, fill="#2d3748")
    draw.rectangle([220, 200, 340, 230], fill="#4ECDC4", outline="#4ECDC4")
    draw.text((240, 205), "Add to Cart", font=SUB, fill="#ffffff")

    draw.rectangle([420, 60, 740, 240], fill="#f7fafc", outline="#cbd5e0")
    draw.rectangle([440, 80, 560, 180], fill="#FFEAA7", outline="#FFEAA7")
    draw.text((460, 200), "Product 2", font=SUB, fill="#2d3748")
    draw.rectangle([580, 200, 700, 230], fill="#4ECDC4", outline="#4ECDC4")
    draw.text((600, 205), "Add to Cart", font=SUB, fill="#ffffff")

    draw.rectangle([240, 280, 560, 330], fill="#FF6B6B", outline="#FF6B6B")
    draw.text((330, 292), "CHECKOUT", font=FONT, fill="#ffffff")


def draw_email_mockup(draw, title):
    draw.rectangle([60, 60, 300, 440], fill="#f7fafc", outline="#cbd5e0")
    y = 80
    for label in ["Welcome", "Day 3 Tips", "Day 7 Case Study", "Day 14 Offer"]:
        draw.rectangle([80, y, 280, y+35], fill="#ffffff", outline="#cbd5e0")
        draw.text((90, y+8), label, font=SUB, fill="#2d3748")
        y += 50

    draw.rectangle([320, 60, 740, 440], fill="#ffffff", outline="#cbd5e0")
    draw.rectangle([340, 80, 720, 120], fill="#e2e8f0", outline="#cbd5e0")
    draw.text((360, 88), "Subject: Welcome to Our Community!", font=SUB, fill="#2d3748")
    draw.rectangle([340, 140, 720, 300], fill="#f7fafc", outline="#cbd5e0")
    draw.text((360, 155), "Hi there!", font=SUB, fill="#2d3748")
    draw.text((360, 180), "Thanks for joining us.", font=SUB, fill="#2d3748")
    draw.text((360, 205), "Here is what to expect...", font=SUB, fill="#2d3748")
    draw.rectangle([360, 340, 560, 380], fill="#4ECDC4", outline="#4ECDC4")
    draw.text((410, 350), "GET STARTED", font=SUB, fill="#ffffff")


def draw_website_mockup(draw, title):
    draw.rectangle([0, 36, 800, 120], fill="#2d3748", outline="#2d3748")
    draw.text((60, 60), "YourBusiness", font=FONT, fill="#ffffff")
    for label in ["Home", "About", "Services", "Contact"]:
        draw.text((500 + [0, 80, 160, 240][["Home", "About", "Services", "Contact"].index(label)], 65), label, font=SUB, fill="#e2e8f0")
    draw.rectangle([200, 180, 600, 220], fill="#f7fafc", outline="#cbd5e0")
    draw.text((270, 185), "We Help You Grow", font=FONT, fill="#2d3748")
    draw.rectangle([300, 250, 500, 290], fill="#FF6B6B", outline="#FF6B6B")
    draw.text((360, 258), "Get Started", font=SUB, fill="#ffffff")
    for i in range(3):
        draw.rectangle([80 + i*240, 340, 280 + i*240, 420], fill="#e2e8f0", outline="#cbd5e0")
        draw.text((120 + i*240, 370), f"Feature {i+1}", font=SUB, fill="#2d3748")


def draw_whatsapp_mockup(draw, title):
    draw.rectangle([200, 36, 600, 440], fill="#f0f0f0", outline="#cbd5e0")
    draw.rectangle([200, 36, 600, 80], fill="#075E54", outline="#075E54")
    draw.text((230, 48), "WhatsApp Business", font=SUB, fill="#ffffff")
    y = 100
    messages = [
        ("Hi! How can I help?", True, "#DCF8C6"),
        ("What are your prices?", False, "#ffffff"),
        ("Our plans start at Rs 999/mo. Would you like a demo?", True, "#DCF8C6"),
        ("Yes, please!", False, "#ffffff"),
        ("Great! Here is the booking link: ...", True, "#DCF8C6"),
    ]
    for text, is_me, color in messages:
        x = 420 if is_me else 220
        tw = len(text) * 8
        draw.rounded_rectangle([x - tw - 10, y, x + 10, y + 28], radius=5, fill=color, outline="#cbd5e0")
        draw.text((x - tw, y+4), text, font=SUB, fill="#2d3748")
        y += 40


def draw_hr_mockup(draw, title):
    draw.rectangle([60, 60, 240, 440], fill="#f7fafc", outline="#cbd5e0")
    y = 80
    for emp in ["Arjun - Present", "Priya - Late", "Rahul - Leave", "Sneha - Present"]:
        color = "#4ECDC4" if "Present" in emp else "#FF6B6B" if "Late" in emp else "#FFEAA7"
        draw.rectangle([80, y, 220, y+30], fill=color, outline="#cbd5e0")
        draw.text((90, y+5), emp, font=SUB, fill="#2d3748")
        y += 45

    draw.rectangle([260, 60, 740, 240], fill="#ffffff", outline="#cbd5e0")
    draw.rectangle([270, 70, 730, 110], fill="#e2e8f0", outline="#cbd5e0")
    draw.text((280, 78), "Task Board", font=SUB, fill="#2d3748")
    cols = [("To Do", "#FF6B6B"), ("In Progress", "#FFEAA7"), ("Done", "#4ECDC4")]
    x = 280
    for col_name, col_color in cols:
        draw.rectangle([x, 130, x+130, 220], fill=col_color, outline="#cbd5e0")
        draw.text((x+30, 170), col_name, font=SUB, fill="#2d3748")
        x += 150

    draw.rectangle([260, 260, 740, 440], fill="#ffffff", outline="#cbd5e0")
    draw.rectangle([270, 270, 730, 310], fill="#e2e8f0", outline="#cbd5e0")
    draw.text((280, 278), "Monthly Payroll", font=SUB, fill="#2d3748")
    draw.text((300, 330), "Arjun: Rs 45,000", font=SUB, fill="#2d3748")
    draw.text((300, 360), "Priya: Rs 38,000", font=SUB, fill="#2d3748")
    draw.text((300, 390), "Rahul: Rs 42,000", font=SUB, fill="#2d3748")


def draw_community_mockup(draw, title):
    draw.rectangle([60, 60, 740, 440], fill="#f7fafc", outline="#cbd5e0")
    draw.rectangle([60, 60, 200, 440], fill="#e2e8f0", outline="#cbd5e0")
    y = 80
    for cat in ["General", "Q&A", "Resources", "Off Topic"]:
        draw.rectangle([80, y, 180, y+35], fill="#ffffff", outline="#cbd5e0")
        draw.text((90, y+8), cat, font=SUB, fill="#2d3748")
        y += 50

    y = 80
    for topic in ["How to get first 10 customers?", "Best tools for SEO?", "Looking for a co-founder"]:
        draw.rectangle([220, y, 720, y+50], fill="#ffffff", outline="#cbd5e0")
        draw.text((240, y+5), topic, font=SUB, fill="#2d3748")
        draw.text((240, y+28), "12 replies · 3 hours ago", font=SUB, fill="#718096")
        y += 70


def draw_blog_mockup(draw, title):
    draw.rectangle([60, 60, 740, 440], fill="#f7fafc", outline="#cbd5e0")
    draw.rectangle([60, 60, 740, 140], fill="#2d3748", outline="#2d3748")
    draw.text((80, 80), "Your Blog", font=FONT, fill="#ffffff")
    y = 160
    for i, post in enumerate(["10 Tips for Indian Startups", "How We Bootstrapped to $10K MRR", "Why Open Source Wins"]):
        draw.rectangle([80, y, 200, y+80], fill=ACCENTS[i], outline=ACCENTS[i])
        draw.rectangle([220, y, 720, y+80], fill="#ffffff", outline="#cbd5e0")
        draw.text((240, y+10), post, font=SUB, fill="#2d3748")
        draw.text((240, y+40), "Read time: 5 min · SEO Score: 92", font=SUB, fill="#718096")
        y += 100


def generate_all_images(output_dir):
    os.makedirs(output_dir, exist_ok=True)

    drawings = {
        "customerbook": ("CustomerBook", draw_crm_mockup),
        "appointmentpro": ("AppointmentPro", draw_booking_mockup),
        "invoicefast": ("InvoiceFast", draw_invoice_mockup),
        "shopone": ("ShopOne", draw_store_mockup),
        "emailauto": ("EmailAuto", draw_email_mockup),
        "businesssite": ("BusinessSite", draw_website_mockup),
        "whatsappbot": ("WhatsAppBot", draw_whatsapp_mockup),
        "teamtrack": ("TeamTrack", draw_hr_mockup),
        "communityhub": ("CommunityHub", draw_community_mockup),
        "seoblog": ("SEOBlog", draw_blog_mockup),
    }

    for slug, (title, draw_fn) in drawings.items():
        img = Image.new("RGB", (800, 500), BG)
        draw = ImageDraw.Draw(img)
        draw_browser_frame(draw, title)
        draw_fn(draw, title)
        filepath = os.path.join(output_dir, f"v2-{slug}.png")
        img.save(filepath, "PNG")
        print(f"  Generated {filepath}")

    print(f"\nAll images saved to {output_dir}")


if __name__ == "__main__":
    generate_all_images("frontend/public/product-images")
