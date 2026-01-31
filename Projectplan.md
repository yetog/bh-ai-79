# Black Hole AI - Complete Project Documentation

## Executive Summary

**Black Hole AI** is a multi-tenant personal knowledge management system that transforms scattered digital content into actionable insights through AI-powered analysis. The system provides secure file ingestion, semantic search, and intelligent reflection capabilities with JSON-driven configuration and complete tenant isolation.

**Core Value Proposition:**  
Enterprise-grade RAG (Retrieval-Augmented Generation) platform that enables users to upload files, create datasets, and chat with their content using advanced AI—all while maintaining strict data security, isolation, and auditability.

---

## System Architecture Overview

### Technology Stack

- **Frontend:** Next.js 14 (React 18, TypeScript, Tailwind CSS, shadcn/ui)  
  Modern single-page application framework leveraging server-side rendering, built-in routing, and fast developer experience.

- **Backend:**  
  - **Option 1: FastAPI (Python 3.11+)**
      - Rapid prototyping, rich ecosystem for AI/data tooling, strong community support, great for integrating with machine learning services.
  - **Option 2: Go (Golang)**
      - High performance, strong concurrency support, efficient resource usage, and well-suited for scalable backend services.
  - **Decision:** The final backend language will be determined based on team expertise and project fit. Both options offer robust frameworks and security features.

- **Authentication:** JWT-based with support for magic email links (passwordless login).
- **Database:** PostgreSQL 15+ with pgvector for vector embeddings.
- **Object Storage:** IONOS Object Storage (S3-compatible).
- **Queue System:** Redis + RQ/Celery (Python) or Redis + Work/Go-Workers (Go), for async processing and orchestration.
- **AI Services:** IONOS Model Hub (LLAMA 3.1) for embeddings and chat completions.
- **Infrastructure:** IONOS Virtual Machines (containerized via Docker Compose; no Supabase dependency).

---

## Why Docker for Containerization?

- **Consistency:** Ensures the application runs identically across development, staging, and production environments by packaging code and dependencies together.
- **Isolation:** Each service (frontend, backend, database, workers) runs in its own container, avoiding conflicts and making troubleshooting easier.
- **Scalability:** Containers can be easily replicated and scaled horizontally to handle more load.
- **Easy Deployment:** Docker Compose and similar tools make it simple to spin up or tear down the entire stack with a single command.
- **Security:** Containers offer an extra layer of isolation from the host system, reducing the attack surface.

---

## Security, Stability, and Best Practices

- **Authentication:** All endpoints protected by JWT; passwordless magic link authentication for ease and security.
- **Multi-Tenancy:** Strict tenant isolation at the database and storage levels.
- **RBAC:** Role-based access control (admin, user, viewer) per tenant.
- **File Handling:** Files never stored in the database, only in S3-compatible object storage. Documents referenced by URI.
- **Input Validation:** Strict validation and sanitation on all API endpoints and file uploads.
- **Containerization:** All services run in Docker for isolation, repeatability, and CI/CD.
- **Monitoring:** Application metrics, audit logs, and alerting.
- **Encryption:** Data encrypted in transit and at rest; secrets never committed.
- **Compliance:** GDPR tools and audit logs for enterprise tenants.

---

## Core Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  magic_link_token TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE user_tenants (
  user_id UUID REFERENCES users(id),
  tenant_id TEXT REFERENCES tenants(id),
  role TEXT NOT NULL, -- admin, user, viewer
  PRIMARY KEY (user_id, tenant_id)
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
  source_uri TEXT, -- S3 URI, not file contents
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

---

## File Upload & Processing Flow

1. **Frontend:**  
   User uploads a file via UI (Next.js/React/TypeScript).
2. **Backend:**  
   Frontend requests a signed S3 upload URL from the backend.
3. **Direct Upload:**  
   Frontend uploads file directly to S3 bucket via signed URL.
4. **Ingestion:**  
   Backend receives metadata, records the upload, and triggers async processing (chunking, embedding).
5. **Processing:**  
   Worker jobs extract, chunk, embed, and index document in the database.

All file uploads are validated and sanitized. Large files are never passed through the API server.

---

## JSON-Driven Configuration

### Dataset Manifest Structure

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

### Chat Policy Configuration

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

---

## Current System State

- **Frontend:** Next.js 14 (React 18, TypeScript, Tailwind CSS, shadcn/ui)
- **Backend:** Prototype available in Node.js/Fastify (planned migration to FastAPI or Go)
- **Database:** PostgreSQL + pgvector
- **Storage:** IONOS S3-compatible Object Storage
- **Queue:** Redis + RQ/Celery (Python) or equivalent Go-based worker
- **AI Integration:** IONOS Model Hub

---

## Transformation Roadmap

### Phase 1: Core Architecture Upgrade

- Backend: Finalize choice (FastAPI or Go), implement core API endpoints and multi-tenancy.
- Database: Implement multi-tenancy, user/auth tables, JSONB columns, proper indexing.
- Authentication: JWT & magic link flows; tenant context middleware.
- API: Dataset CRUD, file upload with signed URLs, tenant-scoped S3 paths.

### Phase 2: Advanced RAG Features

- File processing: Multi-format (PDF, JSON, CSV, Markdown), semantic chunking, metadata extraction.
- Retrieval: Hybrid search (BM25 + vector), reranking, contextual filtering.
- Workers: Async ingestion, reindexing, insight generation.

### Phase 3: Advanced Frontend & UX

- Dataset creation wizard, manifest validation, drag-and-drop upload.
- JSON analysis, schema detection, metadata rule generator.
- Indexing dashboard, real-time processing, error reporting.
- Chat interface: Multi-dataset, citation system, conversation management.

### Phase 4: Production-Ready Features

- Multi-tenant auth (JWT, magic link), RBAC, invitation system.
- Tenant data isolation, encryption, audit logging, GDPR tools.
- Observability: Metrics, health checks, error tracking.

---

## Deployment & Infrastructure

### Docker Compose Example

```yaml
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
    command: ["python", "-m", "worker"] # or ["go", "run", "worker.go"]
    depends_on: [database, redis]

  database:
    image: postgres:15
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7
    volumes: [redis_data:/data]
```

### Security & Networking

- VPC with private subnets
- Load balancer with SSL termination
- Security groups for access control
- Automated backups to IONOS Object Storage

---

## Development Team Task Allocation

### Backend (FastAPI/Python or Go)

- DB schema, migration, multi-tenancy, pgvector
- API endpoints, authentication, RBAC
- AI integration, file ingestion, worker system

### Frontend (Next.js/React/TypeScript)

- Authentication UI, dataset management, file upload
- Chat interface, citation display, JSON manifest tools
- API client, real-time updates, error handling

### DevOps

- Dockerization, CI/CD, VM provisioning
- Monitoring, logging, alerting, backup/disaster recovery

---

## Success Metrics & Evaluation

**Technical:**  
- Response time: <2s/query  
- Throughput: 100+ concurrent users/server  
- Search accuracy: >85% relevance  
- Uptime: 99.5%

**UX:**  
- Onboarding: <5 min to first dataset  
- Search: Relevant info in top 3 results  
- Citations: 95%+ correct linkage

**Business:**  
- Engagement: DAU, queries/session  
- Data growth: Uploads/datasets per tenant  
- Feature adoption

---

## Risk Assessment & Mitigation

- **Vector Search:** Use hierarchical indexing, query optimization.
- **Service Dependencies:** Caching, fallback models, graceful degradation.
- **Data Isolation:** DB-level constraints, testing, audit logging.
- **User Adoption:** Templates, visual editors, guided setup.
- **Search Quality:** Continuous eval, feedback loops, model finetuning.

---

## Next Steps (Immediate Actions)

- Finalize backend language choice (FastAPI or Go) after team discussion.
- Implement JWT + magic link authentication.
- Update DB schema for users/auth/tenancy.
- Harden file upload (signed URLs, validation).
- Ensure Docker stability and CI/CD.
- Build out monitoring and observability.

---

This documentation provides a complete roadmap for transforming Black Hole AI into a secure, production-ready, multi-tenant knowledge platform—leveraging Next.js, FastAPI or Go, and IONOS infrastructure, with no external dependencies like Supabase.
