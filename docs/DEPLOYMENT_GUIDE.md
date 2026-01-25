# Black Hole AI - Deployment Guide

## Quick Start (Docker Compose)

### Prerequisites

- Docker 24+
- Docker Compose 2.20+
- IONOS S3 bucket created
- IONOS Model Hub API key

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/your-org/blackhole-ai.git
cd blackhole-ai

# Create environment file
cp backend/.env.example backend/.env
```

### 2. Fill Environment Variables

Edit `backend/.env`:

```bash
# REQUIRED - Generate a secure key
SECRET_KEY=$(openssl rand -hex 32)

# Database (use Docker internal hostname)
DATABASE_URL=postgresql://blackhole:blackhole@postgres:5432/blackhole

# Redis
REDIS_URL=redis://redis:6379/0

# IONOS S3 - Get from IONOS DCD
S3_ENDPOINT=https://s3.eu-central-1.ionoscloud.com
S3_REGION=eu-central-1
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key

# IONOS Model Hub - Get from IONOS AI Console
IONOS_API_KEY=your-api-key
IONOS_BASE_URL=https://openai.inference.de-txl.ionos.com/v1
IONOS_EMBEDDING_MODEL=text-embedding-3-small
IONOS_CHAT_MODEL=meta-llama/llama-3.1-8b-instruct
EMBEDDING_DIMENSIONS=1536
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Run Migrations

```bash
docker-compose exec api alembic upgrade head
```

### 5. Verify

```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","checks":{"database":"healthy","redis":"healthy"}}
```

---

## Production Deployment (IONOS DCD)

### Architecture

```
Internet → Load Balancer (Nginx) → API Servers (2+)
                                      ↓
                                   Workers (2+)
                                      ↓
                    PostgreSQL ← Redis ← S3 Storage
```

### 1. Provision Infrastructure

**Via IONOS DCD:**

1. Create Virtual Data Center
2. Provision:
   - 2x API servers (2 vCPU, 4GB RAM)
   - 2x Worker servers (2 vCPU, 4GB RAM)
   - 1x PostgreSQL (4 vCPU, 8GB RAM, 100GB SSD)
   - 1x Redis (2 vCPU, 4GB RAM)
   - 1x Load Balancer
3. Configure networking (VPC, security groups)

### 2. Install Docker on Servers

```bash
# On each server
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Deploy with Docker Swarm

```bash
# Initialize swarm on manager node
docker swarm init

# Join worker nodes
docker swarm join --token <token> <manager-ip>:2377

# Deploy stack
docker stack deploy -c docker-compose.prod.yml blackhole
```

### 4. Configure Nginx Load Balancer

```nginx
upstream api_servers {
    least_conn;
    server api1:8000;
    server api2:8000;
}

server {
    listen 443 ssl http2;
    server_name api.blackhole.ai;
    
    ssl_certificate /etc/letsencrypt/live/api.blackhole.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.blackhole.ai/privkey.pem;
    
    location / {
        proxy_pass http://api_servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /health {
        proxy_pass http://api_servers/health;
        access_log off;
    }
}
```

### 5. SSL Certificates

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get certificates
certbot --nginx -d api.blackhole.ai

# Auto-renewal
certbot renew --dry-run
```

---

## Environment-Specific Configurations

### Development

```bash
DEBUG=True
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

### Staging

```bash
DEBUG=False
CORS_ORIGINS=["https://staging.blackhole.ai"]
LOG_LEVEL=DEBUG
```

### Production

```bash
DEBUG=False
CORS_ORIGINS=["https://blackhole.ai", "https://app.blackhole.ai"]
LOG_LEVEL=INFO
WORKERS=4
```

---

## Scaling Guide

### Horizontal Scaling

```bash
# Scale API servers
docker-compose up -d --scale api=4

# Scale workers (for heavy processing)
docker-compose up -d --scale worker=8
```

### Database Scaling

1. **Read Replicas**: For query-heavy workloads
2. **Connection Pooling**: Use PgBouncer
3. **Partitioning**: Partition chunks table by dataset_id

```sql
-- Example partitioning
CREATE TABLE chunks (
    ...
) PARTITION BY LIST (dataset_id);
```

### Vector Index Tuning

```sql
-- For 1M+ vectors, increase lists
CREATE INDEX idx_chunks_embedding ON chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 500);  -- sqrt(n_vectors)
```

---

## Monitoring Setup

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
  
  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### Prometheus Config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'blackhole-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
```

### Key Metrics to Monitor

| Metric | Alert Threshold |
|--------|-----------------|
| API response time | > 2s |
| Worker queue length | > 100 |
| Database connections | > 80% pool |
| S3 upload failures | > 5% |
| Vector search latency | > 500ms |

---

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh - Run daily via cron

DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups

# Database backup
docker-compose exec -T postgres pg_dump -Fc blackhole > $BACKUP_DIR/db_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.dump s3://blackhole-backups/db/

# Keep last 30 days locally
find $BACKUP_DIR -name "*.dump" -mtime +30 -delete
```

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 24 hours

```bash
# Restore from backup
docker-compose exec -T postgres pg_restore -d blackhole < backup.dump

# Rebuild vector indexes
docker-compose exec api python -c "
from database import engine
engine.execute('REINDEX INDEX idx_chunks_embedding')
"
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" on startup | Wait for postgres healthcheck, increase `start_period` |
| Slow vector queries | Check `EXPLAIN ANALYZE`, verify ivfflat index used |
| Worker jobs stuck | Check Redis connection, restart workers |
| S3 upload failures | Verify credentials, check bucket CORS policy |
| Out of memory | Reduce batch sizes in worker, scale horizontally |

### Debug Commands

```bash
# Check API logs
docker-compose logs -f api

# Check worker logs
docker-compose logs -f worker

# Connect to database
docker-compose exec postgres psql -U blackhole

# Check Redis queue
docker-compose exec redis redis-cli LLEN rq:queue:default

# Check worker status
docker-compose exec api rq info
```

### Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/health` | Full dependency check |
| `/ready` | Quick readiness probe |
| `/metrics` | Prometheus metrics |
