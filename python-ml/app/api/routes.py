"""
General API routes
"""

from fastapi import APIRouter

router = APIRouter(tags=["API"])

@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Risk Evaluation API"
    }
