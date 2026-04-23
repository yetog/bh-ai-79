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

export const getHeaders = () => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem("BLACKHOLE_TOKEN");
  if (token) headers["Authorization"] = `Bearer ${token}`;
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

// Analytics and stats
export async function getSystemStats(): Promise<any> {
  const res = await fetch(`${getApiBaseUrl()}/api/stats`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Get stats failed with ${res.status}`);
  }

  return res.json();
}

export async function getProcessingMetrics(): Promise<any> {
  const res = await fetch(`${getApiBaseUrl()}/api/metrics/processing`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Get metrics failed with ${res.status}`);
  }

  return res.json();
}

// Upload endpoints
export const requestSignedUrl = async (filename: string, contentType: string, size: number) => {
  const response = await fetch(`${getApiBaseUrl()}/uploads/sign`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ filename, contentType, size }),
  });

  if (!response.ok) {
    throw new Error('Failed to get signed URL');
  }

  return response.json();
};

export const notifyUploadComplete = async (data: {
  key: string;
  filename: string;
  size: number;
  mimetype: string;
  checksum: string;
}) => {
  const response = await fetch(`${getApiBaseUrl()}/uploads/complete`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to complete upload');
  }

  return response.json();
};

export const getProcessingStatus = async (jobId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/processing/${jobId}/status`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get processing status');
  }

  return response.json();
};

// Agent Chat
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentCitation {
  document_id: string;
  filename: string;
  page: number;
  chunk_text: string;
  score: number;
}

export interface AgentChatResponse {
  answer: string;
  citations: AgentCitation[];
  processing_time: number;
}

export async function agentChat(
  persona: string,
  message: string,
  conversationHistory: ConversationTurn[]
): Promise<AgentChatResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/agents/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify({
      persona,
      message,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `Agent chat failed with ${res.status}`);
  }
  return res.json();
}

// Auth
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Login failed');
  }
  return res.json();
}

export async function register(email: string, password: string, tenantName?: string): Promise<AuthResponse> {
  const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenant_name: tenantName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'Registration failed');
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
