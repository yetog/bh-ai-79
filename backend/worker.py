#!/usr/bin/env python
"""
RQ Worker entry point
Usage: python worker.py
"""
from redis import Redis
from rq import Worker
from config import get_settings

settings = get_settings()

# Redis connection
redis_conn = Redis.from_url(settings.REDIS_URL)

if __name__ == '__main__':
    # Start worker
    worker = Worker(['ingest', 'reindex'], connection=redis_conn)
    print("🚀 Worker started. Listening on queues: ingest, reindex")
    worker.work()
