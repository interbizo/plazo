# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma Client
RUN npm run prisma:generate

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production

# Install OpenSSL + libstdc++ untuk Prisma schema engine
RUN apk add --no-cache openssl libstdc++

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy Prisma schema + generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy seed scripts (untuk db:seed di production)
COPY --from=builder /app/seed.ts ./seed.ts

# Copy built application
COPY --from=builder /app/dist ./dist

# Create uploads directory with proper ownership
RUN mkdir -p uploads/images uploads/documents uploads/avatars uploads/cv uploads/portfolio logs && \
    chown -R nestjs:nodejs /app

# Set environment
ENV NODE_ENV=production
ENV APP_PORT=3001

# Switch to non-root user
USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]
