import asyncio
from database import connect_to_mongo, close_mongo_connection, get_db

async def main():
    await connect_to_mongo()
    db = get_db()
    collection = db["raw_posts"]
    
    # 1. Remove posts with "No URL"
    delete_result = await collection.delete_many({"post_url": "No URL"})
    print(f"Deleted {delete_result.deleted_count} posts with 'No URL'")
    
    # 2. Remove duplicates
    pipeline = [
        {"$group": {
            "_id": "$post_url",
            "dups": {"$push": "$_id"},
            "count": {"$sum": 1}
        }},
        {"$match": {"count": {"$gt": 1}}}
    ]
    cursor = collection.aggregate(pipeline)
    duplicates_removed = 0
    async for doc in cursor:
        dups = doc["dups"]
        # Keep the first one, delete the rest
        dups_to_remove = dups[1:]
        res = await collection.delete_many({"_id": {"$in": dups_to_remove}})
        duplicates_removed += res.deleted_count
        
    print(f"Deleted {duplicates_removed} duplicate posts")
    
    await close_mongo_connection()

asyncio.run(main())
