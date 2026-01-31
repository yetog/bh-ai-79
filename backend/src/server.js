import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pkg from 'pg';
const { Pool } = pkg;
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

// Config
const PORT = Number(process.env.PORT || 8000);
const API_KEY = process.env.API_KEY || '';
const IONOS_BASE_URL = process.env.IONOS_BASE_URL || 'https://openai.inference.de-txl.ionos.com/v1';
const IONOS_API_KEY = process.env.IONOS_API_KEY || '';
const IONOS_EMBEDDING_MODEL = process.env.IONOS_EMBEDDING_MODEL || 'text-embedding-3-small';
const IONOS_COMPLETION_MODEL = process.env.IONOS_COMPLETION_MODEL || 'meta-llama/llama-3.1-8b-instruct';

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION;
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID || '',
    secretAccessKey: S3_SECRET_ACCESS_KEY || '',
  },
});

const app = Fastify({ logger: true });
await app.register(multipart);
await app.register(cors, { origin: true });

// Simple API key guard
app.addHook('preHandler', async (req, reply) => {
  if (!API_KEY) return; // disabled if not set
  const k = req.headers['x-api-key'];
  if (k !== API_KEY) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Simple chunker (fallback)
function chunkText(text, chunkSize = 1200, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const slice = text.slice(i, end);
    chunks.push(slice);
    if (end === text.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}

// LangChain splitter (preferred)
async function splitTextLC(text) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1200, chunkOverlap: 200 });
  const docs = await splitter.createDocuments([text]);
  return docs.map(d => d.pageContent);
}

async function embed(text) {
  const res = await fetch(`${IONOS_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${IONOS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: IONOS_EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Embeddings error: ${msg}`);
  }
  const data = await res.json();
  return data.data[0].embedding; // number[]
}

async function complete(prompt) {
  const res = await fetch(`${IONOS_BASE_URL}/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${IONOS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: IONOS_COMPLETION_MODEL,
      prompt,
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Completion error: ${msg}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.text || '';
}

app.get('/health', async () => ({ ok: true }));

app.post('/api/ingest', async (req, reply) => {
  const mp = await req.file();
  if (!mp) return reply.code(400).send({ error: 'file is required' });

  const fileBuffer = await mp.toBuffer();
  const key = `${Date.now()}-${mp.filename}`;

  // Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: mp.mimetype,
  }));
  const source_uri = `${S3_ENDPOINT?.replace('https://', 'https://')}/${S3_BUCKET}/${key}`;

  // Insert document
  const docRes = await pool.query(
    'INSERT INTO documents (title, source_uri, mime_type, bytes, metadata) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [mp.filename, source_uri, mp.mimetype, fileBuffer.length, JSON.stringify({})]
  );
  const documentId = docRes.rows[0].id;

  // Naive text extraction (extend with proper loaders for PDFs, etc.)
  let text = '';
  try {
    text = fileBuffer.toString('utf-8');
  } catch {
    text = '';
  }
  if (!text.trim()) {
    return reply.send({ documentId, chunksInserted: 0 });
  }

  const chunks = await splitTextLC(text);
  let idx = 0;
  for (const chunk of chunks) {
    const embedding = await embed(chunk);
    const vector = `[${embedding.join(',')}]`;
    await pool.query(
      'INSERT INTO document_chunks (document_id, chunk_index, content, tokens, embedding) VALUES ($1,$2,$3,$4,$5::vector)',
      [documentId, idx, chunk, null, vector]
    );
    idx += 1;
  }

  return reply.send({ documentId, chunksInserted: chunks.length });
});

app.post('/api/query', async (req, reply) => {
  const body = req.body || {};
  const query = body.query?.toString?.() || '';
  const topK = Number(body.topK || 5);
  if (!query) return reply.code(400).send({ error: 'query is required' });

  const qEmbedding = await embed(query);
  const qVector = `[${qEmbedding.join(',')}]`;

  const { rows } = await pool.query(
    `SELECT dc.document_id, d.title, d.source_uri, dc.chunk_index, dc.content,
            (dc.embedding <=> $1::vector) AS score
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $2`,
    [qVector, topK]
  );

  const context = rows.map(r => `Source: ${r.title} (${r.source_uri})\nChunk #${r.chunk_index}:\n${r.content}`).join('\n\n');
  const prompt = `You are an assistant that answers using the provided context. Cite sources inline as [title](url).\n\nContext:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;
  const answer = await complete(prompt);

  const citations = rows.map(r => ({
    documentId: r.document_id,
    source_uri: r.source_uri,
    title: r.title,
    chunk_index: r.chunk_index,
    content: r.content,
    score: Number(r.score),
  }));

  return reply.send({ answer, citations });
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`API listening on :${PORT}`);
});
