# syntax=docker/dockerfile:1.4

### Stage 1: deps ###
FROM oven/bun:canary-alpine AS deps
WORKDIR /home/container

# RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
#     --mount=type=cache,target=/var/lib/apt,sharing=locked \
#     apt-get update \
#     && apt-get install -y \
#         python3 \
#         make \
#         g++ \
#         sqlite3 \
#         libsqlite3-dev \
#     && rm -rf /var/lib/apt/lists/*

COPY package*.json bun.lock ./

# Install into cache, then persist into real node_modules
RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

### Stage N: drizzle ###
FROM oven/bun:canary-alpine as drizzle

# Isolation
RUN adduser -Du 1001 container
USER container
WORKDIR /home/container
COPY --from=deps /home/container/node_modules ./node_modules
COPY --from=deps /home/container/package*.json ./
COPY --from=deps /home/container/bun.lock ./
COPY --chown=1001 ./drizzle.config.ts ./.env ./
COPY --chown=1001 ./lib/db ./lib/db

RUN bun dr push

### Stage 2: builder ###
FROM oven/bun:canary-alpine AS builder

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

### Stage 3: runner ###
FROM oven/bun:canary-alpine AS runner

# Isolation
RUN adduser -Du 1001 container
USER container
WORKDIR /home/container

COPY --from=builder /home/container/node_modules ./node_modules
COPY --from=builder /home/container/bun.lock ./ 
COPY --from=builder /home/container/package*.json ./ 

COPY --from=builder /home/container/public ./public
COPY --from=builder /home/container/.env ./.env
COPY --from=builder /home/container/.next ./.next

COPY --from=builder /home/container/util ./util
COPY --from=builder /home/container/lib ./lib
COPY --from=builder /home/container/tsconfig.json ./tsconfig.json
COPY --from=builder /home/container/.version ./.version

CMD ["bun", "start"]
