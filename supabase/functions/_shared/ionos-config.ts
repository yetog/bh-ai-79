export const IONOS_CONFIG = {
  API_KEY: Deno.env.get('IONOS_API_KEY') || '',
  CHAT_MODEL: 'meta-llama/llama-3.1-8b-instruct',
  EMBEDDING_MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
  CHAT_COMPLETION_URL: 'https://openai.inference.de-txl.ionos.com/v1/chat/completions',
  EMBEDDINGS_URL: 'https://openai.inference.de-txl.ionos.com/v1/embeddings',
  MODELS_URL: 'https://openai.inference.de-txl.ionos.com/v1/models'
};

export const IONOS_HEADERS = {
  'Authorization': `Bearer ${IONOS_CONFIG.API_KEY}`,
  'Content-Type': 'application/json'
};