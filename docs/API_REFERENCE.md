# Black Hole AI - API Reference

Complete API documentation for the FastAPI backend.

## Base URL

```
Development: http://localhost:8000/api
Production: https://your-domain.com/api
```

## Authentication

All endpoints except `/auth/*` and `/health` require JWT authentication.

### Headers
```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "tenant_name": "My Organization"  // optional
}
```

**Response (201):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `400` - Email already registered
- `422` - Validation error (password < 8 chars)

---

### POST /auth/login

Authenticate and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401` - Invalid credentials

---

## Dataset Endpoints

### GET /datasets

List all datasets for current tenant.

**Query Parameters:**
- `skip` (int, default: 0) - Pagination offset
- `limit` (int, default: 100) - Max results

**Response (200):**
```json
[
  {
    "id": "quickstart-docs",
    "tenant_id": "tenant_abc123",
    "display_name": "Quickstart Documentation",
    "manifest": { ... },
    "created_at": "2025-01-20T10:30:00Z",
    "document_count": 15,
    "index_status": "completed"
  }
]
```

---

### POST /datasets

Create a new dataset with manifest.

**Request:**
```json
{
  "manifest": {
    "dataset_id": "my-dataset",
    "tenant_id": "tenant_abc123",
    "display_name": "My Dataset",
    "sources": [
      {"type": "upload", "path": "local:upload/", "tags": ["docs"]}
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
      "extract": ["h1", "h2", "filename", "page"]
    },
    "security": {
      "visibility": "private",
      "allow": [],
      "deny": []
    },
    "prompt": {
      "system": "You are a helpful assistant. Answer using provided context only.",
      "style": "concise",
      "max_context_chunks": 8
    },
    "version": 1
  }
}
```

**Response (201):**
```json
{
  "id": "my-dataset",
  "tenant_id": "tenant_abc123",
  "display_name": "My Dataset",
  "manifest": { ... },
  "created_at": "2025-01-25T12:00:00Z",
  "document_count": 0,
  "index_status": "pending"
}
```

---

### GET /datasets/{dataset_id}

Get a specific dataset.

**Response (200):** Same as single item from list.

**Errors:**
- `404` - Dataset not found

---

### PATCH /datasets/{dataset_id}

Update dataset manifest.

**Request:**
```json
{
  "manifest": {
    "display_name": "Updated Name",
    "preprocess": {
      "chunk_size": 1000
    }
  }
}
```

**Response (200):** Updated dataset object.

---

### DELETE /datasets/{dataset_id}

Delete a dataset and all associated documents/chunks.

**Response (200):**
```json
{
  "success": true,
  "deleted_documents": 15,
  "deleted_chunks": 234
}
```

---

## Upload Endpoints

### POST /uploads/sign

Get a presigned S3 URL for direct upload.

**Request:**
```json
{
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "size": 1048576
}
```

**Response (200):**
```json
{
  "upload_url": "https://s3.eu-central-1.ionoscloud.com/bucket/...",
  "key": "tenant_abc123/datasets/my-dataset/document.pdf",
  "expires_in": 3600
}
```

**Errors:**
- `413` - File too large (max 16MB)
- `415` - Unsupported file type

---

### POST /uploads/complete

Notify backend that upload is complete, trigger processing.

**Request:**
```json
{
  "key": "tenant_abc123/datasets/my-dataset/document.pdf",
  "filename": "document.pdf",
  "size": 1048576,
  "mimetype": "application/pdf",
  "checksum": "abc123...",
  "dataset_id": "my-dataset"
}
```

**Response (201):**
```json
{
  "document_id": "550e8400-e29b-41d4-a716-446655440000",
  "job_id": "rq:job:abc123"
}
```

---

## Query Endpoints

### POST /query

Execute a RAG query with vector search.

**Request:**
```json
{
  "query": "How do I configure authentication?",
  "dataset_ids": ["quickstart-docs"],  // optional, null = all datasets
  "top_k": 8
}
```

**Response (200):**
```json
{
  "answer": "To configure authentication, you need to...",
  "citations": [
    {
      "document_id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "auth-guide.pdf",
      "page": 3,
      "chunk_text": "Authentication is configured by setting...",
      "score": 0.92
    },
    {
      "document_id": "550e8400-e29b-41d4-a716-446655440001",
      "filename": "quickstart.md",
      "page": null,
      "chunk_text": "JWT tokens are used for API authentication...",
      "score": 0.87
    }
  ],
  "processing_time": 1.234
}
```

---

## Processing Endpoints

### GET /processing/{job_id}/status

Check the status of a processing job.

**Response (200):**
```json
{
  "job_id": "rq:job:abc123",
  "status": "processing",  // pending, processing, completed, failed
  "progress": 0.65,
  "error": null,
  "result": null
}
```

**Completed Response:**
```json
{
  "job_id": "rq:job:abc123",
  "status": "completed",
  "progress": 1.0,
  "error": null,
  "result": {
    "chunks_created": 45,
    "processing_time": 12.5
  }
}
```

---

### POST /datasets/{dataset_id}/reindex

Trigger reindexing of all documents in a dataset.

**Response (202):**
```json
{
  "job_id": "rq:job:reindex_abc123",
  "message": "Reindexing started for 15 documents"
}
```

---

## Stats Endpoints

### GET /stats

Get system-wide statistics for current tenant.

**Response (200):**
```json
{
  "total_files": 156,
  "total_chunks": 4523,
  "total_queries": 89,
  "processing_status": {
    "pending": 2,
    "processing": 1,
    "completed": 150,
    "failed": 3
  },
  "weekly_trends": {
    "files": [12, 15, 8, 23, 19, 14, 20],
    "queries": [5, 8, 12, 7, 15, 9, 11],
    "chunks": [120, 180, 95, 290, 210, 165, 240]
  }
}
```

---

### GET /metrics/processing

Get processing performance metrics.

**Response (200):**
```json
{
  "avg_processing_time": 8.5,
  "success_rate": 0.98,
  "error_rate": 0.02,
  "recent_activity": [
    {
      "hour": "2025-01-25T10:00:00Z",
      "uploads": 5,
      "queries": 12
    }
  ]
}
```

---

### GET /datasets/analytics

Get per-dataset analytics.

**Response (200):**
```json
[
  {
    "dataset_id": "quickstart-docs",
    "display_name": "Quickstart Documentation",
    "document_count": 15,
    "chunk_count": 234
  }
]
```

---

## Health Endpoints

### GET /health

Comprehensive health check.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "Black Hole AI",
  "timestamp": "2025-01-25T12:00:00Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

**Response (503):** Same structure with `"status": "unhealthy"`

---

### GET /ready

Quick readiness probe.

**Response (200):**
```json
{
  "status": "ready",
  "timestamp": "2025-01-25T12:00:00Z"
}
```

---

### GET /metrics

Prometheus-format metrics.

**Response (200):**
```
# HELP blackhole_documents_total Total number of documents
# TYPE blackhole_documents_total gauge
blackhole_documents_total 156

# HELP blackhole_chunks_total Total number of chunks
# TYPE blackhole_chunks_total gauge
blackhole_chunks_total 4523

# HELP blackhole_queries_total Total number of queries
# TYPE blackhole_queries_total gauge
blackhole_queries_total 89
```

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message here"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (async job started) |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (no access to resource) |
| 404 | Not Found |
| 413 | Payload Too Large |
| 415 | Unsupported Media Type |
| 422 | Validation Error |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Rate Limits

*Not currently implemented. Recommended for production:*

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 10/min |
| `/query` | 30/min |
| `/uploads/*` | 60/min |
| Other | 100/min |
