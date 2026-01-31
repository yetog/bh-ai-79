from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # API
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "Black Hole AI"
    DEBUG: bool = False
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # S3 (IONOS Object Storage)
    S3_ENDPOINT: str
    S3_REGION: str = "eu-central-1"
    S3_BUCKET: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    
    # IONOS Model Hub
    IONOS_API_KEY: str
    IONOS_BASE_URL: str = "https://openai.inference.de-txl.ionos.com/v1"
    IONOS_EMBEDDING_MODEL: str = "text-embedding-3-small"
    IONOS_CHAT_MODEL: str = "meta-llama/llama-3.1-8b-instruct"
    EMBEDDING_DIMENSIONS: int = 1536
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
