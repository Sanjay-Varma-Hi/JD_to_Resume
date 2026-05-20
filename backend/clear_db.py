import asyncio
from database import connect_to_mongo, close_mongo_connection, get_db

async def main():
    await connect_to_mongo()
    db = get_db()
    collection = db["raw_posts"]
    
    delete_result = await collection.delete_many({})
    print(f"Successfully deleted {delete_result.deleted_count} posts from the database.")
    
    await close_mongo_connection()

asyncio.run(main())
