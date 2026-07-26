# Plazo Backend - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                              │
│  Web Browser (React/Next.js)  |  Mobile (React Native)     │
└──────────────┬────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER / REVERSE PROXY             │
│              (Nginx / Cloudflare / AWS ALB)                │
└──────────────┬────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│               NESTJS APPLICATION SERVERS                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes                                          │  │
│  │  ├─ Auth Module      (JWT, Login, Register)        │  │
│  │  ├─ Products Module  (CRUD, Search, Boost)         │  │
│  │  ├─ Jobs Module      (Post Job, Manage)            │  │
│  │  ├─ Proposals Module (Bidding System)              │  │
│  │  ├─ Orders Module    (Order Management)            │  │
│  │  ├─ Chat Module      (Messages, Rooms)             │  │
│  │  ├─ Reviews Module   (Ratings, Trust Score)        │  │
│  │  └─ Notifications    (Event-based)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware / Guards                                 │  │
│  │  ├─ TenantMiddleware  (Subdomain Resolution)       │  │
│  │  ├─ JwtAuthGuard      (Authentication)             │  │
│  │  ├─ RolesGuard        (Authorization - RBAC)       │  │
│  │  └─ ValidationPipe    (Input Validation)           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Common Utilities                                    │  │
│  │  ├─ Password Helper   (Hash, Validate)             │  │
│  │  ├─ Pagination Helper (Skip, Take)                 │  │
│  │  ├─ String Helper     (Slug, Truncate)             │  │
│  │  └─ Exception Filter  (Error Handling)             │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────┬────────────────────────────────────────────┘
               │
        ┌──────┴────────┬──────────────┬──────────┐
        │               │              │          │
        ▼               ▼              ▼          ▼
    ┌────────┐    ┌─────────┐    ┌──────┐  ┌────────┐
    │PostgreSQL│   │ Redis   │    │ S3   │  │RabbitMQ│
    │(Primary) │   │(Cache)  │    │Files │  │(Queue) │
    └────────┘    └─────────┘    └──────┘  └────────┘
        │
        ▼
   ┌─────────────────┐
   │ Read Replicas   │
   │ (Scaling)       │
   └─────────────────┘
```

---

## 📦 Module Dependencies

```
AppModule
├── DatabaseModule
│   └── PrismaService
├── AuthModule
│   ├── DatabaseModule
│   └── JwtModule
├── MarketplaceModule
│   ├── ProductsModule
│   │   └── DatabaseModule
│   ├── ServicesModule
│   │   └── DatabaseModule
│   └── CategoriesModule
│       └── DatabaseModule
├── JobsModule
│   └── DatabaseModule
├── ProposalsModule
│   └── DatabaseModule
├── OrdersModule
│   └── DatabaseModule
├── ChatModule
│   └── DatabaseModule
├── NotificationsModule
│   └── DatabaseModule
└── ReviewsModule
    └── DatabaseModule
```

---

## 🔄 Request Flow

```
CLIENT REQUEST
    │
    ▼
┌─────────────────────────────────┐
│ Load Balancer / Reverse Proxy   │
│ - Route to server              │
│ - SSL/TLS termination          │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Global Middleware               │
│ - Helmet (Security Headers)    │
│ - CORS                          │
│ - Rate Limiting                 │
│ - Request Logging              │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ TenantMiddleware                │
│ Extract subdomain              │
│ Load tenant from DB            │
│ req.tenant = { id, subdomain } │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Route Handler                   │
│ e.g., POST /api/products       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Guards (if @UseGuards)         │
│ - JwtAuthGuard                  │
│ - RolesGuard                    │
│ - req.user = decoded JWT        │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Controller Handler              │
│ Receives: @Body, @Param, ...  │
│ Calls: Service method           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Service Layer                   │
│ - Business Logic               │
│ - Database queries via Prisma  │
│ - Validations                  │
│ - Notifications                │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Prisma ORM                      │
│ - SQL Query Generation         │
│ - Database Connection          │
│ - Transaction Management       │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ PostgreSQL Database             │
│ - Execute Query                │
│ - Return Results               │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Response                        │
│ - 200 OK with data             │
│ - 400 Bad Request (validation) │
│ - 401 Unauthorized             │
│ - 403 Forbidden (RBAC)         │
│ - 500 Internal Server Error    │
└─────────────────────────────────┘
```

---

## 🔐 Security Layers

```
SECURITY DEFENSE IN DEPTH
├── Transport Layer
│   ├─ HTTPS/TLS
│   └─ Secure Cookies
├── Authentication Layer
│   ├─ JWT Access Token (15m)
│   ├─ JWT Refresh Token (7d)
│   └─ Secure Password Hashing (bcrypt)
├── Authorization Layer
│   ├─ Role-Based Access Control (RBAC)
│   ├─ Resource Ownership Check
│   └─ Tenant Isolation
├── Input Layer
│   ├─ Request Validation
│   ├─ Type Checking
│   ├─ XSS Prevention
│   └─ SQL Injection Prevention
├── Application Layer
│   ├─ Error Handling
│   ├─ Audit Logging
│   └─ Rate Limiting
└── Infrastructure Layer
    ├─ Helmet Security Headers
    ├─ CORS Configuration
    ├─ DDoS Protection
    └─ WAF (Web Application Firewall)
```

---

## 📊 Database Design

```
Multi-Tenant Architecture:

┌─────────────────────┐
│   Single Database   │
│   (PostgreSQL)      │
└──────────────┬──────┘
               │
        ┌──────┴──────┐
        │             │
    Tenant A      Tenant B
    (seller1)     (seller2)
        │             │
    ├─Products   ├─Products
    ├─Services   ├─Services
    ├─Jobs       ├─Jobs
    ├─Orders     ├─Orders
    └─Reviews    └─Reviews

All tables have "tenantId" for data isolation:
WHERE tenantId = :tenantId
```

---

## 🚀 Deployment Architecture

### Development

```
Local Development
├── Node.js + NestJS
├── PostgreSQL (local)
├── Redis (optional)
└── npm run start:dev
```

### Staging

```
AWS / GCP / Digital Ocean
├── App Servers (2-3 instances)
├── PostgreSQL RDS
├── Redis Cache
├── S3 for files
├── CloudFront CDN
└── SSL Certificate
```

### Production

```
Multi-Region Deployment
├── Load Balancer (across regions)
├── Auto-scaling Group (app servers)
├── PostgreSQL Primary + Replicas
├── Redis Cluster
├── Message Queue (RabbitMQ/Kafka)
├── S3 + CloudFront CDN
├── CloudWatch Monitoring
└── Backup & Disaster Recovery
```

---

## 📈 Scalability Roadmap

### Phase 1: Current (Monolith)

- Single NestJS app
- PostgreSQL single instance
- All modules together

### Phase 2: Database Scaling

- PostgreSQL Read Replicas
- Redis caching layer
- Database optimization

### Phase 3: Horizontal Scaling

- Multiple app instances
- Load balancer
- Session management (Redis)

### Phase 4: Microservices (Future)

```
Auth Service
├── User management
├── JWT generation
└── Role assignment

Product Service
├── Product CRUD
├── Search & filtering
└── Inventory management

Job Service
├── Job posting
├── Proposal management
└── Job matching

Order Service
├── Order creation
├── Payment processing
└── Fulfillment

Chat Service
├── Real-time messaging
├── Message storage
└── Notification triggers

Notification Service
├── Event consumer
├── Multi-channel delivery
└── Template management

Review Service
├── Rating & reviews
├── Trust score calculation
└── Analytics
```

---

## 🔍 Performance Optimization

```
Query Optimization
├── Database Indexing
│   ├─ tenantId indexes
│   ├─ Foreign key indexes
│   ├─ Search field indexes
│   └─ Status/State indexes
├── Pagination
│   ├─ Limit 100 max per page
│   └─ Cursor-based (optional)
├── N+1 Query Prevention
│   ├─ Use include() for relations
│   └─ Select only needed fields
└── Query Caching (Redis)
    ├─ Cache product lists
    ├─ Cache category list
    └─ Cache user profile

Application Optimization
├── Connection Pooling
├── Request Compression
├── Static file caching
├── API versioning
└── Async operations (Queue)
```

---

## 🛡️ Monitoring & Logging

```
Monitoring Stack
├── Application Metrics
│   ├─ Request count
│   ├─ Response times
│   ├─ Error rates
│   └─ Active connections
├── Database Metrics
│   ├─ Query performance
│   ├─ Connection count
│   ├─ Slow queries
│   └─ Replication lag
├── Infrastructure
│   ├─ CPU usage
│   ├─ Memory usage
│   ├─ Disk space
│   └─ Network bandwidth
└── Alerts
    ├─ High error rate
    ├─ Slow responses
    ├─ Down services
    └─ Resource exhaustion

Logging
├── Application Logs
│   └─ ./logs/*.log
├── Error Logs
│   └─ ./logs/error.log
├── Audit Logs
│   └─ AuditLog table in DB
└── Access Logs
    └─ Reverse proxy logs
```

---

## 🔄 Deployment Steps

```
1. Code Commit
   ├─ Push to Git repository
   └─ Trigger CI/CD pipeline

2. Build
   ├─ npm install
   ├─ npm run build
   └─ Create Docker image

3. Test
   ├─ Unit tests
   ├─ Integration tests
   └─ E2E tests

4. Deploy to Staging
   ├─ Deploy to staging environment
   ├─ Run smoke tests
   └─ Manual testing

5. Deploy to Production
   ├─ Blue-green deployment
   ├─ Database migrations
   ├─ Health checks
   └─ Rollback plan

6. Post-Deploy
   ├─ Monitor logs
   ├─ Check metrics
   └─ Notify stakeholders
```
