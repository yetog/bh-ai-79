# Black Hole AI - FastAPI Backend

Production-ready FastAPI backend for Black Hole AI with multi-tenant RAG capabilities.

## Quick Start

1. **Copy environment file:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

2. **Run with Docker Compose:**
```bash
docker-compose up -d
```

3. **Run migrations:**
```bash
docker-compose exec api alembic upgrade head
```

4. **Test the API:**
```bash
curl http://localhost:8000/health
```

## Architecture

- **FastAPI** - Modern async Python web framework
- **PostgreSQL + pgvector** - Database with vector search
- **Redis + RQ** - Job queue for async processing
- **SQLAlchemy** - ORM with Alembic migrations
- **Pydantic** - Data validation and settings
- **JWT** - Authentication with role-based access control

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login with credentials

### Datasets
- `POST /api/datasets` - Create dataset
- `GET /api/datasets` - List datasets
- `GET /api/datasets/{id}` - Get dataset
- `PATCH /api/datasets/{id}` - Update dataset
- `DELETE /api/datasets/{id}` - Delete dataset

### Uploads
- `POST /api/uploads/sign` - Get presigned S3 URL
- `POST /api/uploads/complete` - Notify upload complete

### Query
- `POST /api/query` - RAG query with citations

### Processing
- `GET /api/processing/{job_id}/status` - Check job status
- `POST /api/datasets/{id}/reindex` - Trigger reindex

### Stats
- `GET /api/stats` - System statistics
- `GET /api/metrics/processing` - Processing metrics

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn main:app --reload

# Create migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head
```

## Security

- JWT-based authentication
- Tenant isolation at DB level
- Role-based access control (admin, user, viewer)
- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- S3 presigned URLs for direct uploads

## Next Steps

- [ ] Implement worker jobs (file ingestion, chunking, embedding)
- [ ] Integrate IONOS Model Hub for embeddings and completions
- [ ] Add SSE for real-time processing updates
- [ ] Implement reranking and hybrid search
- [ ] Add monitoring and observability
