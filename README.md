# Black Hole AI - Complete Project Documentation

## Executive Summary

**Black Hole AI** is a multi-tenant personal knowledge management system that transforms scattered digital content into actionable insights through AI-powered analysis. The system provides secure file ingestion, semantic search, and intelligent reflection capabilities with JSON-driven configuration and complete tenant isolation.

**Core Value Proposition:** Enterprise-grade RAG (Retrieval-Augmented Generation) platform that allows users to upload files, create datasets, and chat with their content using advanced AI while maintaining complete data isolation.

## System Architecture Overview

### Technology Stack
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI (Python) with Pydantic validation
- **Database:** PostgreSQL + pgvector for vector embeddings
- **Storage:** IONOS Object Storage (S3-compatible)
- **AI Services:** IONOS Model Hub (LLAMA 3.1) for embeddings and chat completions
- **Queue System:** Redis + RQ/Celery for async processing
- **Infrastructure:** IONOS Virtual Machines (no Supabase dependency)

### Core Components

#### 1. Multi-Tenant Data Architecture
```sql
-- Core tenant isolation schema
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  display_name TEXT,
  manifest JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id TEXT REFERENCES datasets(id),
  source_uri TEXT,
  mime_type TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  dataset_id TEXT,
  tenant_id TEXT,
  page INTEGER,
  text TEXT,
  metadata JSONB,
  embedding vector(1024)
);
```

#### 2. JSON-Driven Configuration System

**Dataset Manifest Structure:**
```json
{
  "dataset_id": "company-docs",
  "tenant_id": "acme-corp",
  "display_name": "Company Documentation",
  "sources": [
    {"type": "upload", "path": "local:upload/handbook.pdf", "tags": ["manual"]},
    {"type": "s3", "uri": "s3://acme-datasets/docs/*.md", "tags": ["documentation"]}
  ],
  "preprocess": {
    "chunk_size": 800,
    "chunk_overlap": 120,
    "splitter": "recursive",
    "min_text_length": 40,
    "remove_code_blocks": false
  },
  "metadata_rules": {
    "infer_title": true,
    "extract": ["h1", "h2", "filename", "page", "section"]
  },
  "security": {
    "visibility": "private",
    "allow": ["user:uid_123"],
    "deny": []
  },
  "prompt": {
    "system": "You are a helpful assistant. Answer using provided context only; cite sources.",
    "style": "concise",
    "max_context_chunks": 8
  },
  "version": 1
}
```

**Chat Policy Configuration:**
```json
{
  "retrieval": {
    "k": 8,
    "rerank": {"enabled": true, "top_k": 4},
    "filters": {"dataset_id": ["company-docs"]}
  },
  "answer": {
    "max_tokens": 512,
    "grounding_required": true,
    "hallucination_guard": true
  },
  "safety": {"deny_if_no_context": true}
}
```

## Current System State

### Existing Implementation
- Basic file upload and ingestion (`/api/ingest`)
- Simple semantic search (`/api/query`)
- Frontend with React/TypeScript/Tailwind
- Backend with Node.js/Fastify + LangChain
- IONOS Model Hub integration configured
- PostgreSQL + pgvector operational
- IONOS S3 Object Storage connected

### IONOS Services Configuration
```bash
# Already configured credentials
IONOS_API_KEY=eyJ0eXAiOiJKV1QiLCJraWQi... # (truncated for security)
IONOS_CHAT_MODEL=meta-llama/llama-3.1-8b-instruct
IONOS_EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2

# API Endpoints
IONOS_CHAT_COMPLETION_URL=https://openai.inference.de-txl.ionos.com/v1/chat/completions
IONOS_EMBEDDINGS_URL=https://openai.inference.de-txl.ionos.com/v1/embeddings
```

## Transformation Roadmap: Simple RAG to Advanced Platform

### Phase 1: Core Architecture Upgrade (Week 1)

#### Backend Migration: Node.js → FastAPI
**Tasks:**
1. **Database Schema Evolution**
   - Implement multi-tenancy tables (tenants, datasets)
   - Add JSONB columns for dataset manifests
   - Create migration scripts from current schema
   - Add proper indexing for tenant isolation

2. **JSON Configuration System**
   - Create Pydantic models for DatasetManifest
   - Implement JSON validation and parsing
   - Build dataset.json upload functionality
   - Add configuration validation endpoints

3. **Multi-Tenant Foundation**
   - Implement JWT-based authentication
   - Add tenant context middleware
   - Create dataset CRUD operations
   - Implement tenant-scoped S3 paths: `s3://{tenant}/{dataset}/`

#### API Endpoints (FastAPI)
```python
# Authentication
POST /auth/login → JWT token
POST /auth/refresh → new JWT

# Dataset Management  
POST /datasets → create dataset from manifest
GET /datasets → list tenant datasets
GET /datasets/{id} → get specific dataset
POST /datasets/{id}/upload → upload files to dataset
POST /datasets/{id}/reindex → trigger reindexing

# Chat Interface
POST /chat → RAG chat with citations
GET /chat/{id}/history → conversation history

# Admin
GET /metrics → tenant usage statistics
GET /health → system health check
```

### Phase 2: Advanced RAG Features (Week 2)

#### Enhanced File Processing Pipeline
**Tasks:**
1. **Multi-Format Support**
   - PDF: Text extraction + OCR (Tesseract) for images
   - JSON: Flattening with dotted keys (`customer.orders[0].sku`)
   - CSV: Row-to-paragraph conversion with header preservation
   - Markdown: Heading-aware chunking

2. **Intelligent Chunking**
   - Configurable chunk size per dataset manifest
   - Semantic chunking for better context preservation
   - Metadata extraction (page numbers, sections, headings)

3. **Advanced Retrieval**
   - Hybrid search: BM25 + vector similarity
   - Reranking with cross-encoder models
   - Contextual filtering based on metadata

#### Worker Queue Implementation
```python
# Redis + RQ job definitions
def ingest_file(file_uri: str, dataset_id: str, tenant_id: str):
    """Async file processing: extract → chunk → embed → store"""
    
def reindex_dataset(dataset_id: str):
    """Rebuild entire dataset index from manifest"""
    
def generate_insights(dataset_id: str, timeframe: str):
    """Generate weekly/monthly reflection reports"""
```

### Phase 3: Advanced Frontend & UX (Week 3)

#### Dataset Management Interface
**Components:**
1. **Dataset Creation Wizard**
   - JSON manifest upload with validation
   - Visual schema editor for complex configurations
   - File drag-and-drop with progress tracking

2. **JSON Analysis Tools**
   - Interactive JSON tree viewer
   - Field selection for indexing
   - Automated schema detection
   - Metadata rule generator

3. **Indexing Dashboard**
   - Real-time processing status
   - Error reporting and retry options
   - Dataset health metrics

#### Enhanced Chat Interface
**Features:**
1. **Multi-Dataset Chat**
   - Dataset selector with filtering
   - Cross-dataset query capabilities
   - Source attribution per dataset

2. **Citation System**
   - Expandable citation cards
   - Document preview with highlighting
   - Page-level source tracking

3. **Conversation Management**
   - Chat history persistence
   - Conversation branching
   - Export capabilities

### Phase 4: Production Features (Week 4)

#### Authentication & Security
**Implementation:**
1. **Multi-Tenant Auth**
   - Email magic link authentication
   - JWT token management with refresh
   - Tenant invitation system
   - Role-based access control (admin, user, viewer)

2. **Data Security**
   - Tenant data isolation enforcement
   - Encrypted storage at rest
   - Audit logging for compliance
   - GDPR compliance tools

#### Observability & Analytics
**Monitoring Stack:**
1. **Application Metrics**
   - Query performance analytics
   - Token usage tracking
   - User engagement metrics
   - Dataset utilization statistics

2. **System Health**
   - Database performance monitoring
   - Queue health and backlog tracking
   - IONOS service integration status
   - Error rate and response time alerts

## IONOS Infrastructure Deployment

### Virtual Machine Configuration
**Production Environment:**
- **Application Server:** 4 vCPU, 8GB RAM, 200GB SSD
- **Database Server:** 4 vCPU, 8GB RAM, 500GB SSD
- **Worker Nodes:** 2 vCPU, 4GB RAM, 100GB SSD
- **Redis Cache:** 2 vCPU, 4GB RAM, 50GB SSD

### Deployment Architecture
```yaml
# docker-compose.yml structure
services:
  web:
    build: ./frontend
    ports: ["3000:3000"]
    
  api:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [database, redis]
    
  worker:
    build: ./backend
    command: ["python", "-m", "worker"]
    depends_on: [database, redis]
    
  database:
    image: postgres:15
    volumes: [postgres_data:/var/lib/postgresql/data]
    
  redis:
    image: redis:7
    volumes: [redis_data:/data]
```

### Security & Networking
- VPC setup with private subnets
- Load balancer with SSL termination
- Security groups for controlled access
- Backup automation to IONOS Object Storage

## Development Team Task Allocation

### Backend Development Tasks (Python/FastAPI)
**Primary Responsibilities:**
1. **Database & Schema Design**
   - Multi-tenant PostgreSQL schema implementation
   - pgvector integration and optimization
   - Migration scripts and version management

2. **API Development**
   - FastAPI application structure
   - Authentication and authorization middleware
   - Dataset management endpoints
   - File processing and ingestion pipeline

3. **AI Integration**
   - IONOS Model Hub integration
   - Embedding pipeline optimization
   - RAG query orchestration
   - Chat completion handling

4. **Worker System**
   - Redis queue setup and management
   - Async job processing (ingestion, reindexing)
   - Error handling and retry logic
   - Progress tracking and notifications

### Frontend Development Tasks (Next.js/React)
**Primary Responsibilities:**
1. **User Interface Components**
   - Dataset management interface
   - File upload with drag-and-drop
   - Chat interface with streaming responses
   - Citation and source display

2. **JSON Configuration Tools**
   - Dataset manifest editor
   - JSON schema validation
   - Visual configuration builder
   - Template management

3. **User Experience**
   - Authentication flows
   - Real-time status updates
   - Error handling and user feedback
   - Responsive design implementation

4. **Integration**
   - API client implementation
   - WebSocket/SSE for real-time updates
   - State management (React Context/Zustand)
   - Form handling and validation

### DevOps & Infrastructure Tasks
**Shared Responsibilities:**
1. **IONOS Deployment**
   - Virtual machine provisioning
   - Docker containerization
   - CI/CD pipeline setup
   - SSL certificate management

2. **Monitoring & Observability**
   - Logging infrastructure
   - Performance monitoring
   - Alert configuration
   - Backup and disaster recovery

## Success Metrics & Evaluation

### Technical Performance
- **Response Time:** <2 seconds for search queries
- **Throughput:** 100+ concurrent users per server
- **Accuracy:** >85% search relevance based on user feedback
- **Availability:** 99.5% uptime target

### User Experience
- **Onboarding:** Users can create first dataset in <5 minutes
- **Search Quality:** Users find relevant information in first 3 results
- **Citation Accuracy:** 95% of citations link to correct source passages

### Business Metrics
- **User Engagement:** Daily active users, queries per session
- **Data Growth:** Files uploaded, datasets created per tenant
- **Feature Adoption:** Advanced features usage rates

## Risk Assessment & Mitigation

### Technical Risks
1. **Vector Search Performance**
   - Risk: Large datasets may slow down similarity search
   - Mitigation: Implement hierarchical indexing, query optimization

2. **IONOS Service Dependencies**
   - Risk: Model Hub API rate limits or outages
   - Mitigation: Implement caching, fallback models, graceful degradation

3. **Multi-Tenant Data Isolation**
   - Risk: Accidental data leakage between tenants
   - Mitigation: Database-level constraints, comprehensive testing, audit logging

### Product Risks
1. **User Adoption Complexity**
   - Risk: JSON configuration too complex for average users
   - Mitigation: Template system, visual editors, guided setup

2. **Search Result Quality**
   - Risk: Users don't find relevant information
   - Mitigation: Continuous evaluation, feedback loops, model fine-tuning

## Next Steps for Implementation

### Immediate Actions (Week 1)
1. **Backend Setup**
   - Create FastAPI project structure
   - Implement basic authentication system
   - Set up multi-tenant database schema

2. **Frontend Preparation**
   - Create Next.js project with shadcn/ui
   - Implement authentication UI
   - Build dataset upload interface

3. **Infrastructure**
   - Provision IONOS virtual machines
   - Configure Docker development environment
   - Set up CI/CD pipeline basics

### Development Priorities
1. **Core Functionality First:** Basic upload, processing, and search
2. **Progressive Enhancement:** Add advanced features incrementally  
3. **Tenant Isolation:** Ensure complete data separation from start
4. **Performance Optimization:** Focus on scalability from foundation

This documentation provides a complete roadmap for transforming the current basic RAG system into a production-ready, multi-tenant knowledge management platform using IONOS infrastructure without external dependencies like Supabase.
