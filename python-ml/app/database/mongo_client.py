"""
MongoDB client configuration
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection string (can be configured via environment variable)
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")

try:
    # Create MongoDB client
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    # Verify connection
    client.admin.command('ping')
    db = client.get_database('risk_evaluation')
    print("✅ Connected to MongoDB")
except Exception as e:
    print(f"⚠️  MongoDB connection failed: {e}")
    print("   Using mock database for ML endpoints")
    db = None
