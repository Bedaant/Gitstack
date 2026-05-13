import asyncio, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'), tls=True, tlsAllowInvalidCertificates=True)
    db = client['gitstack']
    
    # Update SEOBlog to include all 3 creatives
    await db.marketplace_products.update_one(
        {'title': 'SEOBlog'},
        {'$set': {'screenshots': [
            '/product-images/seoblog-hero.png',
            '/product-images/seoblog-features.png',
            '/product-images/seoblog-pricing.png'
        ]}}
    )
    
    p = await db.marketplace_products.find_one({'title': 'SEOBlog'})
    print(f"SEOBlog screenshots: {p['screenshots']}")
    
    # Also fix all other products to use their v2 images
    for slug in ['customerbook', 'appointmentpro', 'invoicefast', 'shopone', 
                 'emailauto', 'businesssite', 'whatsappbot', 'teamtrack', 'communityhub']:
        title = slug.replace('-', ' ').title().replace('Invoicefast', 'InvoiceFast').replace('Shopone', 'ShopOne').replace('Emailauto', 'EmailAuto').replace('Businesssite', 'BusinessSite').replace('Whatsappbot', 'WhatsAppBot').replace('Teamtrack', 'TeamTrack').replace('Communityhub', 'CommunityHub')
        # Map titles correctly
        title_map = {
            'customerbook': 'CustomerBook',
            'appointmentpro': 'AppointmentPro', 
            'invoicefast': 'InvoiceFast',
            'shopone': 'ShopOne',
            'emailauto': 'EmailAuto',
            'businesssite': 'BusinessSite',
            'whatsappbot': 'WhatsAppBot',
            'teamtrack': 'TeamTrack',
            'communityhub': 'CommunityHub'
        }
        t = title_map.get(slug, slug.title())
        await db.marketplace_products.update_one(
            {'title': t},
            {'$set': {'screenshots': [f'/product-images/v2-{slug}.png']}}
        )
        print(f"{t}: /product-images/v2-{slug}.png")
    
    client.close()

asyncio.run(fix())
