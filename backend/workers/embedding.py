import requests
from typing import List
from config import get_settings

settings = get_settings()

class EmbeddingService:
    """Generate embeddings using IONOS Model Hub"""
    
    def __init__(self):
        self.api_key = settings.IONOS_API_KEY
        self.base_url = settings.IONOS_BASE_URL
        self.model = settings.IONOS_EMBEDDING_MODEL
        self.dimensions = settings.EMBEDDING_DIMENSIONS
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts"""
        if not texts:
            return []
        
        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "input": texts
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            embeddings = [item['embedding'] for item in data['data']]
            
            return embeddings
        except Exception as e:
            raise Exception(f"Failed to generate embeddings: {str(e)}")
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        embeddings = self.generate_embeddings([text])
        return embeddings[0] if embeddings else []
    
    def batch_generate(self, texts: List[str], batch_size: int = 20) -> List[List[float]]:
        """Generate embeddings in batches"""
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            embeddings = self.generate_embeddings(batch)
            all_embeddings.extend(embeddings)
        
        return all_embeddings
