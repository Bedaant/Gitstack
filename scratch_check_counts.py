import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    mongo_url = 'mongodb+srv://bedaantsrivastav2001_db_user:t2ySgxUMayggwPrx@gitstack.uitx2nr.mongodb.net/?appName=gitstack'
    client = AsyncIOMotorClient(mongo_url)
    db = client['gitstack']
    try:
        tools = await db.tools.count_documents({})
        gh = await db.github_repos.count_documents({})
        print(f"Curated: {tools}, GitHub: {gh}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
