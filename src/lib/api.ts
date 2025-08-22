// Simple API client for the Black Hole AI backend
// Reads base URL and optional API key from localStorage to avoid bundling secrets

import { Dataset, DatasetManifest } from '@/types/dataset';

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

// Dataset management
export async function getDatasets(params?: { status?: string; query?: string }): Promise<Dataset[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.query) searchParams.set('query', params.query);

  const res = await fetch(`${getApiBaseUrl()}/api/datasets?${searchParams}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Get datasets failed with ${res.status}`);
  }

  return res.json();
}

export async function createDataset(manifest: any): Promise<Dataset> {
  const res = await fetch(`${getApiBaseUrl()}/api/datasets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify(manifest),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Create dataset failed with ${res.status}`);
  }

  return res.json();
}

export async function updateDataset(datasetId: string, manifest: any): Promise<Dataset> {
  const res = await fetch(`${getApiBaseUrl()}/api/datasets/${datasetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify(manifest),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Update dataset failed with ${res.status}`);
  }

  return res.json();
}

export async function deleteDataset(datasetId: string): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/datasets/${datasetId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Delete dataset failed with ${res.status}`);
  }
}

export async function cloneDataset(datasetId: string): Promise<Dataset> {
  const res = await fetch(`${getApiBaseUrl()}/api/datasets/${datasetId}/clone`, {
    method: "POST",
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Clone dataset failed with ${res.status}`);
  }

  return res.json();
}

// Processing management
export async function reindexDataset(datasetId: string, mode?: 'full' | 'delta'): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/datasets/${datasetId}/reindex`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify({ mode: mode || 'full' }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Reindex failed with ${res.status}`);
  }
}

export async function getFileDetails(fileId: string): Promise<any> {
  const res = await fetch(`${getApiBaseUrl()}/api/files/${fileId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Get file details failed with ${res.status}`);
  }

  return res.json();
}

// Simple health check to verify connectivity and auth
export async function health(): Promise<{ ok: boolean }> {
  const res = await fetch(`${getApiBaseUrl()}/health`, {
    method: "GET",
    headers: { ...getHeaders() },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Health check failed with ${res.status}`);
  }
  return res.json();
}
