# CLAUDE.md - BH AI 79 (Black Hole AI)

## Current Deployment Status (Updated 2026-04-11)

### All Services Running
| Service | Status | Port | Container |
|---------|--------|------|-----------|
| Frontend (React) | ✅ UP | 3015 | bh-ai-79 |
| FastAPI Backend | ✅ UP | 8001 | bh-ai-api |
| PostgreSQL + pgvector | ✅ UP | 5433 | bh-ai-postgres |
| Redis | ✅ UP | 6380 | bh-ai-redis |
| RQ Worker | ✅ UP | - | bh-ai-worker |

### Public URLs
- **Frontend:** https://zaylegend.com/bh-ai/
- **API:** https://zaylegend.com/bh-ai/api/
- **Health Check:** https://zaylegend.com/bh-ai/api/health
- **API Docs:** https://zaylegend.com/bh-ai/api/api/v1/docs

---

## Infrastructure Details

### Server Info
- **Host:** zaylegend.com (66.179.240.58)
- **Source:** `/var/www/zaylegend/apps/testing/bh-ai-79/`

### Credentials
- **IONOS S3:** Configured in `backend/.env`
- **IONOS API Token:** Valid, includes AI Model Hub access
- **Database:** blackhole/blackhole@postgres:5432/blackhole

### Docker Commands
```bash
cd /var/www/zaylegend/apps/testing/bh-ai-79

# Check status
docker ps --filter "name=bh-ai"

# View logs
docker logs bh-ai-api
docker logs bh-ai-worker

# Restart services
docker-compose restart

# Rebuild after code changes
docker-compose up -d --build api worker
```

---

## Answers to Agent Questions (From Previous Session)

### Q1: Is the backend running?
**Answer:** YES - fully deployed. All services (API, Worker, Postgres, Redis) are running.

### Q2: RAG or fine-tuning?
**Recommendation:** Start with RAG (Phase 1-2). The infrastructure is now ready to receive data.

### Q3: Existing 7 personas or new ones?
**Answer:** Use the existing personas from the chat data's `priming` field.

---

## What's Ready for Your Work

The platform is now fully operational. You can proceed with:

### Phase 1 - Chat Migration Pipeline (Ready to Implement)
1. **Build Dexie extractor** in `backend/workers/extractors.py`
   - Parse `data.data[].data[]` from JSON exports
   - Reconstruct conversations as role:content turn pairs

2. **Add conversation-aware chunking**
   - Chunk by dialogue turns (user+assistant pair = 1 chunk)
   - Preserve metadata (chatId, priming, model, timestamp)

3. **Create migration script**
   - Batch import 49 JSON files as datasets

### API Endpoints Available
- `POST /api/v1/datasets` - Create dataset
- `POST /api/v1/uploads` - Upload files
- `POST /api/v1/query` - Search/query
- `GET /api/v1/datasets/{id}` - Get dataset
- See full docs at `/bh-ai/api/api/v1/docs`

---

## Code Fixes Applied (2026-04-11)

1. **Renamed `queue.py` → `redis_queue.py`** - Avoided Python stdlib conflict
2. **Fixed `metadata` column** - Renamed to `doc_metadata` (SQLAlchemy reserved)
3. **Added email-validator** - Required by Pydantic
4. **Fixed health check SQL** - Wrapped in `text()`
5. **Fixed Redis URL** - Use container name `redis://redis:6379/0`

---

## Tech Stack
- **Frontend:** React 18 + Vite + shadcn/ui + TailwindCSS
- **Backend:** FastAPI + PostgreSQL + pgvector + Redis/RQ
- **LLM:** IONOS Model Hub (LLaMA 3.1 + text-embedding-3-small)
- **Storage:** IONOS S3 for file uploads

---

## Data Location Note
The training data (49 Dexie JSON exports, 156K CSV rows) needs to be uploaded to the platform. It's not on this server - it's in your local workspace.
