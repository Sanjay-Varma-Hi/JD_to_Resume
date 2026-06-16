import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Try to load .env.local first, then fall back to standard load_dotenv()
if os.path.exists("../.env.local"):
    load_dotenv("../.env.local")
elif os.path.exists(".env.local"):
    load_dotenv(".env.local")
else:
    load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017"
DB_NAME = os.getenv("DB_NAME", "linkedin_scraper_v2")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_instance = Database()

async def connect_to_mongo():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    db_instance.client = AsyncIOMotorClient(MONGO_URI)
    db_instance.db = db_instance.client[DB_NAME]
    print("Connected to MongoDB!")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
        print("MongoDB connection closed.")

def get_db():
    return db_instance.db

async def deduplicate_by_email(db):
    collection = db["raw_posts"]
    
    # We find all documents that have a non-null, non-empty recruiter_email
    pipeline = [
        {
            "$match": {
                "recruiter_email": {"$ne": None}
            }
        },
        {
            "$group": {
                "_id": {"$toLower": "$recruiter_email"},
                "docs": {
                    "$push": {
                        "_id": "$_id",
                        "status": "$status",
                        "ai_score": "$ai_score",
                        "scraped_at": "$scraped_at"
                    }
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$match": {
                "count": {"$gt": 1}
            }
        }
    ]
    
    deleted_count = 0
    try:
        from datetime import datetime
        cursor = collection.aggregate(pipeline)
        async for group in cursor:
            docs = group["docs"]
            # Clean up/normalize fields for sorting
            for doc in docs:
                doc["ai_score"] = doc.get("ai_score") or 0
                doc["status"] = doc.get("status") or "new"
                doc["scraped_at"] = doc.get("scraped_at")
            
            def get_timestamp(val):
                if not val:
                    return 0
                if isinstance(val, datetime):
                    return val.timestamp()
                if isinstance(val, str):
                    try:
                        s = val.replace("Z", "")
                        return datetime.fromisoformat(s).timestamp()
                    except:
                        return 0
                return 0
            
            # Sort order:
            # 1. contacted status first (so we don't lose contacted history)
            # 2. Highest AI score
            # 3. Latest scraped_at
            def sort_key(doc):
                status_priority = 2 if doc["status"] == "contacted" else (1 if doc["status"] == "new" else 0)
                scraped_time = get_timestamp(doc["scraped_at"])
                return (status_priority, doc["ai_score"], scraped_time)
            
            docs.sort(key=sort_key, reverse=True)
            
            # Keep the first doc, delete the rest
            keep_id = docs[0]["_id"]
            delete_ids = [d["_id"] for d in docs[1:]]
            
            res = await collection.delete_many({"_id": {"$in": delete_ids}})
            deleted_count += res.deleted_count
            
        if deleted_count > 0:
            print(f"Deduplicated by email: Deleted {deleted_count} duplicate leads.")
        return deleted_count
    except Exception as e:
        print(f"Error during email deduplication: {e}")
        return 0

