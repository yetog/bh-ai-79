# Black Hole AI - Database Schema Reference

## Overview

PostgreSQL 16 with pgvector extension for vector similarity search.

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐
│   tenants   │───┬───│    users     │
└─────────────┘   │   └──────────────┘
       │          │          │
       │          │          │
       │    ┌─────┴─────┐    │
       │    │user_tenants│    │
       │    └───────────┘    │
       │                     │
       ▼                     ▼
┌─────────────┐       ┌──────────────┐
│  datasets   │       │   queries    │
└─────────────┘       └──────────────┘
       │
       ▼
┌─────────────┐
│  documents  │
└─────────────┘
       │
       ▼
┌─────────────┐
│   chunks    │◄── pgvector embeddings
└─────────────┘
```

## Tables

### tenants

Multi-tenancy root table.

```sql
CREATE TABLE tenants (
    id VARCHAR PRIMARY KEY,           -- e.g., "tenant_abc123"
    name VARCHAR NOT NULL,            -- Display name
    created_at TIMESTAMP DEFAULT NOW()
);
```

### users

User accounts with authentication.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    tenant_id VARCHAR REFERENCES tenants(id),
    role VARCHAR DEFAULT 'user',      -- admin, user, viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

### user_tenants

Many-to-many for RBAC across tenants.

```sql
CREATE TABLE user_tenants (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR DEFAULT 'user',
    PRIMARY KEY (user_id, tenant_id)
);
```

### datasets

Dataset definitions with JSON manifests.

```sql
CREATE TABLE datasets (
    id VARCHAR PRIMARY KEY,           -- e.g., "quickstart-docs"
    tenant_id VARCHAR REFERENCES tenants(id),
    display_name VARCHAR NOT NULL,
    manifest JSONB NOT NULL,          -- Full dataset configuration
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_datasets_tenant ON datasets(tenant_id);
```

**Manifest JSONB Structure:**
```json
{
  "dataset_id": "quickstart-docs",
  "tenant_id": "tenant_abc123",
  "display_name": "Quickstart Docs",
  "sources": [...],
  "preprocess": {
    "chunk_size": 800,
    "chunk_overlap": 120,
    "splitter": "recursive",
    "min_text_length": 40,
    "remove_code_blocks": false
  },
  "metadata_rules": {...},
  "security": {...},
  "prompt": {...},
  "version": 1
}
```

### documents

File metadata (actual files stored in S3).

```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id VARCHAR REFERENCES datasets(id) ON DELETE CASCADE,
    source_uri VARCHAR NOT NULL,      -- S3 URI
    filename VARCHAR NOT NULL,
    mime VARCHAR,                     -- MIME type
    size INTEGER,                     -- File size in bytes
    meta JSONB DEFAULT '{}',          -- Extracted metadata
    processing_status VARCHAR DEFAULT 'pending',
    processing_error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX idx_documents_dataset ON documents(dataset_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
```

**Processing Status Values:**
- `pending` - Awaiting processing
- `processing` - Currently being processed
- `completed` - Successfully processed
- `failed` - Processing failed

### chunks

Text chunks with vector embeddings.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    dataset_id VARCHAR NOT NULL,      -- Denormalized for fast filtering
    text TEXT NOT NULL,               -- Chunk content
    page INTEGER,                     -- Source page number
    section VARCHAR,                  -- Section/heading
    meta JSONB DEFAULT '{}',          -- Additional metadata
    embedding vector(1536)            -- pgvector embedding
);

-- IVFFlat index for fast similarity search
CREATE INDEX idx_chunks_embedding ON chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_chunks_dataset ON chunks(dataset_id);
CREATE INDEX idx_chunks_document ON chunks(document_id);
```

**Embedding Dimensions:**
- Default: 1536 (OpenAI text-embedding-3-small compatible)
- Configurable via `EMBEDDING_DIMENSIONS` env var

### queries

Query logging for analytics.

```sql
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    query_text TEXT NOT NULL,
    dataset_ids JSONB,                -- Array of queried dataset IDs
    results_count INTEGER DEFAULT 0,
    processing_time FLOAT,            -- Seconds
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_queries_tenant ON queries(tenant_id);
CREATE INDEX idx_queries_created ON queries(created_at);
```

## Vector Search Queries

### Basic Similarity Search

```sql
SELECT 
    c.id,
    c.text,
    c.page,
    d.filename,
    c.embedding <=> $1::vector AS distance
FROM chunks c
JOIN documents d ON c.document_id = d.id
WHERE c.dataset_id = ANY($2)
ORDER BY c.embedding <=> $1::vector
LIMIT $3;
```

### With Score Threshold

```sql
SELECT *
FROM chunks
WHERE 
    dataset_id = ANY($1)
    AND (embedding <=> $2::vector) < 0.5  -- cosine distance threshold
ORDER BY embedding <=> $2::vector
LIMIT 10;
```

## Migrations

Located in `backend/alembic/versions/`:

| Migration | Description |
|-----------|-------------|
| `001_initial.py` | Base schema (tenants, users, datasets, documents, chunks) |
| `002_add_processing.py` | Add processing_status, processing_error to documents |
| `003_add_query_tracking.py` | Add queries table for analytics |

### Running Migrations

```bash
# Upgrade to latest
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# Downgrade one step
alembic downgrade -1

# Check current version
alembic current
```

## Performance Considerations

### Indexes

1. **IVFFlat for vectors**: Uses inverted file index for approximate nearest neighbor search
   - `lists = 100` is good for up to 1M vectors
   - Increase for larger datasets

2. **Composite indexes**: Consider for common query patterns:
   ```sql
   CREATE INDEX idx_chunks_dataset_embedding ON chunks(dataset_id, embedding);
   ```

### Query Optimization

1. **Filter before vector search**:
   ```sql
   -- Good: Filter first
   SELECT * FROM chunks 
   WHERE dataset_id = 'my-dataset'
   ORDER BY embedding <=> query_vector
   LIMIT 10;
   
   -- Bad: Sort all, then filter
   SELECT * FROM chunks 
   ORDER BY embedding <=> query_vector
   LIMIT 10
   WHERE dataset_id = 'my-dataset';
   ```

2. **Use EXPLAIN ANALYZE** to verify index usage

### Maintenance

```sql
-- Reindex vectors periodically
REINDEX INDEX idx_chunks_embedding;

-- Vacuum to reclaim space
VACUUM ANALYZE chunks;
```

## Backup Strategy

```bash
# Full backup
pg_dump -Fc blackhole > backup.dump

# Restore
pg_restore -d blackhole backup.dump

# Vector-specific backup (chunks table)
pg_dump -t chunks blackhole > chunks_backup.sql
```
