from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Dataset, Document
from schemas import DatasetCreate, DatasetResponse, TokenData
from auth import get_current_user
from sqlalchemy import func

router = APIRouter()

@router.post("/datasets", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    dataset_data: DatasetCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Validate tenant matches
    if dataset_data.manifest.tenant_id != current_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create dataset for different tenant"
        )
    
    # Check if dataset already exists
    existing = db.query(Dataset).filter(Dataset.id == dataset_data.manifest.dataset_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset with this ID already exists"
        )
    
    dataset = Dataset(
        id=dataset_data.manifest.dataset_id,
        tenant_id=current_user.tenant_id,
        display_name=dataset_data.manifest.display_name,
        manifest=dataset_data.manifest.model_dump()
    )
    
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    return DatasetResponse(
        id=dataset.id,
        tenant_id=dataset.tenant_id,
        display_name=dataset.display_name,
        manifest=dataset.manifest,
        created_at=dataset.created_at,
        document_count=0,
        index_status="pending"
    )

@router.get("/datasets", response_model=List[DatasetResponse])
async def list_datasets(
    status: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Base query with tenant isolation
    datasets_query = db.query(
        Dataset,
        func.count(Document.id).label("document_count")
    ).outerjoin(Document).filter(
        Dataset.tenant_id == current_user.tenant_id
    ).group_by(Dataset.id)
    
    # Apply search filter
    if query:
        datasets_query = datasets_query.filter(Dataset.display_name.ilike(f"%{query}%"))
    
    results = datasets_query.all()
    
    return [
        DatasetResponse(
            id=ds.id,
            tenant_id=ds.tenant_id,
            display_name=ds.display_name,
            manifest=ds.manifest,
            created_at=ds.created_at,
            document_count=doc_count,
            index_status="complete"
        )
        for ds, doc_count in results
    ]

@router.get("/datasets/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.tenant_id == current_user.tenant_id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    doc_count = db.query(func.count(Document.id)).filter(
        Document.dataset_id == dataset_id
    ).scalar()
    
    return DatasetResponse(
        id=dataset.id,
        tenant_id=dataset.tenant_id,
        display_name=dataset.display_name,
        manifest=dataset.manifest,
        created_at=dataset.created_at,
        document_count=doc_count,
        index_status="complete"
    )

@router.patch("/datasets/{dataset_id}", response_model=DatasetResponse)
async def update_dataset(
    dataset_id: str,
    dataset_data: DatasetCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.tenant_id == current_user.tenant_id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset.display_name = dataset_data.manifest.display_name
    dataset.manifest = dataset_data.manifest.model_dump()
    
    db.commit()
    db.refresh(dataset)
    
    return DatasetResponse(
        id=dataset.id,
        tenant_id=dataset.tenant_id,
        display_name=dataset.display_name,
        manifest=dataset.manifest,
        created_at=dataset.created_at
    )

@router.delete("/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id,
        Dataset.tenant_id == current_user.tenant_id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    db.delete(dataset)
    db.commit()
    
    return None
