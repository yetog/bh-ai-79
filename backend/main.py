from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from config import get_settings
from database import engine, Base
from routers import auth, datasets, uploads, query, processing, stats

settings = get_settings()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}

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
