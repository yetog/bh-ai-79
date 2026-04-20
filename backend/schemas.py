from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

# Auth Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    tenant_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: UUID
    email: str
    tenant_id: str
    role: str

# Dataset Schemas
class DatasetSource(BaseModel):
    type: str = Field(pattern="^(upload|s3|url)$")
    uri: Optional[str] = None
    path: Optional[str] = None
    tags: List[str] = []

class PreprocessConfig(BaseModel):
    chunk_size: int = Field(ge=100, le=2000, default=800)
    chunk_overlap: int = Field(ge=0, le=500, default=120)
    splitter: str = Field(pattern="^(recursive|semantic|character)$", default="recursive")
    min_text_length: int = Field(ge=10, le=1000, default=40)
    remove_code_blocks: bool = False

class MetadataRules(BaseModel):
    infer_title: bool = True
    extract: List[str] = ["h1", "h2", "filename", "page"]

class SecurityConfig(BaseModel):
    visibility: str = Field(pattern="^(private|shared|public)$", default="private")
    allow: List[str] = []
    deny: List[str] = []

class PromptConfig(BaseModel):
    system: str = Field(min_length=10, max_length=2000)
    style: str = Field(pattern="^(concise|detailed|technical)$", default="concise")
    max_context_chunks: int = Field(ge=1, le=20, default=8)

class DatasetManifest(BaseModel):
    dataset_id: str = Field(pattern="^[a-z0-9-]+$", min_length=1, max_length=100)
    tenant_id: str
    display_name: str = Field(min_length=1, max_length=200)
    sources: List[DatasetSource]
    preprocess: PreprocessConfig
    metadata_rules: MetadataRules
    security: SecurityConfig
    prompt: PromptConfig
    version: int = 1

class DatasetCreate(BaseModel):
    manifest: DatasetManifest

class DatasetResponse(BaseModel):
    id: str
    tenant_id: str
    display_name: str
    manifest: Dict[str, Any]
    created_at: datetime
    document_count: Optional[int] = 0
    index_status: Optional[str] = "pending"

    class Config:
        from_attributes = True

# Upload Schemas
class SignedUrlRequest(BaseModel):
    filename: str
    content_type: str
    size: int = Field(gt=0)

class SignedUrlResponse(BaseModel):
    upload_url: str
    key: str
    expires_in: int = 3600

class UploadCompleteRequest(BaseModel):
    key: str
    filename: str
    size: int
    mimetype: str
    checksum: str
    dataset_id: Optional[str] = None

class UploadCompleteResponse(BaseModel):
    document_id: UUID
    job_id: str

# Query Schemas
class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    dataset_ids: Optional[List[str]] = None
    top_k: int = Field(default=8, ge=1, le=50)

class Citation(BaseModel):
    document_id: UUID
    filename: str
    page: Optional[int] = None
    chunk_text: str
    score: float

class QueryResponse(BaseModel):
    answer: str
    citations: List[Citation]
    processing_time: float

# Processing Schemas
class ProcessingStatus(BaseModel):
    job_id: str
    status: str
    progress: Optional[float] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

# Agent Chat Schemas
class ConversationTurn(BaseModel):
    role: str
    content: str

class AgentChatRequest(BaseModel):
    persona: str = Field(pattern="^[a-z-]+$")
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: List[ConversationTurn] = Field(default_factory=list)

class AgentChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    processing_time: float
