from redis import Redis
from rq import Queue
from config import get_settings

settings = get_settings()

# Redis connection
redis_conn = Redis.from_url(settings.REDIS_URL)

# Queues
ingest_queue = Queue('ingest', connection=redis_conn)
reindex_queue = Queue('reindex', connection=redis_conn)

def enqueue_ingest(document_id: str, tenant_id: str):
    """Queue a file ingestion job"""
    from workers.ingest import process_document
    job = ingest_queue.enqueue(
        process_document,
        document_id=document_id,
        tenant_id=tenant_id,
        job_timeout='30m',
        result_ttl=3600
    )
    return job.id

def enqueue_reindex(dataset_id: str, tenant_id: str):
    """Queue a dataset reindexing job"""
    from workers.ingest import reindex_dataset
    job = reindex_queue.enqueue(
        reindex_dataset,
        dataset_id=dataset_id,
        tenant_id=tenant_id,
        job_timeout='2h',
        result_ttl=3600
    )
    return job.id

def get_job_status(job_id: str):
    """Get job status from Redis"""
    from rq.job import Job
    try:
        job = Job.fetch(job_id, connection=redis_conn)
        return {
            'job_id': job_id,
            'status': job.get_status(),
            'progress': job.meta.get('progress', 0),
            'error': job.exc_info if job.is_failed else None,
            'result': job.result if job.is_finished else None
        }
    except Exception as e:
        return {
            'job_id': job_id,
            'status': 'not_found',
            'error': str(e)
        }
