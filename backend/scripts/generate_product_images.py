"""Generate UNIQUE product mockup images for GitStack marketplace.

Run:
    cd backend && python scripts/generate_product_images.py
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "public", "product-images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

BG = "#FFFFFF"
FG = "#09090B"
PRIMARY = "#2563EB"
MINT = "#A7F3D0"
YELLOW = "#FEF08A"
LAVENDER = "#E9D5FF"
PINK = "#FBCFE8"
MUTED = "#F4F4F5"
GRAY = "#71717A"

def get_font(size):
    for name in ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf", 
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except:
            continue
    return ImageFont.load_default()

def get_font_reg(size):
    for name in ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except:
            continue
    return ImageFont.load_default()

def save(img, name):
    path = os.path.join(OUTPUT_DIR, f"{name}.png")
    img.save(path, "PNG")
    print(f"  {path}")

# ─── OpenCRM — CRM Dashboard ───
def open_crm():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(20)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Sidebar
    d.rectangle([0, 0, 180, H], fill=FG, outline=FG, width=2)
    d.text((20, 30), "OpenCRM", font=get_font(22), fill="white")
    for i, item in enumerate(["Dashboard", "Contacts", "Deals", "Tasks", "Emails", "Reports"]):
        d.text((20, 80 + i*40), item, font=fr, fill="#A1A1AA")
    
    # Header
    d.rectangle([180, 0, W, 60], fill=BG, outline=FG, width=3)
    d.text((200, 20), "Dashboard", font=ft, fill=FG)
    
    # Stats cards
    cards = [("Total Deals", "₹24L", MINT), ("Active Leads", "147", YELLOW), ("Closed Won", "38", LAVENDER)]
    for i, (label, val, col) in enumerate(cards):
        x = 200 + i*190
        d.rectangle([x, 80, x+170, 160], fill=col, outline=FG, width=3)
        d.text((x+15, 95), label, font=fr, fill=GRAY)
        d.text((x+15, 120), val, font=get_font(28), fill=FG)
    
    # Pipeline chart area
    d.rectangle([200, 180, W-20, 350], fill=MUTED, outline=FG, width=3)
    d.text((220, 195), "Sales Pipeline", font=fb, fill=FG)
    stages = [("Lead", 45, MINT), ("Qualified", 30, YELLOW), ("Proposal", 20, LAVENDER), ("Closed", 15, PINK)]
    for i, (name, pct, col) in enumerate(stages):
        x = 220 + i*130
        h = pct*3
        d.rectangle([x, 340-h, x+100, 340], fill=col, outline=FG, width=2)
        d.text((x+10, 345), name, font=fr, fill=FG)
        d.text((x+10, 360), f"{pct}", font=fr, fill=GRAY)
    
    # Contacts table
    d.rectangle([200, 370, W-20, 580], fill=BG, outline=FG, width=3)
    d.text((220, 385), "Recent Contacts", font=fb, fill=FG)
    headers = ["Name", "Company", "Stage", "Value"]
    for i, h in enumerate(headers):
        d.text((220 + i*130, 420), h, font=fr, fill=GRAY)
    rows = [["Rahul S.", "Acme Inc", "Qualified", "₹2.4L"],
            ["Priya K.", "Beta Corp", "Proposal", "₹5.1L"],
            ["Arjun M.", "Gamma LLC", "Closed", "₹1.8L"]]
    for ri, row in enumerate(rows):
        for ci, cell in enumerate(row):
            d.text((220 + ci*130, 455 + ri*35), cell, font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "open-crm")

# ─── BookStack — Calendar Booking ───
def bookstack():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(20)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Top bar
    d.rectangle([0, 0, W, 70], fill=PRIMARY, outline=FG, width=3)
    d.text((30, 22), "BookStack", font=get_font(24), fill="white")
    d.text((600, 25), "My Bookings", font=fr, fill="white")
    
    # Calendar grid
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i, day in enumerate(days):
        x = 30 + i*105
        d.rectangle([x, 90, x+95, 130], fill=MUTED, outline=FG, width=2)
        d.text((x+30, 100), day, font=fr, fill=FG)
    
    # Calendar slots with some booked
    slots = [
        ("9:00 AM", MINT, "Available"), ("10:30 AM", YELLOW, "Booked"),
        ("1:00 PM", MINT, "Available"), ("3:30 PM", PINK, "Blocked"),
        ("5:00 PM", MINT, "Available")
    ]
    for i, (time, col, status) in enumerate(slots):
        y = 150 + i*80
        d.rectangle([30, y, 350, y+60], fill=col, outline=FG, width=3)
        d.text((45, y+20), time, font=fb, fill=FG)
        d.text((200, y+22), status, font=fr, fill=GRAY)
    
    # Booking form preview
    d.rectangle([380, 150, W-30, 450], fill=BG, outline=FG, width=3)
    d.text((400, 170), "Book Appointment", font=ft, fill=FG)
    fields = ["Your Name", "Email", "Select Service", "Preferred Date"]
    for i, f in enumerate(fields):
        y = 210 + i*55
        d.rectangle([400, y, W-50, y+40], fill=MUTED, outline=FG, width=2)
        d.text((410, y+12), f, font=fr, fill=GRAY)
    d.rectangle([400, 440, W-50, 480], fill=PRIMARY, outline=FG, width=3)
    d.text((540, 452), "Confirm Booking", font=fb, fill="white")
    
    # Stripe badge
    d.rectangle([380, 500, W-30, 560], fill=MINT, outline=FG, width=3)
    d.text((400, 520), "💳 Stripe checkout enabled — collect deposits upfront", font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "bookstack")

# ─── InvoiceForge — Invoice Builder ───
def invoiceforge():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(20)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Invoice paper
    d.rectangle([50, 30, W-50, H-30], fill=BG, outline=FG, width=4)
    d.rectangle([60, 40, W-60, 100], fill=MINT, outline=FG, width=2)
    d.text((80, 55), "INVOICE #00142", font=get_font(26), fill=FG)
    d.text((550, 55), "InvoiceForge", font=fr, fill=GRAY)
    
    # From / To
    d.text((80, 120), "From: Your Company", font=fb, fill=FG)
    d.text((80, 145), "GST: 27AABCU9603R1ZX", font=fr, fill=GRAY)
    d.text((450, 120), "To: Client Corp", font=fb, fill=FG)
    d.text((450, 145), "Due: 15 days", font=fr, fill=GRAY)
    
    # Line items table
    d.rectangle([80, 190, W-80, 230], fill=MUTED, outline=FG, width=2)
    for i, h in enumerate(["Item", "Qty", "Rate", "Amount"]):
        d.text((100 + i*160, 200), h, font=fb, fill=FG)
    
    items = [["Website Design", "1", "₹25,000", "₹25,000"],
             ["Hosting (1 year)", "1", "₹12,000", "₹12,000"],
             ["Maintenance", "3", "₹5,000", "₹15,000"]]
    for ri, row in enumerate(items):
        y = 240 + ri*45
        d.rectangle([80, y, W-80, y+40], fill=BG, outline=FG, width=1)
        for ci, cell in enumerate(row):
            d.text((100 + ci*160, y+12), cell, font=fr, fill=FG)
    
    # Totals
    d.rectangle([450, 380, W-80, 420], fill=YELLOW, outline=FG, width=3)
    d.text((470, 392), "Total:", font=fb, fill=FG)
    d.text((620, 390), "₹52,000", font=get_font(22), fill=FG)
    
    # Pay button
    d.rectangle([80, 450, W-80, 510], fill=PRIMARY, outline=FG, width=3)
    d.text((300, 468), "💳 Pay with Stripe / PayPal", font=ft, fill="white")
    
    # PDF badge
    d.rectangle([80, 530, 280, 570], fill=LAVENDER, outline=FG, width=3)
    d.text((100, 545), "📄 Auto PDF generation", font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "invoiceforge")

# ─── SaaS-Boiler — Code + Dashboard ───
def saas_boiler():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), FG)
    d = ImageDraw.Draw(img)
    fr = get_font_reg(13)
    fb = get_font(15)
    
    # IDE sidebar
    d.rectangle([0, 0, 200, H], fill="#18181B", outline=FG, width=2)
    d.text((20, 20), "saas-boiler/", font=fb, fill="#E4E4E7")
    files = ["src/", "  app/", "  components/", "  lib/", "prisma/", "docker-compose.yml", ".env.example"]
    for i, f in enumerate(files):
        d.text((20, 60 + i*28), f, font=fr, fill="#A1A1AA")
    
    # Code editor
    d.rectangle([200, 0, W, H], fill=BG, outline=FG, width=3)
    d.text((220, 20), "page.tsx", font=fb, fill=FG)
    code_lines = [
        "import { auth } from '@clerk/nextjs';",
        "import { stripe } from '@/lib/stripe';",
        "",
        "export default async function Dashboard() {",
        "  const { userId } = auth();",
        "  const subscriptions = await stripe.subscriptions.list();",
        "  return (",
        "    <div className='p-8'>",
        "      <h1>Welcome back</h1>",
        "      <AnalyticsChart data={subscriptions} />",
        "    </div>",
        "  );",
        "}",
    ]
    for i, line in enumerate(code_lines):
        d.text((220, 60 + i*28), line, font=fr, fill="#3F3F46" if line.startswith("import") or line.startswith("  const") else FG)
    
    # Floating "Launch in 1 weekend" badge
    d.rectangle([450, 400, 750, 470], fill=PRIMARY, outline=FG, width=4)
    d.text((470, 420), "🚀 Launch your SaaS this weekend", font=fb, fill="white")
    d.text((470, 445), "Auth · Stripe · DB · Emails · Dashboard", font=fr, fill="#BFDBFE")
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "saas-boiler")

# ─── DeployScript — Terminal ───
def deployscript():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), "#18181B")
    d = ImageDraw.Draw(img)
    fr = get_font_reg(15)
    fb = get_font(16)
    fg_green = "#4ADE80"
    fg_blue = "#60A5FA"
    fg_yellow = "#FACC15"
    
    # Terminal bar
    d.rectangle([0, 0, W, 40], fill="#27272A", outline=FG, width=2)
    d.ellipse([15, 15, 25, 25], fill="#EF4444")
    d.ellipse([35, 15, 45, 25], fill="#F59E0B")
    d.ellipse([55, 15, 65, 25], fill="#22C55E")
    d.text((80, 12), "deploy.sh — gitstack", font=fr, fill="#A1A1AA")
    
    lines = [
        ("$", fg_green), (" git clone gitstack.pro/deploy-script", fg_blue),
        ("$", fg_green), (" docker-compose up -d", fg_yellow),
        ("", "#71717A"), ("[+] Running 5/5", fg_green),
        (" ✔ Container app    Started", fg_blue),
        (" ✔ Container db     Healthy", fg_blue),
        (" ✔ Container redis  Started", fg_blue),
        (" ✔ Container nginx  Started", fg_blue),
        (" ✔ SSL cert         Renewed", fg_blue),
        ("", "#71717A"), ("🎉 Deployed to https://yourdomain.com", fg_yellow),
        ("", "#71717A"), ("⏱️  Total time: 2 minutes 14 seconds", fg_green),
    ]
    y = 60
    for text, color in lines:
        if text:
            d.text((30, y), text, font=fr, fill=color)
        y += 30
    
    # Bottom banner
    d.rectangle([30, 520, W-30, 580], fill=MINT, outline=FG, width=3)
    d.text((50, 540), "5 stacks · 1 command · SSL auto-renew · Monitoring included", font=fb, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "deployscript")

# ─── AI-Agent-Template — Workflow Diagram ───
def ai_agent():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(18)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    d.text((30, 30), "AI-Agent-Template Workflow", font=get_font(24), fill=FG)
    
    # Boxes
    boxes = [
        (80, 100, "User Query", MINT),
        (300, 100, "ReAct Agent", YELLOW),
        (520, 100, "Tool Registry", LAVENDER),
        (80, 280, "Memory Store", PINK),
        (300, 280, "LLM (GPT-4)", MINT),
        (520, 280, "Response", YELLOW),
    ]
    for x, y, label, col in boxes:
        d.rectangle([x, y, x+160, y+80], fill=col, outline=FG, width=3)
        d.text((x+20, y+28), label, font=fb, fill=FG)
    
    # Arrows
    arrows = [(240, 140, 300, 140), (460, 140, 520, 140), (160, 180, 160, 280),
              (380, 180, 380, 280), (600, 180, 600, 280), (380, 360, 380, 420)]
    for x1, y1, x2, y2 in arrows:
        d.line([(x1, y1), (x2, y2)], fill=FG, width=3)
        d.polygon([(x2, y2), (x2-8, y2-6), (x2-8, y2+6)], fill=FG)
    
    # Feature list
    d.rectangle([50, 420, W-50, 580], fill=MUTED, outline=FG, width=3)
    d.text((70, 440), "What you get:", font=ft, fill=FG)
    feats = ["✅ LangGraph state machine", "✅ 5 pre-built tools (search, calculator, API, file, DB)",
             "✅ SQLite conversation memory", "✅ Human approval checkpoints", "✅ Streaming SSE endpoint"]
    for i, f in enumerate(feats):
        d.text((70, 475 + i*24), f, font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "ai-agent")

# ─── Clerk-Auth-Skill — Auth Pages ───
def clerk_auth():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(20)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Login mockup
    d.rectangle([100, 50, 350, 400], fill=BG, outline=FG, width=4)
    d.rectangle([100, 50, 350, 100], fill=PRIMARY, outline=FG, width=2)
    d.text((130, 65), "Sign In", font=ft, fill="white")
    d.rectangle([130, 140, 320, 190], fill=MUTED, outline=FG, width=2)
    d.text((140, 155), "Email", font=fr, fill=GRAY)
    d.rectangle([130, 210, 320, 260], fill=MUTED, outline=FG, width=2)
    d.text((140, 225), "Password", font=fr, fill=GRAY)
    d.rectangle([130, 290, 320, 340], fill=PRIMARY, outline=FG, width=3)
    d.text((190, 305), "Continue", font=fb, fill="white")
    d.text((130, 370), "Or use Google / GitHub OAuth", font=fr, fill=GRAY)
    
    # Roles panel
    d.rectangle([400, 50, W-50, 280], fill=MINT, outline=FG, width=4)
    d.text((420, 70), "Organization Roles", font=ft, fill=FG)
    roles = [("Admin", "Full access"), ("Editor", "Can modify"), ("Viewer", "Read only")]
    for i, (role, perm) in enumerate(roles):
        y = 110 + i*50
        d.rectangle([420, y, W-70, y+40], fill=BG, outline=FG, width=2)
        d.text((435, y+10), f"👤 {role}: {perm}", font=fr, fill=FG)
    
    # Webhook panel
    d.rectangle([400, 310, W-50, 540], fill=LAVENDER, outline=FG, width=4)
    d.text((420, 330), "Webhook Events", font=ft, fill=FG)
    events = ["user.created → Send welcome email", "user.updated → Sync CRM", "org.created → Provision resources"]
    for i, ev in enumerate(events):
        d.text((420, 370 + i*35), f"⚡ {ev}", font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "clerk-auth")

# ─── VisionKit — Image Analysis ───
def visionkit():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(18)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Upload area
    d.rectangle([30, 30, 400, 350], fill=MUTED, outline=FG, width=3)
    d.text((120, 160), "📤 Drop image here", font=ft, fill=GRAY)
    d.text((100, 200), "or upload from camera", font=fr, fill=GRAY)
    
    # Sample image with bounding boxes
    d.rectangle([50, 250, 200, 330], fill=MINT, outline=FG, width=2)
    d.text((60, 280), "🚗 Car detected", font=fr, fill=FG)
    d.rectangle([220, 260, 350, 310], fill=YELLOW, outline=FG, width=2)
    d.text((230, 275), "🚶 Person", font=fr, fill=FG)
    
    # Results panel
    d.rectangle([430, 30, W-30, 350], fill=BG, outline=FG, width=3)
    d.text((450, 50), "Detection Results", font=ft, fill=FG)
    results = [
        ("Object: Car", "Confidence: 98.4%", "Bounding box: [45, 120, 200, 180]"),
        ("Object: Person", "Confidence: 94.1%", "Bounding box: [220, 140, 350, 310]"),
        ("Text (OCR): 'STOP'", "Confidence: 99.2%", "Language: English"),
    ]
    for i, (obj, conf, bbox) in enumerate(results):
        y = 90 + i*80
        d.rectangle([450, y, W-50, y+70], fill=[MINT, YELLOW, LAVENDER][i], outline=FG, width=2)
        d.text((460, y+10), obj, font=fb, fill=FG)
        d.text((460, y+32), conf, font=fr, fill=GRAY)
        d.text((460, y+50), bbox, font=fr, fill=GRAY)
    
    # API endpoint
    d.rectangle([30, 380, W-30, 580], fill=FG, outline=FG, width=3)
    d.text((50, 400), "FastAPI Endpoint", font=ft, fill="white")
    d.text((50, 440), "POST /api/v1/detect", font=fr, fill="#A1A1AA")
    d.text((50, 470), "POST /api/v1/ocr", font=fr, fill="#A1A1AA")
    d.text((50, 500), "POST /api/v1/classify", font=fr, fill="#A1A1AA")
    d.text((50, 540), "⚡ GPU acceleration supported · 80+ languages OCR", font=fr, fill=MINT)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "visionkit")

# ─── MCP-Notion — Notion + AI ───
def mcp_notion():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    ft = get_font(18)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Notion sidebar
    d.rectangle([0, 0, 180, H], fill=MUTED, outline=FG, width=2)
    d.text((20, 30), "📝 Notion", font=ft, fill=FG)
    pages = ["Project Alpha", "Meeting Notes", "Tasks", "Database"]
    for i, p in enumerate(pages):
        d.text((20, 80 + i*35), f"▸ {p}", font=fr, fill=GRAY)
    
    # AI chat sidebar
    d.rectangle([W-220, 0, W, H], fill=MINT, outline=FG, width=2)
    d.text((W-200, 30), "🤖 Claude", font=ft, fill=FG)
    msgs = [
        "Query: Find overdue tasks",
        "Found: 3 tasks",
        "Create page: Q4 Report",
        "Done! Page created."
    ]
    for i, m in enumerate(msgs):
        y = 80 + i*90
        d.rectangle([W-200, y, W-20, y+70], fill=BG, outline=FG, width=2)
        d.text((W-190, y+10), m, font=fr, fill=FG)
    
    # Main page
    d.rectangle([190, 60, W-230, 300], fill=BG, outline=FG, width=3)
    d.text((210, 80), "Project Alpha", font=get_font(24), fill=FG)
    d.text((210, 120), "Status: In Progress", font=fr, fill=GRAY)
    
    # Database table
    d.rectangle([190, 330, W-230, 580], fill=MUTED, outline=FG, width=3)
    d.text((210, 350), "Tasks Database", font=ft, fill=FG)
    headers = ["Task", "Owner", "Status", "Due"]
    for i, h in enumerate(headers):
        d.text((210 + i*120, 390), h, font=fb, fill=FG)
    rows = [["Design mockup", "Rahul", "Done", "May 10"],
            ["API integration", "Priya", "In Progress", "May 15"],
            ["Deploy to prod", "Arjun", "Todo", "May 20"]]
    for ri, row in enumerate(rows):
        for ci, cell in enumerate(row):
            d.text((210 + ci*120, 425 + ri*35), cell, font=fr, fill=FG)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "mcp-notion")

# ─── MCP-Slack — Slack Bot ───
def mcp_slack():
    W, H = 800, 600
    img = Image.new("RGB", (W, H), "#5E2D5E")
    d = ImageDraw.Draw(img)
    ft = get_font(18)
    fr = get_font_reg(14)
    fb = get_font(16)
    
    # Slack sidebar
    d.rectangle([0, 0, 60, H], fill="#3F0F3F", outline=FG, width=2)
    for i in range(4):
        y = 30 + i*55
        d.rectangle([10, y, 50, y+40], fill=["#E01E5A", "#36C5F0", "#2EB67D", "#ECB22E"][i], outline=FG, width=2)
    
    # Channel list
    d.rectangle([60, 0, 220, H], fill="#5E2D5E", outline=FG, width=2)
    d.text((80, 20), "# general", font=fb, fill="white")
    d.text((80, 50), "# dev-team", font=fr, fill="#D1D1D6")
    d.text((80, 80), "# ai-agent", font=fr, fill="#D1D1D6")
    
    # Chat area
    d.rectangle([220, 0, W, H], fill=BG, outline=FG, width=3)
    d.text((240, 20), "# ai-agent", font=ft, fill=FG)
    
    messages = [
        ("Rahul", "Can someone summarize today's standup?", BG, FG),
        ("Claude (AI)", "Sure! 3 topics discussed: 1) API migration, 2) New auth flow, 3) Deploy scheduled for Friday.", MINT, FG),
        ("Priya", "What was the decision on auth?", BG, FG),
        ("Claude (AI)", "Decision: Clerk over Auth0. Cost saving ₹24K/year. Implementation starts Monday.", YELLOW, FG),
    ]
    for i, (user, msg, col, txt) in enumerate(messages):
        y = 70 + i*110
        d.rectangle([240, y, W-40, y+90], fill=col, outline=FG, width=2)
        d.text((255, y+10), user, font=fb, fill=txt)
        d.text((255, y+35), msg, font=fr, fill=txt)
    
    # Input bar
    d.rectangle([240, 520, W-40, 580], fill=MUTED, outline=FG, width=2)
    d.text((260, 545), "Message #ai-agent...", font=fr, fill=GRAY)
    
    d.rectangle([0, 0, W-1, H-1], outline=FG, width=6)
    save(img, "mcp-slack")


if __name__ == "__main__":
    print(f"Generating unique product images to {OUTPUT_DIR}...")
    open_crm()
    bookstack()
    invoiceforge()
    saas_boiler()
    deployscript()
    ai_agent()
    clerk_auth()
    visionkit()
    mcp_notion()
    mcp_slack()
    print(f"\nDone. Generated 10 unique product mockup images.")
