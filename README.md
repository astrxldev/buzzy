# Buzz Events

Next.js 16 application running multiple community events for YouTuber Buzz. Built with TypeScript, Bun, PostgreSQL, and Redis.

## Branches

### Donation

Payment-processing and stream-overlay system with two payment methods:

- **TrueMoney (TMN):** Voucher gift link redemption via Sastify API
- **PromptPay (SlipOK):** Slip image upload verified by SlipOK API

Key features:

- **Real-time overlay widget** (OBS-ready): SSE-driven animated popup with donor image, name, amount, message; plays SFX + Gemini TTS audio announcement (`"<name> โดเนทมา <amount> บาท"`)
- **Top donors leaderboard** at `/donate/top` — podium (1st–3rd) + table (4th–10th)
- **Admin panel** at `/donate/admin` — view donations, re-send popups, test popup, force-reload all widgets, copy artifact UIDs, view donor images
- **Heartbeat system:** Widget health monitoring with auto-recovery after 6+ missed heartbeats
- Sub-10 THB donations skip overlay but update leaderboard
- Queue-skip for artifact submissions (promoted queue)

### Artifact

Moderator-supervised character showcase ID review system:

- **Public submission** at `/artifact` — UID + character + comment form
- **Enka Network integration:** Auto-fetches showcase characters from UID
- **Free queue:** FIFO, 1 character reviewed per submission
- **Donation skip-queue:** Promoted submissions (`queue = NULL`), up to 8 characters, visually distinct in admin (yellow border, bitcoin icon)
- **Admin panel:** Sidebar with sorted submission list (special queue first), checkmark toggle, Enka card browser (iframe + rendered card), random picker, wipe/reset
- **Queue management:** Lock toggle, configurable capacity limit (`-1` = unlimited)
- **Card generation:** External MTS service renders character cards; cached as `bytea` in DB with revalidation support
- **Widget:** `/widget/artifact-count` — OBS overlay displaying count/limit

### Rubgram (รับกรรมแทนทางบ้าน)

Paid endgame content service where Buzz plays on your account:

- **Discord OAuth2** required — auto-joins guild, session persisted via cookie token
- **Service selector:** Multiple configurable service types with real-time price estimation; "all services" discount
- **Free queue counter:** Admin-configurable free slots (price = 0)
- **20-minute payment window** with PromptPay QR code and slip upload
- **SlipOK verification** with deduplication by `transRef`
- **Expiration system:** Unpaid submissions auto-expire with queue rebalancing; expired users can restore and pay
- **Admin panel:** Lock/limit/free controls, manual submission creation, Discord ping ("ถึงคิวแล้ว"), slip archive viewer by round, monthly archive
- **Widget:** `/widget/rubgram-count` — OBS overlay displaying count/limit

### Tierlist

Community character tier rankings:

- **Multi-type, multi-version:** Browse by category (e.g. Endgame Content) and patch
- **Drag-and-drop** via dnd-kit — place characters into SS/A/B/C/D tiers within On-Field DPS / Off-Field DPS / Support columns
- **Real-time collaboration** via SSE — all connected clients sync instantly
- **Comments & badges** assignable to individual placements
- **Admin edit mode** at `/:type/:ver/admin`
- Data sourced from Project Amber

### Guide

Character build guide directory:

- Searchable grid with debounced ilike search
- Each card links to an external Google Sheet
- Admin hide/unhide controls

### Admin

Centralized management panel at `/admin` (guarded by better-auth):

- **Dashboard:** Random Nod-Krai welcome messages, health monitor (DB, Enka, Amber, Redis/SSE)
- **Character manager:** CRUD for Genshin characters (element, weapon, stars, CDN image, Amber ID)
- **CDN file manager:** Upload, rename, import from URL
- **Guide admin:** Hide/unhide guides
- **Settings:** Enka Network toggle, manual Amber sync, account (WIP)
- **Audit log:** Last 1000 admin actions with user info
- **Section shortcuts:** Links to artifact, rubgram, donate, and tierlist admin

## Architecture Diagram has been moved to DIAGRAM.md

## Architecture

- **Framework:** Next.js 16 (App Router), Turbopack, React 19 — hybrid SSR/RSC/CSR
- **Runtime:** Bun (1.3.14-alpine) — development, production, and backend
- **Language:** TypeScript (strict, bundler module resolution)
- **UI:** shadcn/ui (Radix primitives), Tailwind CSS 4, motion, lucide-react, @tanstack/react-table, recharts
- **Forms:** react-hook-form, zod validation
- **Auth:** better-auth (email/password, admin role), Discord OAuth2 (Rubgram), internal Redis-backed tokens (service-to-service)
- **Database:** PostgreSQL via Drizzle ORM (5 schemas). All IDs are UUIDv7. Binary data stored as `bytea`.
- **Real-time:** Redis pub/sub → Server-Sent Events (SSE) — auto-reconnecting EventSource client with 90s heartbeat, 30min timeout
- **Analytics & Errors:** PostHog (cloud, proxied via Next.js rewrites)
- **TTS:** Google Gemini 2.5 Flash Preview TTS — randomized voices, WAV output, Redis-cached (7d), 1000-char limit
- **Background:** Canvas-based star renderer (~500 stars + shooting stars, capped at 30fps)
- **Font:** Anuphan (Thai-optimized)

## Real-Time System (SSE)

| Endpoint    | Events                                                                       | Clients                          |
| ----------- | ---------------------------------------------------------------------------- | -------------------------------- |
| `artifact`  | submit, toggleCheck, toggleLock, setLimit, wipe                              | Admin panel, artifact widget     |
| `rubgram`   | submit, paid, toggleCheck, toggleLock, setLimit, setFree, cancel, uploadSlip | Admin panel, rubgram widget      |
| `donate`    | ping, heartbeat, update, refresh                                             | Donate widget, top widget, admin |
| `active`    | version (deploy), live (YouTube status)                                      | All pages                        |
| `log`       | update (audit log)                                                           | Admin log viewer                 |
| `tl.{name}` | update_states, update_placements                                             | Tierlist per-type                |

## Embeddable Widgets (OBS Browser Source)

| Widget         | Route                    | Description                               |
| -------------- | ------------------------ | ----------------------------------------- |
| Donation alert | `/widget/donate`         | Full-screen animated popup with SFX + TTS |
| Top donor      | `/widget/donate/top`     | Compact real-time #1 donor bar            |
| Artifact queue | `/widget/artifact-count` | Submission count / capacity               |
| Rubgram queue  | `/widget/rubgram-count`  | Submission count / capacity               |

All widgets are SSE-driven, auto-updating, and designed for streaming overlays.

## Payment Processing

- **Rubgram:** PromptPay only — SlipOK API verifies slip images, deduplicated by `transRef`. 20-minute payment window with QR code.
- **Donation:** TrueMoney (Sastify API voucher redemption) + PromptPay (SlipOK). Transactions stored in dedicated `endgame.slips` table with full SlipOK response.

## Authentication & Authorization

- **Admin:** better-auth email/password with admin role check. Middleware protects `/admin/*`, `/artifact/admin/*`, `/rubgram/admin/*`, `/tl/*/admin/*`.
- **Rubgram users:** Discord OAuth2 — session persisted via cookie token (uuidv7).
- **Internal:** Redis-backed tokens (600s TTL) for backend-to-API auth via `X-Internal-Auth` header.
- **Brute-force protection:** 10 failed login attempts triggers a browser-crashing DoS defense (Brash technique) on the client.

## External APIs

| API               | Usage                                            | Endpoint                     |
| ----------------- | ------------------------------------------------ | ---------------------------- |
| Project Amber     | Character and version data, synced every 14 days | gi.yatta.moe                 |
| Enka Network      | Character showcase auto-fetch                    | enka.network                 |
| Astral/Enka Embed | Character card rendering                         | git.dgnr.us/astral/api       |
| SlipOK            | PromptPay slip verification                      | configurable                 |
| Sastify           | TrueMoney voucher redemption                     | api.sastify.xyz              |
| Google Gemini     | TTS for donation announcements                   | gemini-2.5-flash-preview-tts |
| Discord API       | OAuth2, guild member list, webhook pings         | discord.com                  |
| YouTube API       | Live stream status                               | googleapis.com               |
| PostHog Cloud     | Analytics and error tracking                     | us.i.posthog.com             |

## Database Schemas (PostgreSQL)

| Schema     | Tables                                                                                      | Domain                                      |
| ---------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `public`   | characters, versions, settings, guides, cdn, auditLog, user, session, account, verification | Core data (characters, auth, CDN, settings) |
| `artifact` | submissions, cards, settings                                                                | Artifact review queue                       |
| `endgame`  | submissions, sarchive, expired, slips, settings, discord, types                             | Rubgram service ordering                    |
| `tierlist` | types, tiers, columns, badges, versions, states                                             | Tier rankings                               |
| `donate`   | donations                                                                                   | Donation records                            |

## Contributing

### Prerequisites

- Bun, Docker & Docker Compose

### Setup

1. Clone the repo.
2. Copy `.env.example` to `.env` and fill in secrets (or use `dev/.env.development` for local defaults).
3. Start the dev environment:
   ```
   bun dev
   ```
   This spins up PostgreSQL, Redis, the backend, and the Next.js dev server with Turbopack — hot reload via Docker sync.
4. Access at `http://localhost:3000`.
5. Seeded admin account: `admin@dgnr.us` / `youshallnotpass` (set via `INITIAL_ADMIN_PWD`).

### Useful commands

| Command          | What it does                         |
| ---------------- | ------------------------------------ |
| `bun dev`        | Start full dev environment           |
| `bun ds`         | Open devshell                        |
| `bun run lint`   | oxlint                               |
| `bun run format` | oxfmt                                |
| `bun run build`  | Production build (Turbopack)         |
| `bun dr`         | drizzle-kit (generate, push, studio) |
| `bun ba`         | better-auth CLI                      |

### Code style

- Linting: oxlint (with tailwind and tsgo plugins), oxfmt
- All row IDs are UUIDv7
- PostgreSQL schemas for domain separation (`public`, `artifact`, `endgame`, `tierlist`, `donate`)
- New features should follow existing patterns: SSE for real-time, Zod for validation, server actions for mutations

### Project structure

| Path          | Contents                                                                |
| ------------- | ----------------------------------------------------------------------- |
| `app/(ui)/`   | Public pages (donate, artifact, rubgram, tierlist, guide, admin, login) |
| `app/api/`    | API routes (auth, payments, TTS, Amber sync, card rendering)            |
| `app/widget/` | Embeddable OBS overlays                                                 |
| `app/sse/`    | Server-Sent Events streaming endpoints                                  |
| `backend/`    | Standalone Bun backend (cron jobs, Discord webhooks, DB seeding)        |
| `lib/db/`     | Database schema, SSE endpoint definitions, Redis client                 |
| `components/` | Shared UI primitives (shadcn/ui)                                        |

## Deployment

### CI/CD (Gitea Actions)

Push to `main` or `dev` triggers `.github/workflows/build.yml`:

1. Build frontend Docker image (multi-stage: deps → drizzle push → builder → runner)
2. Build backend Docker image (compiled to Bun bytecode via `bun build --target bun --bytecode`)
3. Push both images to private registry at `registry.neko-piranha.ts.net`
4. Rolling update of Docker Swarm services (`buzz_app`, `buzz_backend`)

### Production stack (Docker Swarm)

| Service  | Replicas | Resources          | Notes                                              |
| -------- | -------- | ------------------ | -------------------------------------------------- |
| Frontend | 2        | 1 CPU / 1 GB RAM   | Healthcheck on `:3000`, autoscaling label          |
| Backend  | 1        | 1 CPU / 512 MB RAM | `NO_AUTH_CHECK=true` env, auto-rollback on failure |

Infrastructure dependencies:

- PostgreSQL database (managed externally)
- Redis instance for SSE pub/sub and caching
- Nginx reverse proxy with SSE optimizations (buffering off, 200s read timeout)
- Private Docker registry at `registry.neko-piranha.ts.net`

### Environment

Required variables (~30 total, see `.env.example`):

| Category          | Variables                                                                          |
| ----------------- | ---------------------------------------------------------------------------------- |
| Database          | `DATABASE_URL`, `REDIS_URL`                                                        |
| Auth              | `BETTER_AUTH_SECRET`                                                               |
| Rubgram payments  | `SLIPOK_API_URL`, `SLIPOK_API_KEY`                                                 |
| Donation payments | `TMN_DEST_PHONE_NUM`, `SASTIFY_API_PRIVKEY`                                        |
| TTS               | `GEMINI_TTS_API_KEY`                                                               |
| Widget            | `DONATE_WIDGET_KEY`                                                                |
| Discord           | `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_*`, `DISCORD_GUILD_ID`, `DISCORD_WEBHOOK_URL` |
| YouTube           | `YOUTUBE_CHANNEL_ID`, `YOUTUBE_API_KEY`                                            |
| Analytics         | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`                                                |

## Developers

Lead Developer: `@dmgnr`

Project Coordinator: `@gunshiz`

Consultant Developer: `@s4msh1ne`
