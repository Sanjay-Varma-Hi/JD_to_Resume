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
