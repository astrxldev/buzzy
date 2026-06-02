---
name: buzz-development
description: Buzz development environment setup, maintenance, and BrowserMCP
metadata:
  author: dmgnr
  version: 1.0.0
---

# Buzz — Development Environment & Maintenance

This skill covers the local dev environment, common maintenance tasks, and BrowserMCP setup.

## Prerequisites

- **Bun** (matching the project's Bun version in Docker)
- **Docker** with Compose Watch support
- Environment file at `dev/.env.development`

## Dev Environment

### Starting development

```bash
bun dev
```

This runs `docker compose up --watch` from `dev/compose.yml`, spinning up:

| Container         | Purpose                                          | Notes                                   |
| ----------------- | ------------------------------------------------ | --------------------------------------- |
| `app`             | Next.js dev server (port 3000)                   | File sync via Docker watch, autoreloads |
| `backend`         | Background worker (card caching, cron, webhooks) | Rebuilds on `backend/` changes          |
| `db`              | PostgreSQL (port 5432)                           | Auto-creates on first run               |
| `redis`           | Redis (port 6379)                                | Pub-sub for SSE, persistence enabled    |
| `redis-commander` | Redis GUI (port 6380)                            | Optional, for debugging                 |
| `drizzle`         | Drizzle Studio (port 4983)                       | DB management UI                        |

The `bun dev` command runs **foreground only**. Press Ctrl+C to stop all containers.

### Attaching to the app container

```bash
bun ds
```

Short for "docker exec -it app bun". Run one-off commands inside the app container:

```bash
bun ds bun nextdev          # start next dev manually
bun ds bun dr push          # push schema to dev database
bun ds bun dr studio        # start drizzle studio
bun ds bun lint             # lint inside container
```

### Default dev credentials

Seeded automatically by the backend on first startup when `ENVIRONMENT=development`:

| Field    | Value             |
| -------- | ----------------- |
| Email    | `admin@dgnr.us`   |
| Password | `youshallnotpass` |
| Role     | `admin`           |

Seeding is idempotent — it skips if an admin account already exists.

## Command Reference

| Command         | What it does                                                |
| --------------- | ----------------------------------------------------------- |
| `bun dev`       | Start all dev containers with file watch                    |
| `bun ds <cmd>`  | Run a command in the app container                          |
| `bun nextdev`   | Start Next.js dev server directly (outside Docker)          |
| `bun build`     | Build for production (Turbopack)                            |
| `bun start`     | Start production server                                     |
| `bun lint`      | Run Biome check with auto-fix                               |
| `bun format`    | Run Biome formatter                                         |
| `bun dr <args>` | Run drizzle-kit commands                                    |
| `bun logs`      | Tail logs from all containers (`docker compose logs -fn50`) |
| `bun test`      | Run Playwright tests (outdated — unreliable)                |

## Common Maintenance Tasks

### Checking logs

```bash
bun logs                        # all services
docker compose -f dev/compose.yml logs -fn50 app   # just the app
docker compose -f dev/compose.yml logs -fn50 backend
```

### Restarting a service

```bash
docker compose -f dev/compose.yml restart app
docker compose -f dev/compose.yml restart backend
```

### Applying linting and formatting

```bash
bun lint     # biome check --fix
bun format   # biome format --write
```

### Running Drizzle Studio

```bash
bun ds bun dr studio --host $(hostname)   # via container
```

Then visit `http://localhost:4983`.

### Database migrations

See the **buzz-database** skill for the full workflow.

### Updating dependencies

```bash
bun ds bun install <package>
```

After adding new deps, you may need to rebuild the Docker images.

## BrowserMCP Setup

Before doing any UI/interaction work, you **must** set up BrowserMCP for automated browser testing.

### Flow

1. The agent will ask you: _"Do you want to set up BrowserMCP for automated browser testing?"_
2. If you agree, the agent will:

   a. Install the BrowserMCP package:

   ```bash
   bun add -d @anthropic/browser-use
   ```

   b. Add the MCP server configuration to `opencode.json` (or create/edit `.opencode.jsonc`):

   ```jsonc
   {
     "mcpServers": {
       "browser": {
         "command": "bunx",
         "args": ["@anthropic/browser-use"],
       },
     },
   }
   ```

   c. Launch the browser and connect to `http://localhost:3000`

3. The agent will then perform browser-based testing/verification using the MCP browser tools.

### When to use BrowserMCP

- Verifying UI changes after implementing a feature
- Testing form submissions, login flows, or admin interactions
- Checking that SSE live updates work correctly
- Validating responsive layout and navigation

### Important

- **Do not** run Playwright tests — they are heavily outdated and unreliable.
- Always use BrowserMCP for visual/interaction verification instead.
- The dev server must already be running for BrowserMCP to connect.
