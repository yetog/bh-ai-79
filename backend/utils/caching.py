"""
Simple caching utilities using Redis
"""
from typing import Optional, Any
import json
import redis
from config import get_settings

settings = get_settings()
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class StatsCache:
    """Cache for expensive stats queries"""
    
    STATS_TTL = 60  # 1 minute
    METRICS_TTL = 300  # 5 minutes
    
    @staticmethod
    def get_stats(tenant_id: str) -> Optional[dict]:
        """Get cached stats for a tenant"""
        key = f"stats:{tenant_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    
    @staticmethod
    def set_stats(tenant_id: str, data: dict):
        """Cache stats for a tenant"""
        key = f"stats:{tenant_id}"
        redis_client.setex(key, StatsCache.STATS_TTL, json.dumps(data))
    
    @staticmethod
    def get_metrics(tenant_id: str) -> Optional[dict]:
        """Get cached processing metrics"""
        key = f"metrics:{tenant_id}"
        data = redis_client.get(key)
        return json.loads(data) if data else None
    
    @staticmethod
    def set_metrics(tenant_id: str, data: dict):
        """Cache processing metrics"""
        key = f"metrics:{tenant_id}"
        redis_client.setex(key, StatsCache.METRICS_TTL, json.dumps(data))
    
    @staticmethod
    def invalidate_tenant(tenant_id: str):
        """Invalidate all cache for a tenant"""
        keys = [f"stats:{tenant_id}", f"metrics:{tenant_id}"]
        for key in keys:
            redis_client.delete(key)
