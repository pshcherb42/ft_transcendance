# ft_transcendance — Setup Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git
- Node.js 20+

---

## First-time setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd ft_transcendance
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in your values. Never commit this file.

```env
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=transcendence
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/transcendence
JWT_SECRET=changeme
NEXTAUTH_SECRET=changeme
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=
```

### 3. Start the stack

```bash
docker compose up --build
```

This builds and starts all four containers:

| Container | What it is       | Port |
|-----------|-----------------|------|
| frontend  | Next.js app     | 3000 |
| backend   | NestJS API      | 3001 |
| db        | PostgreSQL 16   | 5432 |
| nginx     | Reverse proxy   | 443  |

### 4. Run the database migration

In a separate terminal, run:

```bash
docker compose exec backend npx prisma migrate dev --name init
```

This creates all the tables in the database. Only needed once on first setup, or whenever the Prisma schema changes.

### 5. Open the app

Go to **https://localhost** in your browser.

You will see a security warning because the SSL cert is self-signed. This is expected in local dev:
- **Chrome**: click anywhere and type `thisisunsafe`
- **Firefox**: click "Advanced" → "Accept the Risk and Continue"
- **Safari**: click "Show Details" → "visit this website"

---

## Daily workflow

```bash
# Start everything
docker compose up

# Stop everything
docker compose down

# Rebuild after dependency changes
docker compose up --build
```

---

## Branch strategy

```
main        ← only working, tested code — never push directly
dev         ← integration branch — merge your features here
feature/*   ← your daily work goes here
```

### Working on a feature

```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# ... do your work ...

git add .
git commit -m "describe what you did"
git push origin feature/your-feature-name
```

Then open a Pull Request from `feature/your-feature-name` → `dev`.

---

## Prisma — schema changes

If you change `backend/prisma/schema.prisma`, run a new migration:

```bash
docker compose exec backend npx prisma migrate dev --name describe-your-change
```

Always do this inside the Docker container — Prisma needs to reach the `db` service by hostname, which only works inside the Docker network.

---

## Ports at a glance

| URL                        | What you see         |
|---------------------------|---------------------|
| https://localhost          | App (via nginx)     |
| http://localhost:3000      | Frontend direct     |
| http://localhost:3001      | Backend API direct  |
| localhost:5432             | PostgreSQL (DB GUI) |

---

## Troubleshooting

**Docker won't start**
→ Open Docker Desktop and wait for the whale icon to stop animating.

**Port already in use**
→ `docker compose down` then `docker compose up` again.

**Database connection error**
→ Make sure `docker compose up` is running before you run any Prisma commands.

**Changes not showing up**
→ `docker compose up --build` to force a rebuild.

**SSL warning in browser**
→ Expected. See step 5 above.
---

## Pages

| URL                        | Description                                      | Owner    |
|---------------------------|--------------------------------------------------|----------|
| https://localhost/         | Landing / home page                              | —        |
| https://localhost/login    | Login and registration — OAuth + JWT auth        | Person B |
| https://localhost/game     | Pong game canvas — real-time multiplayer         | Person C |
| https://localhost/profile  | User profile — stats, match history, avatar      | Person E |
