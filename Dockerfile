# syntax=docker/dockerfile:1.4

### Stage 1: deps ###
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /home/container

COPY package*.json bun.lock ./
COPY patches ./patches

# Install into cache, then persist into real node_modules
RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

### Stage 2: builder ###
FROM oven/bun:1.3.14-alpine AS builder

# Isolation
RUN adduser -Du 1001 container
USER container
WORKDIR /home/container

# Reuse deps
COPY --from=deps /home/container/node_modules ./node_modules
COPY --from=deps /home/container/package*.json ./ 
COPY --from=deps /home/container/bun.lock ./

# App source
COPY --chown=1001 . .

# Deployment versioning
RUN bun -e "const id = Bun.randomUUIDv7(); Bun.write('.version', id); Bun.write('.env.deployment', 'NEXT_DEPLOYMENT_ID='+id)"

# Bind mount recursively makes non-existent directories as root, instead of configured user
RUN mkdir -p .next

# Build nextjs
RUN --mount=type=cache,target=/home/container/.next/cache,uid=1001,gid=1001 \
    bun run build

# Fix nextjs caching(bind mount removes it after build process)
RUN mkdir -p .next/cache

### Stage 3: migration ###
FROM oven/bun:1.3.14-alpine AS migration
WORKDIR /home/container

COPY --from=deps /home/container/node_modules ./node_modules
COPY --from=deps /home/container/package*.json ./
COPY --from=deps /home/container/bun.lock ./
COPY --from=builder /home/container/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /home/container/lib ./lib

COPY drizzle.config.ts ./
COPY lib/db/ ./lib/db/

CMD ["bun", "drizzle-kit"]

### Stage 4: runner ###
FROM oven/bun:1.3.14-alpine AS runner

# Isolation
RUN adduser -Du 1001 container
USER container
WORKDIR /home/container

COPY --from=builder /home/container/.next/standalone ./
COPY --from=builder /home/container/public ./public
COPY --from=builder /home/container/.next/static ./.next/static
COPY --from=builder /home/container/.version ./.version

ENV HOSTNAME=0.0.0.0
CMD ["bun", "server.js"]