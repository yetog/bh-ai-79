export interface DatasetSource {
  type: 'upload' | 's3' | 'url';
  uri?: string;
  path?: string;
  tags: string[];
}

export interface PreprocessConfig {
  chunk_size: number;
  chunk_overlap: number;
  splitter: 'recursive' | 'semantic' | 'character';
  min_text_length: number;
  remove_code_blocks: boolean;
}

export interface MetadataRules {
  infer_title: boolean;
  extract: string[];
}

export interface SecurityConfig {
  visibility: 'private' | 'shared' | 'public';
  allow: string[];
  deny: string[];
}

export interface PromptConfig {
  system: string;
  style: 'concise' | 'detailed' | 'technical';
  max_context_chunks: number;
}

export interface DatasetManifest {
  dataset_id: string;
  tenant_id: string;
  display_name: string;
  sources: DatasetSource[];
  preprocess: PreprocessConfig;
  metadata_rules: MetadataRules;
  security: SecurityConfig;
  prompt: PromptConfig;
  version: number;
}

export interface RetrievalConfig {
  k: number;
  rerank: {
    enabled: boolean;
    top_k: number;
  };
  filters: {
    dataset_id: string[];
  };
}

export interface AnswerConfig {
  max_tokens: number;
  grounding_required: boolean;
  hallucination_guard: boolean;
}

export interface SafetyConfig {
  deny_if_no_context: boolean;
}

export interface ChatPolicy {
  retrieval: RetrievalConfig;
  answer: AnswerConfig;
  safety: SafetyConfig;
}

export interface Dataset {
  id: string;
  tenant_id: string;
  display_name: string;
  manifest: DatasetManifest;
  created_at: string;
  document_count?: number;
  index_status?: 'pending' | 'processing' | 'complete' | 'error';
}