# Testing Guide

## 🧪 Testing Strategy

Backend supports 3 levels of testing:

```
┌──────────────────────────────────────────┐
│         E2E Tests (Integration)          │
│  Test complete user workflows            │
│  Database included                       │
└──────────────────────────────────────────┘
                    ▲
                    │
┌──────────────────────────────────────────┐
│       Integration Tests                  │
│  Test multiple modules together          │
│  Mock some external services             │
└──────────────────────────────────────────┘
                    ▲
                    │
┌──────────────────────────────────────────┐
│          Unit Tests                      │
│  Test individual functions/methods       │
│  Mock all dependencies                   │
└──────────────────────────────────────────┘
```

---

## 📝 Writing Tests

### Unit Test Example

```typescript
// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "@modules/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
  });

  describe("login", () => {
    it("should return accessToken and refreshToken", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "password123",
      };

      const user = {
        id: "1",
        email: "test@example.com",
        password: "hashed_password",
        role: "BUYER",
      };

      jest.spyOn(prisma.user, "findUnique").mockResolvedValue(user);
      jest.spyOn(jwt, "sign").mockReturnValue("token");

      const result = await service.login(loginDto);

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });
  });
});
```

### Integration Test Example

```typescript
// test/auth.e2e.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@modules/database/prisma.service";

describe("Auth E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Cleanup
    await prisma.user.deleteMany({});
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", () => {
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "newuser@test.com",
          firstName: "Test",
          lastName: "User",
          password: "TestPassword123!",
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.user.email).toBe("newuser@test.com");
        });
    });

    it("should reject duplicate email", async () => {
      // First registration
      await request(app.getHttpServer()).post("/api/auth/register").send({
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
        password: "TestPassword123!",
      });

      // Duplicate registration
      return request(app.getHttpServer())
        .post("/api/auth/register")
        .send({
          email: "test@test.com",
          firstName: "Test",
          lastName: "User",
          password: "TestPassword123!",
        })
        .expect(409);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login user and return tokens", async () => {
      // Create user first
      await request(app.getHttpServer()).post("/api/auth/register").send({
        email: "login@test.com",
        firstName: "Test",
        lastName: "User",
        password: "TestPassword123!",
      });

      // Login
      return request(app.getHttpServer())
        .post("/api/auth/login")
        .send({
          email: "login@test.com",
          password: "TestPassword123!",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });
  });
});
```

---

## 🧬 Test Coverage

### Target Coverage

- Line Coverage: > 80%
- Branch Coverage: > 75%
- Function Coverage: > 80%

### Generate Coverage Report

```bash
npm run test:cov
```

### View Coverage

```bash
open coverage/index.html
```

---

## 🔄 CI/CD Testing

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: plazo_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v2

      - name: Use Node.js
        uses: actions/setup-node@v2
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Prisma generate
        run: npm run prisma:generate

      - name: Run migrations
        run: npm run prisma:migrate:dev --name ci
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/plazo_test

      - name: Run tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/plazo_test

      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

---

## 📊 Test Examples by Module

### Auth Module Tests

- Register validation
- Login success/failure
- Password hashing
- JWT token generation
- Token refresh
- Tenant creation
- User profile retrieval

### Products Module Tests

- Create product
- List products with pagination
- Search products
- Filter by category
- Update product
- Delete product
- Boost product
- Product visibility

### Jobs Module Tests

- Post job
- List jobs
- Update job
- Delete job (soft)
- Job status changes
- Boost job
- Job search

### Proposals Module Tests

- Submit proposal
- Get job proposals
- Get seller proposals
- Accept proposal
- Reject proposal
- Update proposal (before acceptance)

### Orders Module Tests

- Create order from proposal
- Get buyer orders
- Get seller orders
- Update order status
- Order completion

### Chat Module Tests

- Send message
- Get messages
- Get chat rooms
- Mark as read
- Message pagination

### Reviews Module Tests

- Create review
- Get user reviews
- Calculate trust score
- Rating validation (1-5)

---

## 🛠️ Testing Tools

```bash
# Testing framework
npm install --save-dev @nestjs/testing jest @types/jest ts-jest

# Test database
npm install --save-dev @testcontainers/postgresql

# Assertions
npm install --save-dev chai

# API testing
npm install --save-dev supertest @types/supertest

# Mocking
npm install --save-dev jest-mock-extended

# Coverage
npm install --save-dev @jest/coverage
```

---

## ⚡ Performance Testing

### Load Testing with Artillery

```yaml
# load-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
  variables:
    productId: "prod-123"

scenarios:
  - name: "Get Products"
    flow:
      - get:
          url: "/api/products"

  - name: "Search Products"
    flow:
      - get:
          url: "/api/products?search=laptop"

  - name: "Get Jobs"
    flow:
      - get:
          url: "/api/jobs"
```

Run:

```bash
artillery run load-test.yml
```

---

## 📋 Test Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Code coverage > 80%
- [ ] No console errors/warnings
- [ ] All security tests passing
- [ ] Performance benchmarks acceptable
- [ ] Load testing passed
