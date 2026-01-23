# ----------------------------
# Build stage
# ----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (includes dev deps for build + tsx for seed if needed)
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

# Copy Next standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema/migrations/seed
COPY --from=builder /app/prisma ./prisma

# ✅ Copy ALL node_modules so runtime tools exist (bcryptjs, tsx, prisma CLI deps, etc.)
COPY --from=builder /app/node_modules ./node_modules

# Permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Start Next standalone server
CMD ["node", "server.js"]