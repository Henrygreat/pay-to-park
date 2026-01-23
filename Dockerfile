# ----------------------------
# Build stage
# ----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./prisma.config.ts

# Install dependencies (includes dev deps needed for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the source
COPY . .

# Build Next.js (standalone output)
RUN npm run build


# ----------------------------
# Production stage
# ----------------------------
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# --- IMPORTANT ---
# Copy Next.js standalone server output (includes server.js + minimal node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static assets required at runtime
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema/migrations/seed + prisma config (for migrate/seed if you run it)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json ./package.json

# Optional: if you want to run seed inside the container terminal
# (tsx is used by your "npm run db:seed")
RUN npm i -g tsx

# Permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start Next standalone server
CMD ["node", "server.js"]