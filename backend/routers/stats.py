from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from database import get_db
from models import Document, Chunk, Query, Dataset
from schemas import TokenData
from auth import get_current_user
from datetime import datetime, timedelta
from typing import Optional
from utils.caching import StatsCache

router = APIRouter()

@router.get("/stats")
async def get_system_stats(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tenant-scoped system statistics with trends"""
    
    # Check cache first
    cached = StatsCache.get_stats(current_user.tenant_id)
    if cached:
        return cached
    
    # Current stats
    total_files = db.query(func.count(Document.id)).filter(
        Document.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    total_chunks = db.query(func.count(Chunk.id)).filter(
        Chunk.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    total_queries = db.query(func.count(Query.id)).filter(
        Query.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    # Processing status breakdown
    completed = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.processing_status == 'completed'
        )
    ).scalar() or 0
    
    processing = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.processing_status == 'processing'
        )
    ).scalar() or 0
    
    failed = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.processing_status == 'failed'
        )
    ).scalar() or 0
    
    pending = total_files - completed - processing - failed
    
    # Trends (last 7 days vs previous 7 days)
    today = datetime.utcnow()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = today - timedelta(days=14)
    
    files_last_week = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.created_at >= week_ago
        )
    ).scalar() or 0
    
    files_prev_week = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.created_at >= two_weeks_ago,
            Document.created_at < week_ago
        )
    ).scalar() or 0
    
    queries_last_week = db.query(func.count(Query.id)).filter(
        and_(
            Query.tenant_id == current_user.tenant_id,
            Query.created_at >= week_ago
        )
    ).scalar() or 0
    
    queries_prev_week = db.query(func.count(Query.id)).filter(
        and_(
            Query.tenant_id == current_user.tenant_id,
            Query.created_at >= two_weeks_ago,
            Query.created_at < week_ago
        )
    ).scalar() or 0
    
    chunks_last_week = db.query(func.count(Chunk.id)).filter(
        and_(
            Chunk.tenant_id == current_user.tenant_id,
            Chunk.created_at >= week_ago
        )
    ).scalar() or 0
    
    chunks_prev_week = db.query(func.count(Chunk.id)).filter(
        and_(
            Chunk.tenant_id == current_user.tenant_id,
            Chunk.created_at >= two_weeks_ago,
            Chunk.created_at < week_ago
        )
    ).scalar() or 0
    
    # Calculate percentage changes
    def calc_change(current: int, previous: int) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)
    
    result = {
        "totalFiles": total_files,
        "totalChunks": total_chunks,
        "totalQueries": total_queries,
        "processingStatus": {
            "pending": pending,
            "processing": processing,
            "completed": completed,
            "failed": failed
        },
        "trends": {
            "filesChange": calc_change(files_last_week, files_prev_week),
            "queriesChange": calc_change(queries_last_week, queries_prev_week),
            "chunksChange": calc_change(chunks_last_week, chunks_prev_week)
        }
    }
    
    # Cache the result
    StatsCache.set_stats(current_user.tenant_id, result)
    return result

@router.get("/metrics/processing")
async def get_processing_metrics(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get processing performance metrics"""
    
    # Check cache first
    cached = StatsCache.get_metrics(current_user.tenant_id)
    if cached:
        return cached
    
    # Average processing time from query logs
    avg_time = db.query(func.avg(Query.processing_time)).filter(
        Query.tenant_id == current_user.tenant_id
    ).scalar() or 0.0
    
    # Success and error rates
    total_docs = db.query(func.count(Document.id)).filter(
        Document.tenant_id == current_user.tenant_id
    ).scalar() or 0
    
    completed_docs = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.processing_status == 'completed'
        )
    ).scalar() or 0
    
    failed_docs = db.query(func.count(Document.id)).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.processing_status == 'failed'
        )
    ).scalar() or 0
    
    success_rate = round((completed_docs / total_docs * 100), 1) if total_docs > 0 else 0.0
    error_rate = round((failed_docs / total_docs * 100), 1) if total_docs > 0 else 0.0
    
    # Recent activity (last 24 hours, grouped by hour)
    day_ago = datetime.utcnow() - timedelta(days=1)
    
    recent_uploads = db.query(
        func.date_trunc('hour', Document.created_at).label('hour'),
        func.count(Document.id).label('count')
    ).filter(
        and_(
            Document.tenant_id == current_user.tenant_id,
            Document.created_at >= day_ago
        )
    ).group_by('hour').order_by(desc('hour')).limit(24).all()
    
    recent_queries = db.query(
        func.date_trunc('hour', Query.created_at).label('hour'),
        func.count(Query.id).label('count')
    ).filter(
        and_(
            Query.tenant_id == current_user.tenant_id,
            Query.created_at >= day_ago
        )
    ).group_by('hour').order_by(desc('hour')).limit(24).all()
    
    # Format recent activity
    activity = []
    for upload in recent_uploads:
        activity.append({
            "timestamp": upload.hour.isoformat(),
            "type": "upload",
            "count": upload.count
        })
    
    for query in recent_queries:
        activity.append({
            "timestamp": query.hour.isoformat(),
            "type": "query",
            "count": query.count
        })
    
    # Sort by timestamp
    activity.sort(key=lambda x: x['timestamp'], reverse=True)
    
    result = {
        "avgProcessingTime": round(avg_time, 3),
        "successRate": success_rate,
        "errorRate": error_rate,
        "recentActivity": activity[:50]  # Limit to 50 most recent
    }
    
    # Cache the result
    StatsCache.set_metrics(current_user.tenant_id, result)
    return result

@router.get("/datasets/analytics")
async def get_dataset_analytics(
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get per-dataset analytics"""
    
    datasets = db.query(
        Dataset.id,
        Dataset.display_name,
        func.count(Document.id).label('doc_count'),
        func.count(Chunk.id).label('chunk_count')
    ).outerjoin(
        Document, Document.dataset_id == Dataset.id
    ).outerjoin(
        Chunk, Chunk.dataset_id == Dataset.id
    ).filter(
        Dataset.tenant_id == current_user.tenant_id
    ).group_by(Dataset.id, Dataset.display_name).all()
    
    return {
        "datasets": [
            {
                "id": ds.id,
                "name": ds.display_name,
                "documentCount": ds.doc_count or 0,
                "chunkCount": ds.chunk_count or 0
            }
            for ds in datasets
        ]
    }
