import os
import tempfile
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Document, Chunk, Dataset
from workers.extractors import FileExtractor
from workers.chunking import TextChunker
from workers.embedding import EmbeddingService
from config import get_settings
import boto3
from botocore.client import Config
from rq import get_current_job

settings = get_settings()

# S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=settings.S3_ENDPOINT,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    config=Config(signature_version='s3v4'),
    region_name=settings.S3_REGION
)

def update_job_progress(progress: float):
    """Update current job progress in Redis"""
    job = get_current_job()
    if job:
        job.meta['progress'] = progress
        job.save_meta()

def process_document(document_id: str, tenant_id: str):
    """Main ingestion worker: extract, chunk, embed, index"""
    db = SessionLocal()
    
    try:
        # Fetch document
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == tenant_id
        ).first()
        
        if not document:
            raise ValueError(f"Document {document_id} not found")
        
        # Update status
        document.processing_status = "processing"
        db.commit()
        update_job_progress(0.1)
        
        # Get dataset manifest for chunking config
        dataset = db.query(Dataset).filter(Dataset.id == document.dataset_id).first()
        manifest = dataset.manifest if dataset else {}
        preprocess_config = manifest.get('preprocess', {})
        
        # Download file from S3
        s3_key = document.source_uri.replace(f"s3://{settings.S3_BUCKET}/", "")
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(document.filename)[1])
        
        try:
            s3_client.download_file(settings.S3_BUCKET, s3_key, temp_file.name)
            update_job_progress(0.2)
            
            # Extract text
            extractor = FileExtractor()
            extracted = extractor.extract_text(temp_file.name, document.mime_type)
            update_job_progress(0.4)
            
            # Chunk text
            chunker = TextChunker(
                chunk_size=preprocess_config.get('chunk_size', 800),
                chunk_overlap=preprocess_config.get('chunk_overlap', 120),
                min_length=preprocess_config.get('min_text_length', 40)
            )
            
            chunks = chunker.chunk_pages(
                extracted['pages'],
                metadata={'filename': document.filename}
            )
            update_job_progress(0.6)
            
            if not chunks:
                document.processing_status = "completed"
                document.processing_error = "No chunks extracted (empty file)"
                db.commit()
                return {"status": "completed", "chunks": 0}
            
            # Generate embeddings
            embedding_service = EmbeddingService()
            chunk_texts = [c['text'] for c in chunks]
            embeddings = embedding_service.batch_generate(chunk_texts)
            update_job_progress(0.8)
            
            # Insert chunks into database
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db_chunk = Chunk(
                    document_id=document.id,
                    dataset_id=document.dataset_id,
                    tenant_id=tenant_id,
                    chunk_index=chunk['index'],
                    page=chunk['metadata'].get('page'),
                    text=chunk['text'],
                    tokens=len(chunk['text'].split()),
                    metadata=chunk['metadata'],
                    embedding=embedding
                )
                db.add(db_chunk)
            
            # Update document status
            document.processing_status = "completed"
            document.metadata = {
                'total_chunks': len(chunks),
                'total_pages': extracted.get('total_pages', 1)
            }
            db.commit()
            update_job_progress(1.0)
            
            return {
                "status": "completed",
                "chunks": len(chunks),
                "document_id": str(document_id)
            }
            
        finally:
            # Cleanup temp file
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
    
    except Exception as e:
        if document:
            document.processing_status = "failed"
            document.processing_error = str(e)
            db.commit()
        raise
    
    finally:
        db.close()

def reindex_dataset(dataset_id: str, tenant_id: str):
    """Reindex all documents in a dataset"""
    db = SessionLocal()
    
    try:
        # Get all documents in dataset
        documents = db.query(Document).filter(
            Document.dataset_id == dataset_id,
            Document.tenant_id == tenant_id
        ).all()
        
        total = len(documents)
        
        for i, doc in enumerate(documents):
            # Delete existing chunks
            db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
            db.commit()
            
            # Reprocess document
            process_document(str(doc.id), tenant_id)
            
            update_job_progress((i + 1) / total)
        
        return {
            "status": "completed",
            "documents_reindexed": total
        }
    
    finally:
        db.close()
