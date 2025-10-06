from sqlalchemy import Column, String, Text, Integer, BigInteger, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
import uuid
import enum
from database import Base

class AppRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text)
    magic_link_token = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String(100), primary_key=True)
    name = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserTenant(Base):
    __tablename__ = "user_tenants"
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    tenant_id = Column(String(100), ForeignKey("tenants.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserRole(Base):
    __tablename__ = "user_roles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(String(100), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    role = Column(SQLEnum(AppRole), nullable=False)
    
    __table_args__ = (UniqueConstraint('user_id', 'tenant_id', 'role', name='_user_tenant_role_uc'),)

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String(100), primary_key=True)
    tenant_id = Column(String(100), ForeignKey("tenants.id"), nullable=False, index=True)
    display_name = Column(Text)
    manifest = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dataset_id = Column(String(100), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(String(100), ForeignKey("tenants.id"), nullable=False, index=True)
    source_uri = Column(Text)
    filename = Column(Text)
    mime_type = Column(String(255))
    size_bytes = Column(BigInteger)
    checksum = Column(String(64))
    metadata = Column(JSONB)
    processing_status = Column(String(50), default="pending")
    processing_error = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Chunk(Base):
    __tablename__ = "chunks"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_id = Column(String(100), ForeignKey("datasets.id"), nullable=False, index=True)
    tenant_id = Column(String(100), ForeignKey("tenants.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    page = Column(Integer)
    text = Column(Text, nullable=False)
    tokens = Column(Integer)
    metadata = Column(JSONB)
    embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
