# ─── Production Dockerfile — multi-stage build ──────────────────────────────
# Build:  docker build -t greenstem .
# Run:    docker run -p 3000:3000 --env-file .env.local greenstem

# ─── Stage 1: deps ──────────────────────────────────────────────────────────
# Cài full dependencies (cả devDependencies vì cần để build)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: builder ────────────────────────────────────────────────────────
# Build Next.js → output standalone
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry trong CI/CD
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── Stage 3: runner ────────────────────────────────────────────────────────
# Image cuối cùng — chỉ chứa runtime tối thiểu (~150MB)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Tạo user non-root cho bảo mật
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build (Next.js đã optimize, chỉ những file cần thiết)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check — Vercel/Railway sẽ dùng endpoint này
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
