import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client['gitstack']
    
    count = 0
    async for p in db.marketplace_products.find({'seller_user_id': 'gitstack_curated'}):
        old_source = p['source_price_cents']
        old_setup = p.get('setup_price_cents', 0)
        
        # Multiply by 100 to convert rupees to paise
        new_source = old_source * 100
        new_setup = old_setup * 100 if old_setup else 0
        
        update = {'source_price_cents': new_source}
        if old_setup:
            update['setup_price_cents'] = new_setup
        
        await db.marketplace_products.update_one(
            {'product_id': p['product_id']},
            {'$set': update}
        )
        
        print(f"{p['title']}: source {old_source} -> {new_source}, setup {old_setup} -> {new_setup}")
        count += 1
    
    print(f"\nFixed {count} products")
    client.close()

asyncio.run(fix())
