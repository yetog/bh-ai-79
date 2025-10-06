from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import SignedUrlRequest, SignedUrlResponse, UploadCompleteRequest, UploadCompleteResponse, TokenData
from auth import get_current_user
from config import get_settings
import boto3
from botocore.client import Config
import uuid
from models import Document

settings = get_settings()
router = APIRouter()

# S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=settings.S3_ENDPOINT,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name=settings.S3_REGION
)

@router.post("/uploads/sign", response_model=SignedUrlResponse)
async def get_signed_url(
    request: SignedUrlRequest,
    current_user: TokenData = Depends(get_current_user)
):
    # Generate tenant-scoped S3 key
    file_extension = request.filename.split('.')[-1] if '.' in request.filename else ''
    object_key = f"{current_user.tenant_id}/uploads/{uuid.uuid4()}.{file_extension}"
    
    try:
        # Generate presigned URL for upload
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': settings.S3_BUCKET,
                'Key': object_key,
                'ContentType': request.content_type
            },
            ExpiresIn=3600
        )
        
        return SignedUrlResponse(
            upload_url=presigned_url,
            key=object_key,
            expires_in=3600
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")

@router.post("/uploads/complete", response_model=UploadCompleteResponse)
async def upload_complete(
    request: UploadCompleteRequest,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify key belongs to user's tenant
    if not request.key.startswith(f"{current_user.tenant_id}/"):
        raise HTTPException(status_code=403, detail="Invalid upload key")
    
    # Create document record
    document = Document(
        dataset_id=request.dataset_id,
        tenant_id=current_user.tenant_id,
        source_uri=f"s3://{settings.S3_BUCKET}/{request.key}",
        filename=request.filename,
        mime_type=request.mimetype,
        size_bytes=request.size,
        checksum=request.checksum,
        processing_status="pending"
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # TODO: Queue processing job
    job_id = f"job-{uuid.uuid4()}"
    
    return UploadCompleteResponse(
        document_id=document.id,
        job_id=job_id
    )
