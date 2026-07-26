# Deployment Guide

## 🚀 Production Deployment

### Prerequisites

- Docker & Docker Compose
- PostgreSQL 14+
- Node.js 18+
- Git

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Security scan passed
- [ ] Performance benchmarks acceptable

### Deployment

- [ ] Backup current database
- [ ] Deploy new version
- [ ] Run database migrations
- [ ] Seed initial data if needed
- [ ] Health checks passing
- [ ] Smoke tests passing

### Post-Deployment

- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify database connections
- [ ] Check cache hit rates
- [ ] Monitor resource usage

---

## 🐳 Docker Deployment

### 1. Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "run", "start:prod"]
```

### 2. Docker Compose

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/plazo_db
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      - db
      - redis
    networks:
      - plazo-network

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: plazo_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - plazo-network

  redis:
    image: redis:7-alpine
    networks:
      - plazo-network

volumes:
  postgres-data:

networks:
  plazo-network:
    driver: bridge
```

### 3. Build & Run

```bash
# Build image
docker build -t plazo-backend:latest .

# Run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f app

# Stop
docker-compose down
```

---

## ☁️ Cloud Deployment

### AWS Elastic Beanstalk

```bash
# 1. Install EB CLI
pip install awsebcli

# 2. Initialize EB application
eb init -p node.js-18 plazo-backend

# 3. Create environment
eb create plazo-production --instance-type t3.medium

# 4. Configure environment variables
eb setenv \
  JWT_SECRET=xxx \
  DATABASE_URL=postgresql://...

# 5. Deploy
eb deploy

# 6. Monitor
eb status
eb logs
```

### Docker on AWS ECS

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name plazo-backend

# 2. Build & push image
docker build -t plazo-backend:latest .
docker tag plazo-backend:latest xxx.dkr.ecr.us-east-1.amazonaws.com/plazo-backend:latest
docker push xxx.dkr.ecr.us-east-1.amazonaws.com/plazo-backend:latest

# 3. Create ECS task definition
# 4. Create ECS service
# 5. Configure load balancer
```

### GCP Cloud Run

```bash
# 1. Build image
gcloud builds submit --tag gcr.io/PROJECT-ID/plazo-backend

# 2. Deploy to Cloud Run
gcloud run deploy plazo-backend \
  --image gcr.io/PROJECT-ID/plazo-backend \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=...
```

---

## 🔄 Database Migration

### Create Migration

```bash
npm run prisma:migrate:dev --name add_new_feature
```

### Review Migration

```bash
# Check migration file
cat prisma/migrations/*/migration.sql
```

### Run Migration in Production

```bash
npm run prisma:migrate:prod
```

### Rollback (if needed)

```bash
# Create a rollback migration
npm run prisma:migrate:dev --name rollback_feature
```

---

## 📊 Monitoring & Logging

### Application Monitoring

```bash
# PM2 process manager
npm install -g pm2

pm2 start dist/main.js --name "plazo-backend"
pm2 save
pm2 startup

# View logs
pm2 logs
```

### Database Monitoring

```bash
# Check slow queries
ANALYZE SELECT * FROM "User" WHERE email = 'test@example.com';

# Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'Product';

# Check connections
SELECT datname, usename, application_name, state FROM pg_stat_activity;
```

### Error Tracking (Sentry)

```bash
npm install @sentry/nestjs

# In main.ts
import * as Sentry from "@sentry/nestjs";

Sentry.init({
  dsn: "https://xxx@sentry.io/project-id",
  environment: process.env.NODE_ENV,
});
```

---

## 🔐 Security Hardening

### Environment Variables

- Store in `.env` file (never commit)
- Use secrets manager (AWS Secrets Manager, Vault)
- Rotate regularly
- Use strong random values

### SSL/TLS Certificate

```bash
# Using Let's Encrypt with Certbot
certbot certonly --standalone -d api.plazo.com
```

### Database Security

```bash
# Create restricted database user
CREATE USER app_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE plazo_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### Rate Limiting

```bash
# Configure in nginx/reverse proxy
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
  limit_req zone=api burst=20 nodelay;
  proxy_pass http://backend:3000;
}
```

---

## 📈 Scaling Strategy

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Add more database connections
- Use database replicas for read

### Horizontal Scaling

- Multiple app instances behind load balancer
- Database read replicas
- Redis cluster for caching
- Message queue for async jobs

### Auto-Scaling

```yaml
# AWS Auto Scaling Group
target_cpu_utilization: 70%
min_instances: 2
max_instances: 10
scale_up_threshold: 80%
scale_down_threshold: 30%
```

---

## 🆘 Troubleshooting

### High Memory Usage

```bash
# Check memory
node --max-old-space-size=2048 dist/main.js

# Use memory profiling
npm install clinic
clinic doctor -- node dist/main.js
```

### Slow API Responses

```bash
# Check slow queries
EXPLAIN ANALYZE SELECT ...

# Add indexes
CREATE INDEX idx_product_published ON "Product"(tenantId, isPublished);
```

### Database Connection Issues

```bash
# Check connection pool
prisma:logs debug

# Increase pool size
DATABASE_URL="postgresql://user:pass@host/db?pool_size=20"
```

### Deployment Rollback

```bash
# Keep previous version
docker tag plazo-backend:current plazo-backend:v1.0.0

# Rollback
docker run plazo-backend:v1.0.0
```

---

## 📞 Support & Resources

- GitHub: [plazo-marketplace](https://github.com/plazo/backend)
- Documentation: [docs.plazo.com](https://docs.plazo.com)
- Email: support@plazo.com
- Slack: #plazo-backend
