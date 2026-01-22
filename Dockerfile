# syntax=docker/dockerfile:1.7
ARG PNPM_VERSION=10.28.1

FROM node:22.21.0-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare "pnpm@${PNPM_VERSION}" --activate
WORKDIR /app

# Install all dependencies once (cached)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --package-import-method=copy

# Build the app (standalone output defined in next.config.ts)
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Pass API URL at build time - this gets embedded into the client bundle
# Usage: docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t next-ai .
# Or use docker-compose with .env file containing NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

# Minimal runtime image using Next.js standalone bundle
FROM node:22.21.0-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Standalone bundle already includes the needed node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
