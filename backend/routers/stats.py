from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Document, Chunk
from schemas import TokenData
from auth import get_current_user

router = APIRouter()

@router.get("/stats")
async def get_system_stats(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Tenant-scoped statistics
    total_files = db.query(func.count(Document.id)).filter(
        Document.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    total_chunks = db.query(func.count(Chunk.id)).filter(
        Chunk.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    return {
        "totalFiles": total_files,
        "totalChunks": total_chunks,
        "totalQueries": 0,  # TODO: Implement query tracking
        "processingStatus": {
            "pending": 0,
            "processing": 0,
            "completed": total_files,
            "failed": 0
        },
        "trends": {
            "filesChange": 0,
            "queriesChange": 0,
            "chunksChange": 0
        }
    }

@router.get("/metrics/processing")
async def get_processing_metrics(
    current_user: TokenData = Depends(get_current_user)
):
    return {
        "avgProcessingTime": 0,
        "successRate": 0,
        "errorRate": 0,
        "recentActivity": []
    }
