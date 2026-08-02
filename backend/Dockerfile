# ─────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY src ./src

# Build NestJS
RUN npm run build

# ─────────────────────────────────────────
# Stage 2: Production Runtime
# ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install production-only dependencies
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy db init and seed scripts
COPY scripts ./scripts

# Create uploads directory
RUN mkdir -p uploads

# Expose backend port
EXPOSE 3000

# Entrypoint: Run db init then start the app
CMD node scripts/init-db.js && npx prisma db push --accept-data-loss && npx prisma db seed && node dist/src/main
