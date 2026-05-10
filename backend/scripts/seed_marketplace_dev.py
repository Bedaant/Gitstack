"""Seed dev marketplace data using Faker.

Run:
    cd backend && python scripts/seed_marketplace_dev.py
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

fake = Faker()
Faker.seed(42)

CATEGORIES = ["SaaS", "MCP Servers", "Computer Vision", "Templates", "Skills", "Other"]
SELLER_NAMES = ["alice_dev", "bob_builder", "charlie_code", "dana_designs", "eve_engineer"]


def make_product(seller_user_id: str, published: bool = True):
    title = fake.catch_phrase()
    return {
        "product_id": str(uuid4()),
        "seller_user_id": seller_user_id,
        "title": title,
        "tagline": fake.sentence(nb_words=8),
        "description": fake.text(max_nb_chars=800),
        "category": fake.random_element(CATEGORIES),
        "source_price_cents": fake.random_int(min=500, max=50000),
        "setup_price_cents": fake.random_int(min=0, max=20000),
        "setup_available": fake.boolean(chance_of_getting_true=30),
        "published": published,
        "screenshots": ["https://placehold.co/600x400/000000/FFF?text=Screenshot"],
        "r2_file_key": f"sources/{uuid4()}.zip" if published else None,
        "github_repo_url": f"https://github.com/{seller_user_id}/{title.lower().replace(' ', '-')}",
        "purchase_count": fake.random_int(min=0, max=500),
        "setup_count": fake.random_int(min=0, max=50),
        "avg_rating": round(fake.pyfloat(min_value=1.0, max_value=5.0, right_digits=1), 1),
        "review_count": fake.random_int(min=0, max=100),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def seed():
    mongo_url = os.environ.get("MONGO_URL")
    if not mongo_url:
        print("MONGO_URL not set — seed skipped")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get("DB_NAME", "gitstack")]

    # 0-to-1 Strategy: Seed our own high-value SaaS alternatives
    premium_seller = "gitstack_admin"
    await db.marketplace_sellers.update_one(
        {"seller_user_id": premium_seller}, 
        {"$set": {
            "seller_user_id": premium_seller,
            "user_id": premium_seller,
            "verified": True,
            "payout_method": "bank_transfer",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }}, upsert=True
    )

    premium_repos = [
        ("n8n", "n8n-io/n8n", "Fair-code workflow automation. The Zapier alternative.", 2900, 14900),
        ("Appwrite", "appwrite/appwrite", "Secure open-source backend server. The Firebase alternative.", 1900, 9900),
        ("Supabase", "supabase/supabase", "The open source Firebase alternative.", 1900, 9900),
        ("Cal.com", "calcom/cal.com", "Scheduling infrastructure for everyone. Calendly alternative.", 2900, 12900),
        ("Plausible", "plausible/analytics", "Simple, privacy-friendly Google Analytics alternative.", 1900, 4900)
    ]

    for title, repo, tagline, source_price, setup_price in premium_repos:
        p = make_product(premium_seller, published=True)
        p.update({
            "title": f"{title} (Ready to Deploy)",
            "tagline": tagline,
            "github_repo_url": f"https://github.com/{repo}",
            "source_price_cents": source_price,
            "setup_price_cents": setup_price,
            "setup_available": True,
            "category": "SaaS"
        })
        await db.marketplace_products.update_one({"title": p["title"]}, {"$set": p}, upsert=True)
    
    print("Seeded 5 premium 'Try This' products.")

    # Seed random sellers
    for name in SELLER_NAMES:
        seller_doc = {
            "seller_user_id": name,
            "user_id": name,
            "verified": fake.boolean(chance_of_getting_true=50),
            "payout_method": fake.random_element(["bank_transfer", "upi", "paypal"]),
            "payout_details": {"upi_id": f"{name}@upi"},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.marketplace_sellers.update_one(
            {"seller_user_id": name}, {"$set": seller_doc}, upsert=True
        )
        # Seed 3-8 products per seller
        products = [make_product(name, published=fake.boolean(chance_of_getting_true=80)) for _ in range(fake.random_int(min=3, max=8))]
        for p in products:
            await db.marketplace_products.update_one(
                {"product_id": p["product_id"]}, {"$set": p}, upsert=True
            )
        print(f"  Seeded {len(products)} products for {name}")

    print("Done seeding marketplace dev data.")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
