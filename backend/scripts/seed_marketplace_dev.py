"""Seed marketplace with 10 real products for non-technical founders.

Run:
    cd backend && python scripts/seed_marketplace_dev.py --production
"""
import asyncio
import os
import sys
import argparse
from datetime import datetime, timezone
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Categories must match backend Literal exactly
CATEGORIES = ["saas", "mcp-server", "computer-vision", "template", "skill", "other"]
SELLER_NAMES = ["alice_dev", "bob_builder", "charlie_code", "dana_designs", "eve_engineer"]

CURATED_PRODUCTS = [
    {
        "title": "CustomerBook",
        "tagline": "Never lose a lead again. Track customers, follow-ups, and deals in one place.",
        "description": """**The Problem You're Facing**

Your customer data is scattered across Excel sheets, WhatsApp chats, and notebooks. You forget to follow up. Hot leads go cold. You have no idea how much revenue is in your pipeline. You're essentially flying blind.

**What CustomerBook Does**

CustomerBook is a simple CRM built for Indian founders who don't want to pay HubSpot ₹3,600/month. It gives you one clean dashboard to manage every customer interaction.

**What You Get:**
- **Contact Database** — Store every lead and customer with phone, email, company, and notes
- **Deal Pipeline** — Drag deals from "New Lead" → "Meeting Scheduled" → "Proposal Sent" → "Won"
- **Follow-up Reminders** — Never forget a follow-up. Get reminded before leads go cold
- **Revenue Dashboard** — See your monthly pipeline, closed deals, and projected revenue at a glance
- **Mobile Access** — Works perfectly on your phone. Update deals while you're on the road
- **Team Access** — Add your sales team. Everyone sees the same data, no more confusion

**The Savings:**
HubSpot Starter: ₹3,600/month = ₹43,200/year
CustomerBook: ₹2,400 one-time
**You save ₹40,800 in the first year alone.**

**Setup Service (₹1,500):**
We import your existing customer list, set up your sales stages, configure follow-up reminders, and train you in a 30-minute video call. You'll be tracking deals within an hour.

**Who This Is For:**
Freelancers, agencies, consultants, real estate agents, coaches — anyone who sells services and needs to track leads without complexity.""",
        "category": "saas",
        "source_price_cents": 2400,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Import contacts, configure pipeline, set reminders, 30-min training call",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/twentyhq/twenty",
        "purchase_count": 23,
        "avg_rating": 4.7,
        "review_count": 8,
    },
    {
        "title": "AppointmentPro",
        "tagline": "Stop the WhatsApp scheduling dance. Let clients book themselves and pay upfront.",
        "description": """**The Problem You're Facing**

"Are you free Tuesday at 3?" "No, what about Wednesday?" "Wednesday I'm busy, Thursday?" — This back-and-forth wastes 20 minutes per booking. Clients forget appointments. You lose revenue from no-shows. You look unprofessional.

**What AppointmentPro Does**

AppointmentPro replaces Calendly with your own branded booking page. Clients see your availability, pick a slot, pay a deposit, and receive an automatic Zoom link. Zero back-and-forth.

**What You Get:**
- **Branded Booking Page** — Your logo, your colors, your domain. Looks like you built it
- **Deposit Collection** — Require payment before booking so no-shows cost you nothing
- **Automatic Zoom Links** — Meeting link generated and emailed to both parties
- **SMS Reminders** — Client gets reminded 1 hour before. No more forgotten calls
- **Google Calendar Sync** — Your availability stays in sync automatically
- **Buffer Time** — Set gaps between meetings so you're not rushing

**The Savings:**
Calendly Professional: ₹1,000/month = ₹12,000/year
AppointmentPro: ₹2,000 one-time
**You save ₹10,000 in the first year.**

**Setup Service (₹1,500):**
We brand the page with your logo and colors, connect your Google Calendar, set your availability hours, configure deposit amounts, and give you the link to share.

**Who This Is For:**
Consultants, coaches, doctors, lawyers, salon owners, tutors — anyone who takes appointments and is tired of scheduling chaos.""",
        "category": "saas",
        "source_price_cents": 2000,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Brand page, connect calendar, set availability, configure deposits",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/calcom/cal.com",
        "purchase_count": 18,
        "avg_rating": 4.5,
        "review_count": 6,
    },
    {
        "title": "InvoiceFast",
        "tagline": "Create GST invoices in 2 clicks. Get paid faster with automatic reminders.",
        "description": """**The Problem You're Facing**

You're creating invoices in Word or Excel. Every invoice takes 15 minutes to format. Clients delay payment because there's no easy "Pay Now" button. You have no idea who owes you money or for how long. Tax season is a nightmare.

**What InvoiceFast Does**

InvoiceFast is a self-hosted invoicing tool built for Indian businesses. GST-compliant invoices, automatic payment collection, and payment reminders — all in one place.

**What You Get:**
- **GST-Compliant Invoices** — Auto-calculates CGST, SGST, IGST. Your CA will thank you
- **"Pay Now" Button** — Clients pay via UPI, credit card, debit card, or net banking instantly
- **Payment Reminders** — Automatic email reminders for overdue invoices (gentle, then firm)
- **Client Portal** — Clients log in to see all their invoices and payment history
- **Recurring Invoices** — Monthly retainers? Set it once, invoices go out automatically
- **Expense Tracking** — Log business expenses and see your profit after costs

**The Savings:**
QuickBooks Simple Start: ₹1,500/month = ₹18,000/year
InvoiceFast: ₹1,600 one-time
**You save ₹16,400 in the first year.**

**Setup Service (₹1,000):**
We add your logo, GST number, bank details, and create your first invoice template. Send your first invoice in 15 minutes.

**Who This Is For:**
Freelancers, agencies, small businesses, consultants, contractors — anyone who sends invoices and wants to get paid faster.""",
        "category": "saas",
        "source_price_cents": 1600,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1000,
        "setup_description": "Add logo, GST, bank details, create first invoice template",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/InvoicePlane/InvoicePlane",
        "purchase_count": 31,
        "avg_rating": 4.8,
        "review_count": 12,
    },
    {
        "title": "ShopOne",
        "tagline": "Your own online store. No Shopify fees. Keep 100% of every sale.",
        "description": """**The Problem You're Facing**

You sell on Instagram and WhatsApp but have no proper store. Orders get lost in DMs. You can't collect payments properly. Shopify charges ₹2,000/month PLUS 2% of every sale. On ₹1 lakh revenue, that's ₹2,000 + ₹4,000 = ₹6,000 gone.

**What ShopOne Does**

ShopOne gives you a complete online store that you own. Product catalog, shopping cart, payment collection, and order tracking — with zero platform fees per sale.

**What You Get:**
- **Product Catalog** — Add unlimited products with photos, descriptions, variants (size, color)
- **Shopping Cart & Checkout** — Smooth buying experience that converts browsers to buyers
- **Payment Collection** — Razorpay integration for UPI, cards, wallets. Money goes straight to your account
- **Order Management** — Track orders from "Placed" → "Shipped" → "Delivered"
- **Customer Accounts** — Buyers can log in, see order history, and reorder
- **Inventory Tracking** — Know when stock is low before you run out
- **Zero Transaction Fees** — You pay nothing per sale. Keep 100%.

**The Savings:**
Shopify Basic: ₹24,000/year + 2% per sale
ShopOne: ₹2,900 one-time + 0% per sale
On ₹5 lakh revenue: **You save ₹34,000 in the first year.**

**Setup Service (₹2,500):**
We add up to 20 products, configure payment collection, set up shipping options, connect your domain, and launch your store.

**Who This Is For:**
Product sellers, fashion brands, handmade goods, digital product creators, food businesses — anyone who wants to sell online without giving away margin.""",
        "category": "saas",
        "source_price_cents": 2900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2500,
        "setup_description": "Add 20 products, configure payments, shipping, domain, launch store",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/medusajs/medusa",
        "purchase_count": 14,
        "avg_rating": 4.6,
        "review_count": 5,
    },
    {
        "title": "EmailAuto",
        "tagline": "Turn website visitors into paying customers with automated emails.",
        "description": """**The Problem You're Facing**

Someone visits your website, likes what they see, but leaves without buying. You never hear from them again. You're manually emailing customers one by one. New signups get no welcome. Old customers forget you exist. You're leaving money on the table every single day.

**What EmailAuto Does**

EmailAuto sends the right email to the right person at the right time — automatically. Welcome new subscribers, follow up with leads, and bring back old customers without lifting a finger.

**What You Get:**
- **Welcome Sequence** — Every new signup gets a series of 5 emails introducing your business and building trust
- **Abandoned Cart Recovery** — Someone adds to cart but doesn't buy? Automatic reminder email with their items
- **Follow-up Sequences** — "Day 3: Tips" → "Day 7: Case study" → "Day 14: Special offer"
- **Newsletter Broadcasting** — Send one email to your entire list. Announce sales, new products, or content
- **Open & Click Tracking** — See exactly who opened and clicked. Follow up with the engaged ones
- **Beautiful Templates** — 10 pre-designed email templates with your branding

**The Savings:**
Mailchimp Essentials: ₹1,100/month = ₹13,200/year
EmailAuto: ₹1,200 one-time
**You save ₹12,000 in the first year.**

**Setup Service (₹1,500):**
We write your welcome email series (5 emails), set up abandoned cart recovery, create a newsletter template, and connect to your website signup form.

**Who This Is For:**
E-commerce stores, coaches, course creators, SaaS founders, agencies — anyone who has website visitors and wants to convert them into buyers through email.""",
        "category": "saas",
        "source_price_cents": 1200,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Write 5 welcome emails, set up abandoned cart, create newsletter template",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/knadh/listmonk",
        "purchase_count": 19,
        "avg_rating": 4.4,
        "review_count": 4,
    },
    {
        "title": "BusinessSite",
        "tagline": "A professional website that loads in 1 second and ranks on Google.",
        "description": """**The Problem You're Facing**

You don't have a website. Or your current site is slow, ugly, and doesn't show up on Google. When potential clients search for you, they find your competitors instead. You look amateur. You're losing credibility and business before you even speak to anyone.

**What BusinessSite Does**

BusinessSite is a complete 5-page website built for speed and search rankings. It makes you look like a serious business from day one.

**What You Get:**
- **5 Essential Pages** — Home, About, Services, Contact, and Blog
- **Lightning Fast** — Loads in under 1 second. Google ranks fast sites higher
- **Mobile Perfect** — Looks stunning on phones. 70% of your traffic is mobile
- **Contact Form** — Leads fill out a form and it lands in your email instantly
- **SEO Ready** — Auto-generated sitemap, structured data, meta tags. Google finds you faster
- **Blog Included** — Publish articles that rank and bring free traffic from Google
- **Your Own Domain** — yourbusiness.com (we help you buy and connect it)
- **Dark Mode** — Modern look that impresses visitors

**The Savings:**
Wix Premium: ₹1,500/month = ₹18,000/year
BusinessSite: ₹2,900 one-time
**You save ₹15,100 in the first year.**

**Setup Service (₹2,000):**
We write your content, design the layout with your branding, buy and connect your domain, and launch in 48 hours. You just review and approve.

**Who This Is For:**
Any business that needs a professional online presence. Consultants, agencies, restaurants, clinics, shops, coaches, real estate agents — if you don't have a great website, this is for you.""",
        "category": "template",
        "source_price_cents": 2900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2000,
        "setup_description": "Write content, design layout, buy domain, launch in 48 hours",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/t3-oss/create-t3-app",
        "purchase_count": 27,
        "avg_rating": 4.9,
        "review_count": 11,
    },
    {
        "title": "WhatsAppBot",
        "tagline": "Auto-reply to customers on WhatsApp 24/7. Never miss a lead again.",
        "description": """**The Problem You're Facing**

Your customers message you on WhatsApp but you can't reply to everyone instantly. At night, on weekends, during meetings — leads go unanswered. Competitors reply faster and steal your business. You're manually answering the same questions 50 times a day.

**What WhatsAppBot Does**

WhatsAppBot automatically replies to common questions, sends order updates, and collects leads — even when you're sleeping. It's like hiring a full-time assistant for the price of one dinner.

**What You Get:**
- **Instant Auto-Reply** — "What's your price?", "Where are you located?", "Do you deliver?" — answered instantly
- **Order Updates** — Customer places order? Automatic confirmation. Shipped? Tracking sent. Delivered? Review requested
- **Lead Collection** — "Send YES to get our brochure" — bot captures phone numbers and emails
- **Payment Reminders** — Gentle reminders for pending payments. No more awkward follow-ups
- **24/7 Availability** — Works while you sleep, eat, or take a vacation
- **Conversation Dashboard** — See all chats in one place. Take over anytime when needed

**The Savings:**
Hiring a full-time assistant: ₹15,000/month = ₹1,80,000/year
WhatsAppBot + Setup: ₹4,900 total
**You save ₹1,75,100 in the first year.**

**Setup Service (₹2,500):**
We connect your business WhatsApp, configure 10 auto-replies for your most common questions, set up order update flows, and train you on the dashboard.

**Who This Is For:**
E-commerce stores, restaurants, clinics, salons, real estate agents, coaches — anyone whose customers message them on WhatsApp and wants to reply faster without hiring staff.""",
        "category": "saas",
        "source_price_cents": 2400,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2500,
        "setup_description": "Connect WhatsApp, configure 10 auto-replies, set up order flows, train on dashboard",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/wppconnect-team/wppconnect",
        "purchase_count": 12,
        "avg_rating": 4.3,
        "review_count": 3,
    },
    {
        "title": "TeamTrack",
        "tagline": "Track attendance, tasks, and payroll for your team. No more chaos.",
        "description": """**The Problem You're Facing**

You manage 3-10 people but have no system. Attendance is on paper or memory. Task assignments happen in WhatsApp groups and get buried. You don't know who's working on what. Payroll calculation is a monthly headache. Someone takes leave and you forget.

**What TeamTrack Does**

TeamTrack is a simple HR system for small teams. Check-in/check-out, task assignments, leave requests, and payroll — all in one clean dashboard.

**What You Get:**
- **Attendance Tracking** — Team checks in with a click. See who's present, late, or absent daily
- **Task Assignments** — Assign tasks with deadlines. Track progress without asking "Is it done yet?"
- **Leave Management** — Employees request leave. You approve or reject. Calendar shows who's off when
- **Payroll Calculation** — Auto-calculates salary based on attendance, leaves, and overtime
- **Payslip Generation** — Professional payslips sent to employees every month
- **Works for All Teams** — Office, remote, or hybrid. Everyone uses the same system

**The Savings:**
Keka HR: ₹2,500/month = ₹30,000/year
TeamTrack: ₹1,900 one-time
**You save ₹28,100 in the first year.**

**Setup Service (₹1,500):**
We add your team members, set up their roles and salaries, configure leave policies, and import existing attendance data.

**Who This Is For:**
Small businesses, agencies, startups, retail stores, clinics — anyone managing a team of 3-20 people without an HR system.""",
        "category": "saas",
        "source_price_cents": 1900,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Add team, set roles and salaries, configure leave policies, import data",
        "setup_delivery_days": 1,
        "github_repo_url": "https://github.com/attendize/attendize",
        "purchase_count": 9,
        "avg_rating": 4.5,
        "review_count": 2,
    },
    {
        "title": "CommunityHub",
        "tagline": "Your own private community. Own your audience. No platform risk.",
        "description": """**The Problem You're Facing**

You run a course, coaching program, or community but everyone is scattered across WhatsApp groups. Messages get lost. There's no structure. You can't search old discussions. You're building your audience on someone else's platform — and they can ban you anytime.

**What CommunityHub Does**

CommunityHub gives you a private, branded community space that you own completely. Discussion forums, course hosting, member profiles — all under your control.

**What You Get:**
- **Discussion Forums** — Organized by topic. Members ask questions, share wins, help each other
- **Course Hosting** — Upload videos, PDFs, and resources. Members access everything in one place
- **Member Profiles** — Track progress, badges, and contributions
- **Search Everything** — Find any discussion, resource, or member instantly
- **Mobile-Friendly** — Members participate from their phones
- **You Own It** — Your data, your rules, your platform. No risk of getting banned or shut down

**The Savings:**
Circle.so Basic: ₹3,000/month = ₹36,000/year
CommunityHub: ₹2,400 one-time
**You save ₹33,600 in the first year.**

**Setup Service (₹2,000):**
We set up your community structure, add your branding, create your first 3 discussion categories, and onboard your first 10 members.

**Who This Is For:**
Course creators, coaches, fitness trainers, spiritual leaders, hobby groups — anyone who wants to build a community they fully own and control.""",
        "category": "saas",
        "source_price_cents": 2400,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 2000,
        "setup_description": "Set up community structure, branding, 3 categories, onboard 10 members",
        "setup_delivery_days": 2,
        "github_repo_url": "https://github.com/flarum/flarum",
        "purchase_count": 7,
        "avg_rating": 4.6,
        "review_count": 2,
    },
    {
        "title": "SEOBlog",
        "tagline": "Rank on Google and get free customers. A blog that actually works.",
        "description": """**The Problem You're Facing**

You want Google to send you free customers but your website doesn't show up in search. You write blog posts but no one reads them. Your competitors rank above you for everything. You're spending money on ads when you could be getting free traffic.

**What SEOBlog Does**

SEOBlog is a blog built to rank on Google. Fast loading, proper structure, and all the technical SEO handled automatically. You just write — Google brings the visitors.

**What You Get:**
- **Lightning Fast** — Loads in under 1 second. Google ranks fast sites higher
- **Auto Sitemap** — Every post is submitted to Google automatically
- **Structured Data** — Rich snippets in search results (stars, dates, images)
- **Social Sharing** — One-click share buttons for Twitter, LinkedIn, WhatsApp
- **Analytics Built-in** — See which posts bring the most traffic and leads
- **Clean Writing Experience** — Distraction-free editor. Just write and publish
- **Mobile Optimized** — Looks perfect on phones where 70% of readers are

**The Savings:**
WordPress + Hosting + SEO Plugins: ₹800/month = ₹9,600/year
SEOBlog: ₹1,500 one-time
**You save ₹8,100 in the first year.**

**Setup Service (₹1,500):**
We write your first 5 blog posts optimized for search, connect Google Analytics, submit your site to Google, and teach you the content strategy.

**Who This Is For:**
Any business that wants free traffic from Google. Consultants, agencies, e-commerce stores, coaches, real estate agents — if you can write about your expertise, this brings you customers.""",
        "category": "template",
        "source_price_cents": 1500,
        "currency": "INR",
        "setup_available": True,
        "setup_price_cents": 1500,
        "setup_description": "Write 5 SEO-optimized posts, connect analytics, submit to Google, teach strategy",
        "setup_delivery_days": 3,
        "github_repo_url": "https://github.com/vercel/next.js",
        "purchase_count": 15,
        "avg_rating": 4.7,
        "review_count": 5,
    },
]


def make_product(seller_user_id: str, published: bool = True):
    import random
    from faker import Faker
    fake = Faker()
    Faker.seed(42)
    title = fake.catch_phrase()
    return {
        "product_id": str(uuid4()),
        "seller_user_id": seller_user_id,
        "title": title,
        "tagline": fake.sentence(nb_words=8),
        "description": fake.text(max_nb_chars=800),
        "category": fake.random_element(CATEGORIES),
        "source_price_cents": fake.random_int(min=500, max=50000),
        "currency": "INR",
        "setup_price_cents": fake.random_int(min=0, max=20000),
        "setup_available": fake.boolean(chance_of_getting_true=30),
        "setup_description": fake.sentence(nb_words=10) if fake.boolean(chance_of_getting_true=30) else None,
        "setup_delivery_days": fake.random_int(min=1, max=7) if fake.boolean(chance_of_getting_true=30) else None,
        "published": published,
        "screenshots": ["https://placehold.co/600x400/000000/FFF?text=Screenshot"],
        "r2_file_key": f"sources/{uuid4()}.zip" if published else None,
        "github_repo_url": f"https://github.com/{seller_user_id}/{title.lower().replace(' ', '-').replace(',', '')}",
        "purchase_count": fake.random_int(min=0, max=500),
        "setup_count": fake.random_int(min=0, max=50),
        "avg_rating": round(fake.pyfloat(min_value=1.0, max_value=5.0, right_digits=1), 1),
        "review_count": fake.random_int(min=0, max=100),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def seed(production: bool = False):
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("MONGO_URL not set - seed skipped")
        return

    db_name = os.environ.get("DB_NAME", "gitstack")
    print(f"Connecting to MongoDB database: {db_name}")
    if production:
        print("WARNING: PRODUCTION MODE - inserting into live database")

    import ssl
    client = AsyncIOMotorClient(
        mongo_url,
        tls=True,
        tlsAllowInvalidCertificates=True,
    )
    db = client[db_name]

    # Curated seller
    curated_seller = "gitstack_curated"
    await db.marketplace_sellers.update_one(
        {"seller_user_id": curated_seller},
        {"$set": {
            "seller_user_id": curated_seller,
            "display_name": "GitStack Curated",
            "bio": "Hand-picked open-source tools, templates, and setups reviewed by the GitStack team.",
            "verified": True,
            "payout_method": "upi",
            "payout_details": {"upi_id": "gitstack@upi"},
            "available_for_hire": False,
            "onboarded_at": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }}, upsert=True
    )
    print(f"  Upserted seller: {curated_seller}")

    # Insert curated products
    inserted = 0
    for template in CURATED_PRODUCTS:
        doc = {
            "product_id": str(uuid4()),
            "seller_user_id": curated_seller,
            **template,
            "published": True,
            "sold_out": True,
            "max_purchases": 50,
            "screenshots": [f"/product-images/v2-{template['title'].lower().replace(' ', '-')}.png"],
            "r2_file_key": f"sources/{template['title'].lower().replace(' ', '-')}.zip",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.marketplace_products.update_one(
            {"title": doc["title"], "seller_user_id": curated_seller},
            {"$set": doc},
            upsert=True
        )
        inserted += 1
    print(f"  Seeded {inserted} curated products.")

    print("\nDone seeding marketplace data.")
    print(f"Total curated products: {inserted}")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed GitStack marketplace data")
    parser.add_argument("--production", action="store_true", help="Confirm production database seed")
    args = parser.parse_args()
    asyncio.run(seed(production=args.production))
