import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client['gitstack']
    
    # Update SEOBlog screenshots
    result = await db.marketplace_products.update_one(
        {'title': 'SEOBlog'},
        {'$set': {'screenshots': ['/product-images/seoblog-hero.png']}}
    )
    print(f'Updated screenshots: modified={result.modified_count}')
    
    # Check price
    p = await db.marketplace_products.find_one({'title': 'SEOBlog'})
    print(f'source_price_cents: {p["source_price_cents"]}')
    print(f'setup_price_cents: {p.get("setup_price_cents")}')
    print(f'Screenshots: {p["screenshots"]}')
    
    client.close()

asyncio.run(fix())
