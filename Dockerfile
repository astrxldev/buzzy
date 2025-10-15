# syntax=docker/dockerfile:1.4

### Stage 1: deps ###
FROM oven/bun:latest AS deps
WORKDIR /home/container

RUN apt-get update \
    && apt-get install -y \
        python3 \
        make \
        g++ \
        sqlite3 \
        libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json bun.lock ./

# Install into cache, then persist into real node_modules
RUN bun install --frozen-lockfile

### Stage 2: builder ###
FROM oven/bun:latest AS builder

# Isolation
RUN useradd -mu 1001 container
USER container
WORKDIR /home/container

# Reuse deps
COPY --from=deps /home/container/node_modules ./node_modules
COPY --from=deps /home/container/package*.json ./ 
COPY --from=deps /home/container/bun.lock ./ 

# App source
COPY --chown=1001 . .

# Run patcher (background) + Next.js build (foreground), then kill patcher
RUN bun run build

### Stage 3: runner ###
FROM oven/bun:latest AS runner

# Isolation
RUN useradd -mu 1001 container
USER container
WORKDIR /home/container

COPY --from=builder /home/container/node_modules ./node_modules
COPY --from=builder /home/container/.next ./.next
COPY --from=builder /home/container/package*.json ./ 
COPY --from=builder /home/container/bun.lock ./ 
COPY --from=builder /home/container/* ./

CMD ["bun", "start"]
