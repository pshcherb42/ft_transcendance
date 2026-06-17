# ft_transcendance — Setup Guide

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git
- Node.js 20+ -> No necesary. Everything is in a container.

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

DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}

PORT=3001

JWT_SECRET=XXXXXX
JWT_REFRESH_SECRET=XXXXXX

GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

FORTYTWO_CLIENT_ID=xxx
FORTYTWO_CLIENT_SECRET=xxx
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


### 6.Acces Aplication Test (Thunder Client)

Look at the Extension for Thunder Client, install.
Open it and do a New Request
Then test the following:

🔹 Register User
POST:   http://localhost:3001/auth/register
Body:
{
  "email": "test@test.com",
  "username": "testuser",
  "password": "12345678"
}

🔹 Login
POST http://localhost:3001/auth/login
Body:

{
  "username": "testuser",
  "password": "12345678"
}

Response:

{
  "accessToken": <TOKEN>
  "refreshToken": <TOKEN>
}

Copy the tokens

🔹 Protected Route
GET http://localhost:3001/users/me
Headers:
Authorization: Bearer <TOKEN>

🔹 Refresh Token
POST /auth/refresh
Headers:
Authorization: Bearer <REFRESH_TOKEN>


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
