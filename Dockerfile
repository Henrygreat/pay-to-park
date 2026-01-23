# ----------------------------
# Build stage
# ----------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY prisma ./prisma/

# Install deps needed for build
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

# Copy Next standalone server output (includes server.js + runtime)
COPY --from=builder /app/.next/standalone ./

# Copy static assets required at runtime
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema/migrations/seed (optional but useful for terminal migrations/seeding)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# If you plan to run "npm run db:seed" inside Coolify terminal,
# you need tsx available. (If you won't seed in-container, remove these 2 lines)
RUN npm i -g tsx

# Permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]