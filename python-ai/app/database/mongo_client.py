from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os
from dotenv import load_dotenv

load_dotenv()

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize MongoDB connection"""
        try:
            self.client = MongoClient(
                os.getenv("MONGODB_URI", "mongodb://localhost:27017/"),
                serverSelectionTimeoutMS=5000
            )
            # Test connection
            self.client.admin.command('ping')
            self.db = self.client[os.getenv("DB_NAME", "risk_evaluation")]
            print("✓ MongoDB connected successfully")
        except ConnectionFailure as e:
            print(f"✗ MongoDB connection failed: {e}")
            raise
    
    def get_collection(self, name: str):
        """Get a MongoDB collection"""
        return self.db[name]
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("✓ MongoDB connection closed")

# Singleton instance
db = Database()
