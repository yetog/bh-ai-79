# Black Hole AI Backend (IONOS Cloud, Node.js + LangChain.js)

This is a minimal backend skeleton you can deploy on IONOS Cloud. It exposes two endpoints:
- POST /api/ingest: Uploads a file, stores it in IONOS S3, chunks + embeds with IONOS Model Hub, and writes chunks to Postgres + pgvector.
- POST /api/query: Runs RAG (similarity search in pgvector + LLM generation) and returns answer + citations.

The code uses standard, OpenAI-compatible endpoints provided by IONOS Model Hub.

## Quick start

1) Provision infra
- Postgres 16 with pgvector extension
- IONOS S3 bucket (e.g., `blackhole-raw`)

2) Apply schema (psql)
```sql
-- Extensions (Postgres 16)
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  source_uri text, -- S3 URL or pointer
  mime_type text,
  bytes bigint,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Chunks
CREATE TABLE IF NOT EXISTS document_chunks (
  id bigserial PRIMARY KEY,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  tokens int,
  embedding vector(1536) -- adjust to your embedding model dimensions
);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

3) Configure environment
Create a `.env` file (do NOT commit) next to this README:
```
PORT=8000
API_KEY=supersecret

# Postgres
DATABASE_URL=postgresql://user:password@host:5432/blackhole

# IONOS S3 (S3-compatible)
S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
S3_REGION=eu-central-1
S3_BUCKET=blackhole-raw
S3_ACCESS_KEY_ID=... 
S3_SECRET_ACCESS_KEY=...

# IONOS Model Hub (OpenAI-compatible)
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_API_KEY=...  
IONOS_EMBEDDING_MODEL=text-embedding-3-small
IONOS_COMPLETION_MODEL=meta-llama/llama-3.1-8b-instruct
```

4) Install & run
```
cd backend
npm i
npm run dev
```

5) Test
- Ingest: curl -H "X-API-Key: supersecret" -F file=@/path/to/file.txt http://localhost:8000/api/ingest
- Query: curl -H "X-API-Key: supersecret" -H "Content-Type: application/json" -d '{"query":"What did we decide about the launch?","topK":5}' http://localhost:8000/api/query

## Notes
- The server is intentionally minimal. Add loaders for PDFs/CSV/mbox/markdown as needed.
- Keep secrets out of the frontend; the UI reads base URL and optional API key from localStorage for testing only.
- Adjust `vector(1536)` to match your embedding model dimensions.
