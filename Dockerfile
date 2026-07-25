# syntax=docker/dockerfile:1.4

### Stage 1: deps ###
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /home/container

COPY package*.json bun.lock ./
COPY patches ./patches

# Install into cache, then persist into real node_modules
RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

### Stage 2: production deps ###
FROM oven/bun:1.3.14-alpine AS production-deps
WORKDIR /home/container

COPY package*.json bun.lock ./
COPY patches ./patches

RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile --production

### Stage 3: builder ###
FROM oven/bun:1.3.14-alpine AS builder

ARG BUILD_VERSION

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

# Generate one deployment identity in the image so every replica reports the same version.
RUN bun -e 'await Bun.write(".version", process.env.BUILD_VERSION || crypto.randomUUID())'

# Build SvelteKit's adapter-node server
RUN --mount=type=cache,target=/home/container/node_modules/.vite,uid=1001,gid=1001 \
    bun run build

### Stage 4: migration ###
FROM oven/bun:1.3.14-alpine AS migration
WORKDIR /home/container

RUN bun i uuidv7 drizzle-orm drizzle-kit

COPY --from=builder /home/container/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /home/container/lib ./lib

COPY drizzle.config.ts ./
COPY lib/db/ ./lib/db/

CMD ["bun", "drizzle-kit"]

### Stage 5: runner ###
FROM oven/bun:1.3.14-alpine AS runner

# Isolation
RUN adduser -Du 1001 container
USER container
WORKDIR /home/container

COPY --from=production-deps /home/container/node_modules ./node_modules
COPY --from=builder /home/container/build ./build
COPY --from=builder /home/container/package.json ./package.json
COPY --from=builder /home/container/tsconfig.json ./tsconfig.json
COPY --from=builder /home/container/.svelte-kit/tsconfig.json ./.svelte-kit/tsconfig.json
COPY --from=builder /home/container/.version ./.version
COPY --from=builder /home/container/lib ./lib
COPY --from=builder /home/container/util ./util

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    BODY_SIZE_LIMIT=30M
CMD ["bun", "build/index.js"]
