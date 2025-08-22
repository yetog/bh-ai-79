import { z } from 'zod';

export const DatasetSourceSchema = z.object({
  type: z.enum(['upload', 's3', 'url']),
  uri: z.string().optional(),
  path: z.string().optional(),
  tags: z.array(z.string()),
});

export const PreprocessConfigSchema = z.object({
  chunk_size: z.number().min(100).max(2000),
  chunk_overlap: z.number().min(0).max(500),
  splitter: z.enum(['recursive', 'semantic', 'character']),
  min_text_length: z.number().min(10).max(1000),
  remove_code_blocks: z.boolean(),
});

export const MetadataRulesSchema = z.object({
  infer_title: z.boolean(),
  extract: z.array(z.string()),
});

export const SecurityConfigSchema = z.object({
  visibility: z.enum(['private', 'shared', 'public']),
  allow: z.array(z.string()),
  deny: z.array(z.string()),
});

export const PromptConfigSchema = z.object({
  system: z.string().min(10).max(1000),
  style: z.enum(['concise', 'detailed', 'technical']),
  max_context_chunks: z.number().min(1).max(20),
});

export const DatasetManifestSchema = z.object({
  dataset_id: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  tenant_id: z.string().min(1).max(100),
  display_name: z.string().min(1).max(200),
  sources: z.array(DatasetSourceSchema),
  preprocess: PreprocessConfigSchema,
  metadata_rules: MetadataRulesSchema,
  security: SecurityConfigSchema,
  prompt: PromptConfigSchema,
  version: z.number().min(1),
});

export const RetrievalConfigSchema = z.object({
  k: z.number().min(1).max(50),
  rerank: z.object({
    enabled: z.boolean(),
    top_k: z.number().min(1).max(20),
  }),
  filters: z.object({
    dataset_id: z.array(z.string()),
  }),
});

export const AnswerConfigSchema = z.object({
  max_tokens: z.number().min(50).max(2000),
  grounding_required: z.boolean(),
  hallucination_guard: z.boolean(),
});

export const SafetyConfigSchema = z.object({
  deny_if_no_context: z.boolean(),
});

export const ChatPolicySchema = z.object({
  retrieval: RetrievalConfigSchema,
  answer: AnswerConfigSchema,
  safety: SafetyConfigSchema,
});

export const DatasetSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  display_name: z.string(),
  manifest: DatasetManifestSchema,
  created_at: z.string(),
  document_count: z.number().optional(),
  index_status: z.enum(['pending', 'processing', 'complete', 'error']).optional(),
});