from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.api.ml_routes import router as ml_router
from app.database.mongo_client import db
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Predictive Risk Evaluation & Code Optimization API",
    description="Machine Learning backend for software module risk prediction and code optimization analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")
app.include_router(ml_router, prefix="/api")  # ML optimization routes

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("=" * 60)
    print("🚀 Predictive Risk Evaluation API Starting...")
    print("=" * 60)
    print(f"📊 MongoDB Database: {os.getenv('DB_NAME', 'risk_evaluation')}")
    print(f"🔗 CORS Origins: {origins}")
    print(f"📁 Model Directory: {os.getenv('ML_MODEL_PATH', 'app/models/saved_models/')}")
    print("=" * 60)

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    db.close()
    print("\n✓ Application shutdown complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Predictive Risk Evaluation API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
