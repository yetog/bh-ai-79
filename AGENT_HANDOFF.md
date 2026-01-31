# Black Hole AI - Agent Handoff Documentation

## 🎯 Project Overview

**Black Hole AI** is a multi-tenant RAG (Retrieval-Augmented Generation) platform that enables users to:
1. Upload files (PDF, TXT, JSON, CSV, MD)
2. Index content with vector embeddings
3. Chat with their data using AI
4. Get cited, grounded answers

## 🏗️ Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite)                 │
│   TypeScript + Tailwind CSS + shadcn/ui components  │
│                  Port: 3000                          │
└─────────────────────────────────────────────────────┘
                       ↓ HTTP/REST
┌─────────────────────────────────────────────────────┐
│              Backend (FastAPI)                       │
│         Python + Pydantic + SQLAlchemy              │
│                  Port: 8000                          │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐                 │
│  │  API Server │  │ Worker Queue │                 │
│  │  (uvicorn)  │  │    (RQ)      │                 │
│  └─────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────┘
         ↓                    ↓
┌──────────────┐    ┌─────────────────┐
│  PostgreSQL  │    │  IONOS Services │
│  + pgvector  │    │  - S3 Storage   │
│  Port: 5432  │    │  - Model Hub    │
└──────────────┘    └─────────────────┘
         ↓
┌──────────────┐
│    Redis     │
│  Port: 6379  │
└──────────────┘
```

## 📁 Project Structure

```
blackhole-ai/
├── src/                          # Frontend (React/Vite)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── dataset/              # Dataset management UI
│   │   ├── processing/           # File processing UI
│   │   ├── search/               # Search interface
│   │   └── analytics/            # Analytics dashboard
│   ├── hooks/                    # Custom React hooks
│   ├── lib/
│   │   ├── api.ts               # API client (CRITICAL - defines contract)
│   │   ├── upload.ts            # Upload utilities
│   │   └── validation.ts        # Input validation
│   ├── pages/                   # Route pages
│   └── types/                   # TypeScript definitions
│
├── backend/                      # Backend (FastAPI)
│   ├── routers/
│   │   ├── auth.py              # JWT authentication
│   │   ├── datasets.py          # Dataset CRUD
│   │   ├── uploads.py           # S3 presigned URLs
│   │   ├── query.py             # RAG search endpoint
│   │   ├── processing.py        # Job status tracking
│   │   └── stats.py             # Analytics endpoints
│   ├── workers/
│   │   ├── ingest.py            # File ingestion
│   │   ├── chunking.py          # Text splitting
│   │   ├── embedding.py         # Vector generation
│   │   └── extractors.py        # File parsing
│   ├── utils/
│   │   └── caching.py           # Redis caching
│   ├── alembic/                 # Database migrations
│   ├── main.py                  # FastAPI app entry
│   ├── models.py                # SQLAlchemy models
│   ├── schemas.py               # Pydantic schemas
│   ├── config.py                # Settings management
│   ├── database.py              # DB connection
│   ├── auth.py                  # Auth utilities
│   └── queue.py                 # RQ job queue
│
├── docker-compose.yml           # Full stack orchestration
└── .github/workflows/deploy.yml # CI/CD pipeline
```

## 🔌 API Contract (src/lib/api.ts)

The frontend expects these exact endpoints:

### Authentication
```typescript
POST /api/auth/register  → { access_token, token_type }
POST /api/auth/login     → { access_token, token_type }
```

### Datasets
```typescript
GET    /api/datasets           → DatasetResponse[]
POST   /api/datasets           → DatasetResponse
GET    /api/datasets/{id}      → DatasetResponse
PATCH  /api/datasets/{id}      → DatasetResponse
DELETE /api/datasets/{id}      → { success: boolean }
```

### Uploads
```typescript
POST /api/uploads/sign     → { upload_url, key, expires_in }
POST /api/uploads/complete → { document_id, job_id }
```

### Query (RAG)
```typescript
POST /api/query → {
  answer: string,
  citations: Array<{
    document_id: string,
    filename: string,
    page?: number,
    chunk_text: string,
    score: number
  }>,
  processing_time: number
}
```

### Processing
```typescript
GET  /api/processing/{job_id}/status → { job_id, status, progress, error, result }
POST /api/datasets/{id}/reindex      → { job_id }
```

### Stats
```typescript
GET /api/stats              → SystemStats
GET /api/metrics/processing → ProcessingMetrics
GET /api/datasets/analytics → DatasetAnalytics[]
```

## 🗄️ Database Schema

### Tables (PostgreSQL + pgvector)

```sql
-- Multi-tenancy
tenants (id, name, created_at)
users (id, email, hashed_password, tenant_id, role, is_active, created_at)
user_tenants (user_id, tenant_id, role)  -- RBAC

-- Content
datasets (id, tenant_id, display_name, manifest JSONB, created_at)
documents (id, dataset_id, source_uri, filename, mime, size, meta JSONB, 
           processing_status, created_at, processed_at)
chunks (id, document_id, dataset_id, text, page, section, meta JSONB, 
        embedding vector(1536))  -- pgvector

-- Analytics
queries (id, tenant_id, user_id, query_text, dataset_ids, results_count,
         processing_time, created_at)
```

### Key Indexes
- `chunks.embedding` - IVFFlat for vector similarity
- `chunks.dataset_id` - Fast filtering by dataset
- `documents.processing_status` - Job queue queries

## ⚙️ Configuration

### Required Environment Variables (backend/.env)

```bash
# Security (REQUIRED)
SECRET_KEY=<generate-secure-random-key>

# Database (REQUIRED)
DATABASE_URL=postgresql://blackhole:blackhole@postgres:5432/blackhole

# Redis (REQUIRED)
REDIS_URL=redis://redis:6379/0

# IONOS S3 (REQUIRED for file uploads)
S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
S3_REGION=eu-central-1
S3_BUCKET=<your-bucket-name>
S3_ACCESS_KEY=<your-ionos-access-key>
S3_SECRET_KEY=<your-ionos-secret-key>

# IONOS Model Hub (REQUIRED for AI features)
IONOS_API_KEY=<your-ionos-api-key>
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_EMBEDDING_MODEL=text-embedding-3-small
IONOS_CHAT_MODEL=meta-llama/llama-3.1-8b-instruct
EMBEDDING_DIMENSIONS=1536
```

## 🚀 Development Commands

```bash
# Start full stack
docker-compose up -d

# Run migrations
docker-compose exec api alembic upgrade head

# Check logs
docker-compose logs -f api
docker-compose logs -f worker

# Frontend only (dev mode)
npm run dev

# Backend only (dev mode)
cd backend && uvicorn main:app --reload
```

## 📊 Current Status

### ✅ Completed (Phases 1-4)

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | FastAPI Foundation | ✅ Done |
| 1 | PostgreSQL + pgvector | ✅ Done |
| 1 | JWT Authentication | ✅ Done |
| 1 | Multi-tenancy | ✅ Done |
| 2 | S3 Presigned Uploads | ✅ Done |
| 2 | Worker Queue (RQ) | ✅ Done |
| 2 | File Processing Pipeline | ✅ Done |
| 3 | RAG Query Endpoint | ✅ Done |
| 3 | Vector Search | ✅ Done |
| 3 | Analytics/Stats | ✅ Done |
| 4 | Docker Production Build | ✅ Done |
| 4 | Health Checks | ✅ Done |
| 4 | Structured Logging | ✅ Done |
| 4 | CI/CD Pipeline | ✅ Done |

### ⏳ Pending (User Setup Required)

| Task | Owner | Notes |
|------|-------|-------|
| Create IONOS S3 bucket | User | Need bucket name for .env |
| Get IONOS Model Hub API key | User | Required for embeddings/chat |
| Deploy PostgreSQL | User | Or use Docker Compose |
| Configure production .env | User | Copy from .env.example |
| Set up domain + SSL | User | For production deployment |

### 🔧 Optional Enhancements

- [ ] Reranking with cross-encoder
- [ ] Hybrid search (BM25 + vector)
- [ ] SSE streaming for chat
- [ ] File preview generation
- [ ] User quota management
- [ ] Audit logging

## 🔐 Security Considerations

1. **Authentication**: JWT tokens with 7-day expiry
2. **Tenant Isolation**: All queries filter by tenant_id
3. **Input Validation**: Pydantic schemas validate all input
4. **SQL Injection**: SQLAlchemy ORM prevents injection
5. **File Upload**: Presigned URLs with size/type validation
6. **CORS**: Configured in main.py (restrict in production)

## 🐛 Known Issues / TODOs

1. **CORS**: Currently allows all origins - restrict for production
2. **Rate Limiting**: Not implemented - add for API protection
3. **File Size Limits**: Currently in schema, enforce in S3 policy
4. **Worker Retries**: Basic retry logic - enhance for production
5. **SSE Streaming**: Query endpoint returns full response, not streamed

## 📝 Key Files to Understand

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Frontend API contract - backend MUST match |
| `backend/schemas.py` | Pydantic models - data validation |
| `backend/models.py` | SQLAlchemy ORM - database schema |
| `backend/routers/query.py` | RAG implementation - core AI logic |
| `backend/workers/ingest.py` | File processing pipeline |
| `docker-compose.yml` | Full stack orchestration |

## 🔄 Typical User Flow

1. **Register/Login** → JWT token issued
2. **Create Dataset** → JSON manifest stored
3. **Upload Files** → S3 presigned URL → file uploaded
4. **Processing** → Worker extracts → chunks → embeds → stores vectors
5. **Query** → Embed query → vector search → LLM answer → citations returned
6. **Analytics** → View stats, processing metrics, dataset health

## 📞 External Dependencies

| Service | Purpose | Required |
|---------|---------|----------|
| IONOS S3 | File storage | Yes |
| IONOS Model Hub | Embeddings + LLM | Yes |
| PostgreSQL 16 | Database + pgvector | Yes |
| Redis 7 | Job queue | Yes |

## 🎯 Next Steps for Agent

1. **Verify Environment**: Ensure all .env variables are set
2. **Test Endpoints**: Use the health check first
3. **Run Migrations**: `alembic upgrade head`
4. **Test Upload Flow**: Sign URL → Upload → Check processing
5. **Test Query Flow**: Create chunks → Run query → Verify citations
6. **Monitor Logs**: Check structured JSON logs for issues

---

*Last Updated: January 2025*
*Documentation Version: 1.0*
