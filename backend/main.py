from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
import time
import logging
import json
from datetime import datetime
from config import get_settings
from database import engine, Base
from routers import auth, datasets, uploads, query, processing, stats

settings = get_settings()

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(message)s',
    handlers=[logging.StreamHandler()]
)

class StructuredLogger(logging.Logger):
    def _log(self, level, msg, args, exc_info=None, extra=None, stack_info=False):
        if isinstance(msg, dict):
            msg = json.dumps(msg)
        super()._log(level, msg, args, exc_info, extra, stack_info)

logging.setLoggerClass(StructuredLogger)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    logger.info({
        "event": "request_started",
        "method": request.method,
        "path": request.url.path,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    try:
        response = await call_next(request)
        duration = time.time() - start_time
        
        logger.info({
            "event": "request_completed",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "timestamp": datetime.utcnow().isoformat()
        })
        
        return response
    except Exception as e:
        duration = time.time() - start_time
        logger.error({
            "event": "request_failed",
            "method": request.method,
            "path": request.url.path,
            "error": str(e),
            "duration_ms": round(duration * 1000, 2),
            "timestamp": datetime.utcnow().isoformat()
        })
        raise

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced health check with dependencies
@app.get("/health")
async def health_check():
    from database import SessionLocal
    import redis
    
    health_status = {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }
    
    # Check database
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check Redis
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    status_code = 200 if health_status["status"] == "healthy" else 503
    return JSONResponse(content=health_status, status_code=status_code)

# Readiness probe
@app.get("/ready")
async def readiness_check():
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}

# Prometheus metrics
@app.get("/metrics")
async def metrics():
    from database import SessionLocal
    from models import Document, Chunk, Query
    
    db = SessionLocal()
    try:
        total_documents = db.query(Document).count()
        total_chunks = db.query(Chunk).count()
        total_queries = db.query(Query).count()
        
        metrics_text = f"""# HELP blackhole_documents_total Total number of documents
# TYPE blackhole_documents_total gauge
blackhole_documents_total {total_documents}

# HELP blackhole_chunks_total Total number of chunks
# TYPE blackhole_chunks_total gauge
blackhole_chunks_total {total_chunks}

# HELP blackhole_queries_total Total number of queries
# TYPE blackhole_queries_total gauge
blackhole_queries_total {total_queries}
"""
        return Response(content=metrics_text, media_type="text/plain")
    finally:
        db.close()

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["auth"])
app.include_router(datasets.router, prefix=settings.API_V1_PREFIX, tags=["datasets"])
app.include_router(uploads.router, prefix=settings.API_V1_PREFIX, tags=["uploads"])
app.include_router(query.router, prefix=settings.API_V1_PREFIX, tags=["query"])
app.include_router(processing.router, prefix=settings.API_V1_PREFIX, tags=["processing"])
app.include_router(stats.router, prefix=settings.API_V1_PREFIX, tags=["stats"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
