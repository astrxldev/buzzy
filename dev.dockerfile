# syntax=docker/dockerfile:1.4

### Stage 1: deps ###
FROM oven/bun:canary-alpine AS deps
WORKDIR /home/container

COPY package*.json bun.lock ./
COPY patches ./patches

# Install into cache, then persist into real node_modules
RUN --mount=type=cache,target=/root/.bun bun install --frozen-lockfile

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

CMD ["bun", "nextdev"]
