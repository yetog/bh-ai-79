// Simple API client for the Black Hole AI backend
// Reads base URL and optional API key from localStorage to avoid bundling secrets

export type UUID = string;

export interface IngestResponse {
  documentId: UUID;
  chunksInserted: number;
}

export interface RagCitation {
  documentId: UUID;
  source_uri: string;
  title: string;
  chunk_index: number;
  content: string;
  score: number;
  timestamp?: string;
}

export interface RagResponse {
  answer: string;
  citations: RagCitation[];
}

export const getApiBaseUrl = () =>
  localStorage.getItem("BLACKHOLE_API_BASE_URL") || "http://localhost:8000";

const getHeaders = () => {
  const headers: Record<string, string> = {};
  const apiKey = localStorage.getItem("BLACKHOLE_API_KEY");
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
};

export async function ingestFile(file: File): Promise<IngestResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${getApiBaseUrl()}/api/ingest`, {
    method: "POST",
    headers: getHeaders(),
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Ingest failed with ${res.status}`);
  }

  return res.json();
}

export async function queryRag(query: string, topK = 5): Promise<RagResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify({ query, topK }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Query failed with ${res.status}`);
  }

  return res.json();
}
