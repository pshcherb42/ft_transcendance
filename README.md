_This project has been created as part of the 42 curriculum by akreise, dcampas, ebalana, pshcherb and rmanzana._

# ft_transcendence

## 1. Description

**ft_transcendence** is the capstone web project of the 42 core curriculum. Under this version of the subject the team is free to build any web application it likes, as long as it meets the mandatory technical baseline and earns enough module points — this team chose to build a real-time, multiplayer **Pong** platform. Beyond the game itself, the project delivers a full social platform around it — accounts, friends, live chat, presence, match history, statistics and tournaments — served over HTTPS behind an Nginx reverse proxy, fully containerized with Docker.

### Key features at a glance

- **Real-time Pong** rendered on an HTML5 canvas, playable locally (2 players on one keyboard/touchscreen), against an **AI opponent**, or **remotely online** against another player via WebSockets, with reconnect handling and forfeit/timeout logic.
- **Tournament mode** with bracket generation, round tracking and a dedicated results view.
- **Game customization**: obstacles, power-ups and paddle-speed variants layered on top of the base Pong ruleset.
- **Account system**: classic email/password registration and login, **Google OAuth 2.0** sign-in, JWT access/refresh tokens, and **self-service password recovery** by email (Resend).
- **Social layer**: friend requests, online presence, a live **chat** with unread badges and toast notifications, and game invites sent directly from a friend's profile.
- **Profiles & statistics**: avatars, editable profile data, per-user win/loss stats, match history and a global leaderboard rendered with Chart.js.
- **Internationalization**: full UI translation into **English, Spanish and Latvian**.
- **Responsive design**: usable from desktop, tablet and mobile, including dedicated touchscreen controls for the game.
- **Public REST API**: a separate, API-key-protected and rate-limited endpoint set (documented with Swagger) exposing user data to external consumers.
- **HTTPS everywhere**, both locally (self-signed certificate generated automatically) and publicly (Cloudflare Tunnel), with a dark/light theme switcher.

---

## 2. Instructions

### Prerequisites

- **Docker** and **Docker Compose** (the entire stack — frontend, backend, database, Nginx — runs in containers; nothing else needs to be installed system-wide to run the app).
- `make` (the project is driven entirely through a `Makefile`).
- Node.js is only required on the host if you want editor autocomplete/type-checking (`make host-deps`) — it is **not** required to run the app.
- (Optional) `cloudflared` CLI, only if you intend to expose the app publicly through a Cloudflare Tunnel.

### Environment setup

The project is configured entirely through a single `.env` file at the repository root (never committed — see `.env.example` for the full list of variables: database credentials, `DATABASE_URL`, `JWT_SECRET` / `JWT_REFRESH_SECRET` / `JWT_RESET_SECRET`, `FRONTEND_URL`, Google OAuth credentials, `PUBLIC_API_KEY`, and `RESEND_API_KEY` for transactional email).

### Quick start (local only, no public tunnel)

```bash
git clone <repo-url>
cd ft_transcendance
make jwt-secrets       # creates .env from .env.example and generates JWT secrets
```

Open the generated `.env` and fill in the remaining values (DB password can be anything; Google OAuth credentials; `RESEND_API_KEY` can stay a placeholder unless testing password recovery), then:

```bash
make install-deps      # installs backend deps inside Docker, runs Prisma generate + migrate
make host-deps         # optional — local node_modules for editor autocomplete only
make                   # docker compose up — builds and starts frontend, backend, db, nginx
```

Once running, open **`https://localhost:8443`** (the local SSL certificate is generated automatically on first run).

### Full setup (public domain via Cloudflare Tunnel, Google OAuth, password recovery)

The complete walkthrough — one-time Cloudflare Tunnel creation, pointing `.env` at a public domain, registering redirect URIs in Google Cloud Console, and verifying a sending domain with Resend for password-recovery emails — is documented step by step in [`getting ready.md`](getting%20ready.md). The tunnel is entirely optional: if no `cloudflared/config.yml` is present, `make` simply runs the app locally and skips it.

### Useful Makefile targets

| Command                                       | Purpose                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| `make`                                        | Build and start the full stack                                                |
| `make install-deps`                           | Install backend dependencies, generate the Prisma client, run migrations      |
| `make host-deps`                              | Install `node_modules` on the host (editor support only)                      |
| `make jwt-secrets` / `make jwt-secrets-force` | Create/rotate `.env` JWT secrets                                              |
| `make pack-secrets` / `make unpack-secrets`   | Share `.env` + tunnel credentials with a teammate as a password-protected zip |
| `make fclean` / `make defclean`               | Deep clean (Docker cache, local `node_modules`, volumes)                      |
| `make re`                                     | Full reset and restart                                                        |

---

## 3. Team Information

The subject requires a **Product Owner (PO)**, a **Project Manager (PM)**, a **Technical Lead** and **Developers** to be clearly assigned, and allows one person to hold more than one role. Git history only shows _what_ was built, not who chaired which meeting, so the mapping below is inferred from the technical scope and consistency of each contributor's commits (who authored the original architecture, who kept resolving cross-team blockers) rather than a transcript of an actual team vote — the team should confirm/adjust it before evaluation.

| Login        | Name                 | Role                                  | Responsibilities                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pshcherb** | Polina Shcherbina    | **Product Owner & Technical Lead**    | Bootstrapped the project (chose NestJS + Prisma + PostgreSQL + Next.js + Docker Compose + Nginx) and drove the initial feature backlog — authentication, friends/presence, chat, internationalization, the public REST API — that the rest of the team built on top of. Shaped the database schema and core module boundaries.                                                                                                |
| **rmanzana** | Raúl Manzanas Trillo | **Project Manager & DevOps**          | Cleared the blockers stopping other people's features from working end to end (the bulk of his commits are literally "fix — X was broken"), owns deployment/infrastructure (HTTPS, Nginx, Cloudflare Tunnel, secrets-sharing scripts), and wrote/maintained the team's setup documentation (`getting ready.md`). Also implemented password recovery and cross-cutting full-stack polish (theming, notifications, i18n fixes). |
| **ebalana**  | Ernest Balana Gelpi  | **Developer — Backend / Game Engine** | Set up the WebSocket gateway, matchmaking queue and authentication guard for online play, and built the first version of the server-authoritative Pong engine, the AI opponent and the local/online game integration.                                                                                                                                                                                                         |
| **dcampas**  | David Campas         | **Developer — Frontend / Gameplay**   | Built the Pong game engine on the client (physics, dual controls, collisions, scoring), then extended it with local tournaments, power-ups, obstacles and paddle-speed variants.                                                                                                                                                                                                                                              |
| **akreise**  | Anna Kreise          | **Developer — Frontend / UI-UX**      | Designed and implemented the majority of the page UI (login, register, profile, chat, tournament view, stats), the responsive/mobile layouts, and the stats dashboard integration.                                                                                                                                                                                                                                            |

---

## 4. Project Management

- **Task distribution & work organization**: trunk-based feature branching — each teammate worked on a personal branch (`feature/<login>`) named after their 42 login, merging into the shared integration branch once a feature was stable. Task ownership followed the architectural split in the table above: backend/infrastructure foundations were owned by whoever set up that subsystem first (pshcherb, ebalana), gameplay and UI features were iterated on directly by the frontend-focused members (dcampas, akreise), and cross-cutting bug fixes/merges were handled collaboratively (commit history shows repeated conflict-resolution and "merge polina"/"repair broken merge resolutions" commits between branches). This README covers the contributions on `feature/akreise`, `feature/dcampas`, `feature/ebalana`, `feature/pshcherb` and `feature/rmanzana`.
- **Task tracking & communication channel**: not visible from git history — the team used GitHub Issues, Discord and WhatsApp for day-to-day coordination.
- **Documentation as a living artifact**: setup instructions (`getting ready.md`, `AUTH_SETUP.md`, `SETUP.md`) were rewritten several times over the project's lifetime as the deployment story evolved from plain HTTP to HTTPS to a public Cloudflare Tunnel, keeping onboarding reproducible for every new machine/teammate — effectively serving as the team's shared decision log.
- **Secrets handling**: rather than sharing `.env` files ad hoc, the team standardized on `make pack-secrets` / `make unpack-secrets` — a password-protected zip shared through a separate channel from the password itself — to onboard new machines without leaking credentials through chat history.

---

## 5. Technical Stack

| Layer                | Technology                                                              | Why                                                                                                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend framework   | **Next.js 16 (App Router) + React 19**                                  | Enables both client-side interactivity (canvas game loop, WebSockets) and server-rendered routing out of the box, with a familiar component model.                                                                                |
| Styling              | **Tailwind CSS 4**                                                      | Utility-first styling made it fast for a five-person team to converge on one consistent design system (color palette, dark/light theme) without fighting CSS specificity.                                                         |
| Frontend real-time   | **Socket.IO client**                                                    | Pairs with the backend's Socket.IO gateway for low-latency game state, chat and presence updates.                                                                                                                                 |
| Charts               | **Chart.js / react-chartjs-2**                                          | Used to render the win/loss graphs and leaderboard on the stats dashboard.                                                                                                                                                        |
| i18n                 | **i18next / react-i18next**                                             | Mature, well-documented library for driving the English/Spanish/Latvian translations from JSON resource files.                                                                                                                    |
| Backend framework    | **NestJS 11**                                                           | A structured, dependency-injected Node.js framework — its module system maps cleanly onto the project's domains (auth, users, friends, presence, websockets, public-api), which mattered for keeping five people's work isolated. |
| Real-time backend    | **Socket.IO (via `@nestjs/websockets` + `@nestjs/platform-socket.io`)** | Handles the authoritative game loop, matchmaking queue, chat and presence over WebSockets.                                                                                                                                        |
| ORM / Database       | **PostgreSQL + Prisma**                                                 | Prisma's schema-first migrations and generated client gave type safety between the database and NestJS services; PostgreSQL was a natural, free, well-supported relational store for users/matches/friendships.                   |
| Authentication       | **Passport.js (local + JWT + Google OAuth20 strategies), bcrypt**       | Industry-standard strategy composition inside NestJS; bcrypt for password hashing, JWT access/refresh tokens for session handling.                                                                                                |
| Email                | **Resend**                                                              | Chosen for the transactional password-recovery emails — simple API, generous free tier for a student project.                                                                                                                     |
| API docs / hardening | **@nestjs/swagger, @nestjs/throttler, custom API-key guard**            | The public-facing REST API is documented with Swagger and protected with rate limiting + an API key, separate from the JWT-authenticated app API.                                                                                 |
| Reverse proxy / TLS  | **Nginx**                                                               | Terminates HTTPS for both frontend and backend, and proxies WebSocket upgrades.                                                                                                                                                   |
| Public tunnel        | **Cloudflare Tunnel (`cloudflared`)**                                   | Exposes the local Docker stack on a public HTTPS domain without opening router ports.                                                                                                                                             |
| Containerization     | **Docker + Docker Compose**                                             | One `docker compose up` boots frontend, backend, PostgreSQL, Nginx and (optionally) the tunnel identically on every teammate's machine.                                                                                           |

---

## 6. Database Schema

The schema is managed by Prisma (`backend/prisma/schema.prisma`) against PostgreSQL.

```
┌───────────────────────────┐
│           User            │
├───────────────────────────┤
│ id (uuid, PK)             │
│ email (unique)            │
│ username (unique)         │
│ name                      │
│ password  (nullable)      │
│ avatar                    │
│ refreshToken (hashed)     │
│ authProvider: LOCAL|GOOGLE│
│ providerId (unique)       │
│ createdAt                 │
└───────────────────────────┘
   │1            │1            │1
   │ (sender)    │ (home/away) │
   ▼*            ▼*            ▼0..1
┌───────────┐ ┌──────────────┐  ┌─────────┐
│ Friendship│ │   Match      │  │  Stats  │
├───────────┤ ├──────────────┤  ├─────────┤
│ id (PK)   │ │ id (PK)      │  │ id (PK) │
│ senderId ─┼─┤ homeId ──────┼──┤ userId  │─ 1:1 with User
│ receiverId┼─┤ awayId ──────┼──┤ wins    │
│ status:   │ │ homeScore    │  │ losses  │
│  PENDING/ │ │ awayScore    │  │ level   │
│  ACCEPTED/│ │ winnerId     │  └─────────┘
│  BLOCKED  │ │ isAIGame     │
│ createdAt │ │ round        │
└───────────┘ │ bracketPos.  │
 @@unique     │ tournamentId │──┐
 [sender,     │ createdAt    │  │
  receiver]   └──────────────┘  │   ┌─────────────┐
                                │   │ Tournament  │
                                │   ├─────────────┤
                                └──►│ id (PK)     │
                                    │ name        │
                                    │ createdAt   │
                                    │ matches[]   │
                                    └─────────────┘
```

**Relations**

- `User` 1—* `Friendship` (as `sender`) and 1—* `Friendship` (as `receiver`); a unique constraint on `[senderId, receiverId]` prevents duplicate relationship rows, and `status` (`PENDING`/`ACCEPTED`/`BLOCKED`) tracks the friendship lifecycle. Deletes cascade from `User`.
- `User` 1—* `Match` as `homePlayer` and 1—* `Match` as `awayPlayer` (`onDelete: SetNull`, so historical matches survive account deletion); `isAIGame` flags matches played against the AI, and `winnerId` records the result.
- `Match` *—1 `Tournament` (nullable — a match can be a standalone game or belong to a tournament bracket), with `round` and `bracketPosition` describing its place in that bracket.
- `User` 1—0..1 `Stats` (cascading delete) aggregates `wins`, `losses` and a derived `level` per user, feeding the leaderboard and profile dashboard.
- `AuthProvider` (`LOCAL` | `GOOGLE`) and `providerId` support both password-based accounts and Google-linked accounts on the same `User` table.

---

## 7. Features List

| Feature                                                     | Description                                                                                          | Contributor(s)                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Project scaffold (NestJS + Prisma + Docker Compose + Nginx) | Initial backend/frontend monorepo setup, containerization and reverse proxy                          | pshcherb                                                                                  |
| Local registration & login (JWT, bcrypt)                    | Email/password signup with hashed passwords, access + refresh JWTs, protected route guards           | pshcherb                                                                                  |
| Google OAuth 2.0 login                                      | "Sign in with Google" strategy, callback handling, account linking                                   | pshcherb, rmanzana                                                                        |
| Password recovery                                           | `/forgot-password` → email link (Resend) → `/reset-password`, with a dedicated reset JWT             | rmanzana                                                                                  |
| Profile management                                          | View/edit profile, avatar upload with client-side compression                                        | pshcherb, akreise                                                                         |
| Friends system                                              | Send/accept/decline friend requests, block, live online-presence indicator                           | pshcherb (backend), akreise, Giacomino (frontend panel)                                   |
| Live chat                                                   | Real-time 1:1 chat over WebSockets, unread badges, "who messaged you" toast notifications            | pshcherb (backend/base), akreise (UI/responsive), rmanzana (unread badges, notifications) |
| Game invites                                                | Invite a friend to a match directly from chat/friends panel, with race-condition/ghost-room handling | pshcherb, rmanzana                                                                        |
| Local 2-player Pong                                         | Canvas-rendered Pong for two players on one device/keyboard, with touchscreen controls               | dcampas (engine), akreise (view), rmanzana (touchscreen fix)                              |
| AI opponent                                                 | Single-player mode against a scripted AI                                                             | ebalana (initial), dcampas (tuning)                                                       |
| Online multiplayer Pong                                     | Server-authoritative game engine, matchmaking queue, reconnect/forfeit/disconnect-timer handling     | ebalana (foundation), pshcherb (persistence, race conditions), rmanzana (stability fixes) |
| Tournaments                                                 | Bracket generation, round tracking, results/rankings view                                            | dcampas (engine), akreise (UI)                                                            |
| Game customization                                          | Obstacles, power-ups, faster-paddle variants                                                         | dcampas, akreise                                                                          |
| Stats & leaderboard                                         | Per-user win/loss history, Chart.js graphs, global leaderboard                                       | akreise                                                                                   |
| Public REST API                                             | Swagger-documented, API-key-protected, rate-limited endpoints for external user data access          | pshcherb                                                                                  |
| Internationalization                                        | Full UI translation into English, Spanish and Latvian                                                | pshcherb (i18n infra), akreise, rmanzana (translations)                                   |
| Responsive / mobile support                                 | Layouts adapted for common breakpoints, dark/light theme switcher                                    | akreise, rmanzana                                                                         |
| HTTPS & public tunnel                                       | Local self-signed cert automation, Nginx TLS termination, Cloudflare Tunnel for public access        | rmanzana                                                                                  |

---

## 8. Modules

This subject's version (21.2) requires **14 points**, Major modules worth 2 pts and Minor modules worth 1 pt, chosen from the catalogue in the subject PDF (Web, Accessibility & Internationalization, User Management, Artificial Intelligence, Cybersecurity, Gaming and user experience, Devops, Data and Analytics, Blockchain, Modules of choice). Two things this subject makes explicit that are easy to miss:

- A **responsive, accessible, cross-device frontend**, an **ORM-backed database with a clear schema**, and **basic email/password user management** are mandatory baseline requirements (Chapter III), **not** scored modules — they're implemented, but aren't counted below.
- The **bonus part only counts up to +5 points** beyond the required 14, and only once all 14 base points are validated — so the total below is deliberately above 14 to leave margin for anything not validated live at evaluation, not because every extra point converts to grade.

Every module below is checked against the schema, the controllers/gateways and the frontend components, not just commit messages.

### Major modules (2 pts each) — 8 × 2 = 16 pts

| Category                   | Module                                                | Implementation                                                                                                                                                              | Contributor(s)                                                                           |
| -------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Web                        | Use a framework for both the frontend and the backend | NestJS backend (modular: `auth`, `users`, `friends`, `presence`, `websockets`, `public-api`, `prisma`) + Next.js/React frontend                                             | pshcherb (scaffold), ebalana/rmanzana (backend), all frontend contributors               |
| Web                        | Real-time features (WebSockets)                       | Socket.IO gateway driving the game loop, chat and presence, with graceful connect/disconnect and reconnect handling                                                         | ebalana (foundation), pshcherb, rmanzana (stability fixes)                               |
| Web                        | Allow users to interact with other users              | Basic chat (send/receive), profile system, friends system (add/remove, friends list, online status)                                                                         | pshcherb (backend/base), akreise (UI), rmanzana (notifications)                          |
| Web                        | Public API                                            | `/api/public/users` — `GET` (list + by id), `POST`, `PUT`, `DELETE`, behind an API-key guard (`ApiKeyGuard`) + rate limiting (`@nestjs/throttler`), documented with Swagger | pshcherb                                                                                 |
| User Management            | Standard user management and authentication           | Profile editing, avatar upload with a default fallback, friends with online status, dedicated profile page                                                                  | pshcherb, akreise                                                                        |
| Artificial Intelligence    | AI Opponent                                           | Playable single-player AI mode (`ai.ts`), tuned to remain beatable rather than play perfectly, updated to work with the customized game (power-ups/obstacles)               | ebalana (initial), dcampas (tuning for customization)                                    |
| Gaming and user experience | Complete web-based game                               | Canvas-rendered Pong with clear rules, live matches and win/loss conditions                                                                                                 | dcampas (client engine), akreise (view), ebalana (server integration)                    |
| Gaming and user experience | Remote players                                        | Real online 1v1 over WebSockets: matchmaking queue, reconnect logic, disconnect timers                                                                                      | ebalana (foundation), pshcherb (persistence/race conditions), rmanzana (stability fixes) |

### Minor modules (1 pt each) — 6 × 1 = 6 pts

| Category                               | Module                                                | Implementation                                                                                                      | Contributor(s)                                     |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Web                                    | Use an ORM for the database                           | Prisma against PostgreSQL, schema-first migrations and a generated client                                           | pshcherb                                           |
| Accessibility and Internationalization | Multiple language support                             | i18next, 3 complete translations (English/Spanish/Latvian), UI language switcher, all user-facing text translatable | pshcherb (infra), akreise, rmanzana (translations) |
| User Management                        | Game statistics and match history                     | Per-user wins/losses/level (`Stats` model), match history, global leaderboard                                       | akreise                                            |
| User Management                        | Remote authentication (OAuth 2.0)                     | Google sign-in via Passport, linked to the same `User` model as local accounts                                      | pshcherb, rmanzana                                 |
| Gaming and user experience             | Tournament system                                     | Bracket generation, `round`/`bracketPosition` tracking on `Match`, matchmaking for participants                     | dcampas (engine), akreise (UI)                     |
| Gaming and user experience             | Game customization options                            | Obstacles, power-ups, paddle-speed variants, with default settings available                                        | dcampas, akreise                                   |
| Modules of choice                      | Zero-touch HTTPS, public exposure & secrets lifecycle | See justification below.                                                                                            | rmanzana                                           |

**Total: 23 points** (14 required + 9 above the minimum — capped at +5 as bonus per the subject's rules, for an effective maximum of 19).

**"Modules of choice" justification — Zero-touch HTTPS, public exposure & secrets lifecycle (Minor, 1pt):**

- **Why chosen**: none of the catalogue's Devops modules (ELK, Prometheus/Grafana, microservices) fit a 5-person team's actual pain point — getting HTTPS, a public URL and shared secrets working identically on five different laptops without a shared server or a paid domain.
- **What it does**: `scripts/createCertSSL.sh` generates a local self-signed cert automatically on first `make up`, so HTTPS works out of the box with zero manual steps; a Cloudflare Tunnel container (`cloudflared`, gated by a Docker Compose `profiles: [tunnel]`) exposes the same stack on a real public HTTPS domain (`transcendance.rmanzanas.com`) whenever `cloudflared/config.yml` is present, and is silently skipped otherwise — no separate terminal or manual tunnel command; `scripts/generateJwtSecrets.sh` idempotently fills in only missing/placeholder JWT secrets (never clobbering a secret a live server is already using, which would silently log everyone out and invalidate in-flight password-reset links) unless `--force` is passed; `scripts/packSecrets.sh` / `unpackSecrets.sh` bundle `.env` + the tunnel's private credentials into a password-protected zip (`zip -er`) for onboarding a new machine, with the password meant to travel over a different channel than the zip itself.
- **Technical challenges it addresses**: making the tunnel's container-internal networking (`service: https://nginx:443`, `noTLSVerify` for the self-signed hop) work correctly from inside Compose rather than from the host; avoiding accidental secret rotation that would silently break a teammate's already-running server; avoiding `.env`/tunnel credentials ever touching chat history in plaintext.
- **Value added**: every teammate goes from `git clone` to a working HTTPS instance, and can separately opt into a public URL and shared secrets, without any manual certificate, DNS or credential-sharing work — directly serving the mandatory HTTPS-everywhere and `.env`-based-credentials requirements (Chapter III) rather than just checking a box.
- **Why Minor, not Major**: it's real, multi-part engineering, but each individual piece (a cert-gen script, a Compose service, a zip-with-password script) is modest in isolation next to the other Majors in this table (a full game engine, a matchmaking system) — 1 point reflects that honestly.

Modules considered but **not** claimed, kept here for transparency rather than silently dropped: _Advanced chat features_ — block/invite/notify-from-chat exist, but there is no persisted `Message` model in the Prisma schema, so "chat history persistence" isn't met; _Custom-made design system_ — the shared `frontend/components/` folder holds 7 reusable components, short of the 10 required; _Gamification system_ — `Stats.level` and the leaderboard cover 2 of the ≥3 required mechanics (no achievements/badges/daily challenges); _Advanced analytics dashboard_ — the stats charts exist but without real-time updates, export, or date-range filtering.

---

## 9. Individual Contributions

### Polina Shcherbina (`pshcherb`) — Product Owner & Technical Lead

Authored the project's foundation: the NestJS + Prisma + Docker Compose + Nginx scaffold, the Prisma schema (`User`, `Match`, `Stats`, `Tournament`, `Friendship`), and the local + Google OAuth authentication flow with bcrypt-hashed passwords and JWT access/refresh tokens. Built the friends and presence system, the first working version of the live chat, the i18n infrastructure on both frontend and backend, and the public API module (Swagger docs, API-key guard, rate limiting). Also contributed the initial multiplayer persistence layer and fixed a JWT bypass in the WebSocket gateway.
_Likely challenges_: getting Prisma's generated client and migrations to behave reliably inside a Dockerized workspace (several "still problems with prisma"-style commits), and closing a real authentication bypass in the WebSocket layer discovered during testing.

### Raúl Manzanas Trillo (`rmanzana`) — Project Manager & DevOps

Owns the deployment story end to end: automated local HTTPS certificate generation, Nginx configuration, and the optional Cloudflare Tunnel setup, plus scripts (`generateJwtSecrets.sh`, `packSecrets.sh`, `unpackSecrets.sh`) to safely bootstrap and share secrets across teammates' machines. Implemented password recovery (`/forgot-password`, `/reset-password`, the mail service and its templates) and did the bulk of the late-stage cross-cutting polish: the dark/light theme switcher and a 15-variable CSS color system, chat unread badges and toast notifications, mobile/touchscreen fixes, and numerous Google OAuth and online-matchmaking stability fixes (stuck queues, ghost rooms, false "you lose" flashes). Also authored and repeatedly revised the team's setup documentation (`getting ready.md`).
_Likely challenges_: debugging intermittent online-matchmaking state bugs (ghost rooms from overlapping invites, stuck "looking for opponent" queues) that only surfaced under real concurrent use, and reconciling the Cloudflare Tunnel's container-internal networking with a locally self-signed certificate.

### Ernest Balana Gelpi (`ebalana`) — Developer, Backend / Real-Time Game Engine

Set up the initial WebSocket gateway with authentication and a matchmaking queue, then built the first server-side Pong engine (`pong-engine.ts`, `match.service.ts`) connecting it to the frontend for local, AI and online play, including the initial AI opponent logic. Also fixed Docker build issues in the backend `Dockerfile` and resolved merge conflicts across branches.
_Likely challenges_: designing a matchmaking/game-state model that could be driven authoritatively from the server while staying responsive over WebSockets, and untangling merge conflicts between parallel branches touching the same gateway file.

### David Campas (`dcampas`) — Developer, Frontend / Gameplay

Implemented the client-side Pong engine (`GameEngine.ts`): ball/paddle physics, dual control schemes (WASD and arrow keys), collision detection, scoring and win conditions. Extended it into local tournaments with bracket play, and added game customization — obstacles, power-ups and a faster-paddle variant — reworking `pong-engine.ts`, `TournamentView.tsx` and `renderer.ts` substantially in the process.
_Likely challenges_: keeping ball/paddle collision physics stable and fair once obstacles and power-ups were layered on top of the base engine, and synchronizing tournament bracket state with the rendering layer.

### Anna Kreise (`akreise`) — Developer, Frontend / UI-UX

Designed and built the majority of the application's page-level UI: login, registration, profile (with friends panel), chat, tournament view, and the stats/leaderboard dashboard (wiring up Chart.js). Delivered the project's responsive design across common breakpoints (1024/1440/1920 and mobile), the bouncing-ball landing-page animation, the privacy/terms pages, and translated several views. Iterated extensively on the game and tournament screens' visual design and end-game/countdown states.
_Likely challenges_: reconciling a fast-moving game canvas with a responsive layout that had to hold up from mobile to large desktop screens, and keeping multiple pages visually consistent while UI conventions (inputs, buttons) were still being finalized by other frontend contributors.

---

## 10. Resources

- [NestJS documentation](https://docs.nestjs.com/)
- [Next.js documentation](https://nextjs.org/docs)
- [Prisma documentation](https://www.prisma.io/docs)
- [Socket.IO documentation](https://socket.io/docs/v4/)
- [Passport.js documentation](http://www.passportjs.org/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
- [i18next documentation](https://www.i18next.com/)
- [Resend documentation](https://resend.com/docs)
- [Cloudflare Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- Project setup guide: [`getting ready.md`](getting%20ready.md)

### AI assistance disclosure

AI tools — **Claude** and **GitHub Copilot** — were used throughout development as assistants, not as authors of the project's design decisions:

- **This README** was generated with Claude by analyzing the team's actual Git history (commit authorship, messages and diffs) rather than written from a template, so that features, modules and individual contributions reflect what the repository shows.
- **Code completion**: GitHub Copilot was used for inline autocomplete of boilerplate (DTOs, repetitive React component structure, i18n JSON entries) during day-to-day coding.
- **Debugging & log analysis**: Claude was used to help interpret stack traces and NestJS/Prisma/WebSocket error output when diagnosing issues such as the JWT bypass, matchmaking race conditions and Prisma/Docker workspace errors referenced in the commit history above, and to help draft fixes that were then reviewed and adapted by the responsible teammate before committing.

All AI-assisted code and documentation was reviewed and adjusted by the team before being committed; AI tools did not make architectural or product decisions on their own.
