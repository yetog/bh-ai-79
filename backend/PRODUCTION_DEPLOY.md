# Black Hole AI - Production Deployment Guide

## 🚀 Phase 4: Production Readiness Complete

This guide covers deploying Black Hole AI to IONOS DCD or any production environment.

## Prerequisites

- Docker & Docker Compose installed
- IONOS Object Storage credentials
- IONOS Model Hub API key
- PostgreSQL 16 with pgvector
- Redis 7+
- Domain name with SSL certificate

## Production Architecture

```
┌─────────────────────────────────────────────────┐
│              Load Balancer / Nginx               │
│                  (SSL Termination)               │
└─────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────┐
│              FastAPI API Servers                 │
│            (4 workers per instance)              │
└─────────────────────────────────────────────────┘
         ↓                    ↓
┌──────────────┐    ┌─────────────────┐
│  PostgreSQL  │    │  Redis Queue    │
│  + pgvector  │    │  + RQ Workers   │
└──────────────┘    └─────────────────┘
         ↓                    ↓
┌─────────────────────────────────────┐
│         IONOS Services              │
│  - Object Storage (S3)              │
│  - Model Hub (Embeddings + LLM)     │
└─────────────────────────────────────┘
```

## Quick Start

### 1. Environment Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with production credentials
```

**Critical Environment Variables:**
```env
DEBUG=False
SECRET_KEY=<generate-random-256-bit-key>
DATABASE_URL=postgresql://user:pass@postgres:5432/blackhole
REDIS_URL=redis://redis:6379/0

# IONOS Object Storage
S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
S3_REGION=eu-central-1
S3_BUCKET=blackhole-production
S3_ACCESS_KEY=<your-key>
S3_SECRET_KEY=<your-secret>

# IONOS Model Hub
IONOS_API_KEY=<your-api-key>
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_EMBEDDING_MODEL=text-embedding-3-small
IONOS_CHAT_MODEL=meta-llama/llama-3.1-8b-instruct
EMBEDDING_DIMENSIONS=1536
```

### 2. Deploy with Docker Compose

```bash
# Build production images
docker-compose build

# Start all services
docker-compose up -d

# Check health
curl http://localhost:8000/health
```

### 3. Run Database Migrations

```bash
docker-compose exec api alembic upgrade head
```

### 4. Verify Services

```bash
# Check all containers
docker-compose ps

# View logs
docker-compose logs -f api
docker-compose logs -f worker

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/ready
curl http://localhost:8000/metrics
```

## Production Features Implemented

### 🏥 Health Checks

**Liveness Probe** (`/health`):
- Database connectivity
- Redis connectivity
- Returns 503 if unhealthy

**Readiness Probe** (`/ready`):
- Fast check for load balancer
- Returns 200 when ready to serve

### 📊 Monitoring & Observability

**Structured JSON Logging:**
- All requests logged with timing
- Error tracking with stack traces
- Searchable log format

**Prometheus Metrics** (`/metrics`):
```
blackhole_documents_total
blackhole_chunks_total
blackhole_queries_total
```

**Request Logging:**
```json
{
  "event": "request_completed",
  "method": "POST",
  "path": "/api/query",
  "status_code": 200,
  "duration_ms": 234.56,
  "timestamp": "2025-10-07T03:00:00Z"
}
```

### 🔒 Security Features

✅ Non-root container user
✅ Multi-stage Docker build (smaller image)
✅ JWT authentication with token expiry
✅ Tenant isolation at database level
✅ Input validation with Pydantic
✅ SQL injection prevention (SQLAlchemy ORM)
✅ S3 presigned URLs (no direct credentials)

### ⚡ Performance Optimizations

- **Multi-worker deployment** (4 uvicorn workers)
- **uvloop** for async I/O performance
- **Redis caching** for stats and metrics
- **Connection pooling** for PostgreSQL
- **Optimized Docker layers** (build cache)

### 🔄 Reliability

- **Auto-restart** on failure (unless-stopped)
- **Health checks** with retries
- **Graceful shutdown** handling
- **Job retry logic** in RQ workers
- **Log rotation** (10MB max, 3 files)

## IONOS DCD Deployment

### Option 1: Kubernetes Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blackhole-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blackhole-api
  template:
    metadata:
      labels:
        app: blackhole-api
    spec:
      containers:
      - name: api
        image: blackhole-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: blackhole-secrets
              key: database-url
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 40
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
```

### Option 2: VM Deployment

1. **Provision IONOS VM:**
   - OS: Ubuntu 22.04 LTS
   - CPU: 4+ cores
   - RAM: 8+ GB
   - Storage: 100+ GB SSD

2. **Install Dependencies:**
```bash
# Update system
apt-get update && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt-get install docker-compose-plugin -y

# Install Nginx
apt-get install nginx certbot python3-certbot-nginx -y
```

3. **Deploy Application:**
```bash
git clone <your-repo>
cd black-hole-ai
docker-compose up -d
```

4. **Configure Nginx:**
```nginx
# /etc/nginx/sites-available/blackhole
upstream blackhole_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.blackhole.ai;

    location / {
        proxy_pass http://blackhole_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for long-running requests
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # SSE endpoint (processing updates)
    location /api/processing/stream {
        proxy_pass http://blackhole_api;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
```

5. **SSL Certificate:**
```bash
certbot --nginx -d api.blackhole.ai
```

## Monitoring Setup

### 1. Prometheus Integration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'blackhole-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 2. Grafana Dashboard

Import the provided dashboard JSON:
- Request rate and latency
- Document/chunk/query counts
- Database connection pool stats
- Worker queue depth

### 3. Log Aggregation

**Using ELK Stack:**
```yaml
# docker-compose.override.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=api"
```

**Using Grafana Loki:**
```yaml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/loki-config.yaml
```

## Backup & Disaster Recovery

### Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL dump
docker-compose exec -T postgres pg_dump -U blackhole blackhole | \
  gzip > $BACKUP_DIR/blackhole_$DATE.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/blackhole_$DATE.sql.gz \
  s3://blackhole-backups/postgres/

# Keep only last 30 days
find $BACKUP_DIR -name "blackhole_*.sql.gz" -mtime +30 -delete
```

### Restore Procedure

```bash
# Download backup
aws s3 cp s3://blackhole-backups/postgres/blackhole_20251007.sql.gz .

# Restore
gunzip blackhole_20251007.sql.gz
docker-compose exec -T postgres psql -U blackhole blackhole < blackhole_20251007.sql
```

## Performance Tuning

### PostgreSQL

```sql
-- /etc/postgresql/postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
work_mem = 10MB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

### Redis

```conf
# /etc/redis/redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### FastAPI

```python
# config.py adjustments for production
WORKERS = multiprocessing.cpu_count() * 2 + 1
MAX_CONNECTIONS = 100
POOL_SIZE = 20
POOL_RECYCLE = 3600
```

## Security Hardening

### 1. Firewall Configuration

```bash
# UFW rules
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. Fail2Ban

```ini
# /etc/fail2ban/jail.local
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/*error.log
maxretry = 5
bantime = 3600
```

### 3. Secret Rotation

```bash
# Generate new JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Update in .env and restart
docker-compose restart api
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check connectivity
docker-compose exec api pg_isready -h postgres -U blackhole

# View logs
docker-compose logs postgres
```

**Worker Not Processing Jobs:**
```bash
# Check worker status
docker-compose logs worker

# Inspect Redis queue
docker-compose exec redis redis-cli LLEN rq:queue:default
```

**High Memory Usage:**
```bash
# Monitor container stats
docker stats

# Adjust worker count
docker-compose scale worker=2
```

## Maintenance

### Routine Tasks

**Daily:**
- Monitor error logs
- Check disk space
- Review failed jobs

**Weekly:**
- Database vacuum and analyze
- Clear old logs
- Review security alerts

**Monthly:**
- Update dependencies
- Review access logs
- Optimize database indexes
- Test backup restoration

### Updates & Rollbacks

```bash
# Zero-downtime deployment
docker-compose pull
docker-compose up -d --no-deps --build api

# Rollback if needed
docker-compose down
git checkout <previous-commit>
docker-compose up -d
```

## Cost Optimization

### IONOS Resources

- **Compute:** Start with 4 CPU / 8GB RAM VM (~€40/month)
- **Storage:** Object Storage pay-as-you-go (~€0.02/GB)
- **Model Hub:** Per-API-call pricing (track usage)

### Optimization Tips

1. **Enable caching** for frequently accessed stats
2. **Implement lifecycle policies** for old files in S3
3. **Monitor API usage** to optimize Model Hub calls
4. **Use connection pooling** to reduce DB overhead
5. **Compress logs** and rotate frequently

## Support & Documentation

- **API Docs:** http://your-domain/api/docs
- **Health Status:** http://your-domain/health
- **Metrics:** http://your-domain/metrics
- **Logs:** `docker-compose logs -f`

---

**Production Checklist:**

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Health checks passing
- [ ] SSL certificates installed
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Logging configured
- [ ] Security hardening complete
- [ ] Load testing performed
- [ ] Documentation updated

**You're ready for production! 🚀**
