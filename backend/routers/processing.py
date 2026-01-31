from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from schemas import ProcessingStatus, TokenData
from auth import get_current_user
from models import Document, Dataset
from queue import get_job_status, enqueue_reindex
import asyncio
import json

router = APIRouter()

@router.get("/processing/{job_id}/status", response_model=ProcessingStatus)
async def get_processing_status(
    job_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Get processing job status from Redis"""
    status = get_job_status(job_id)
    
    return ProcessingStatus(
        job_id=status['job_id'],
        status=status['status'],
        progress=status.get('progress'),
        error=status.get('error'),
        result=status.get('result')
    )

@router.post("/datasets/{dataset_id}/reindex")
async def reindex_dataset(
    dataset_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Queue dataset reindexing job"""
    # Verify dataset belongs to tenant
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.tenant_id == current_user.tenant_id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    job_id = enqueue_reindex(dataset_id, current_user.tenant_id)
    
    return {"job_id": job_id, "status": "queued"}

@router.get("/files/{file_id}")
async def get_file_details(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get file metadata and processing status"""
    document = db.query(Document).filter(
        Document.id == file_id,
        Document.tenant_id == current_user.tenant_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "file_id": str(document.id),
        "filename": document.filename,
        "mime_type": document.mime_type,
        "size_bytes": document.size_bytes,
        "status": document.processing_status,
        "error": document.processing_error,
        "metadata": document.metadata,
        "created_at": document.created_at
    }

@router.get("/processing/stream")
async def stream_processing_updates(
    current_user: TokenData = Depends(get_current_user)
):
    """SSE endpoint for real-time processing updates"""
    async def event_generator():
        db = next(get_db())
        try:
            while True:
                # Get recent processing documents
                documents = db.query(Document).filter(
                    Document.tenant_id == current_user.tenant_id,
                    Document.processing_status.in_(['pending', 'processing'])
                ).limit(10).all()
                
                for doc in documents:
                    event_data = {
                        "document_id": str(doc.id),
                        "filename": doc.filename,
                        "status": doc.processing_status,
                        "error": doc.processing_error
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"
                
                await asyncio.sleep(2)  # Poll every 2 seconds
        finally:
            db.close()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
