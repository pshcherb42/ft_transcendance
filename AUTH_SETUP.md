# Auth System — Setup & Reference

This document covers everything a teammate needs to know to work with the auth system in ft_transcendence.

---

## Quick Start

```bash
cp .env.example .env
# Fill in the required values (see Environment Variables below)
npm install
docker compose up --build
docker compose exec backend npx prisma generate
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm install passport-google-oauth20
docker compose exec backend npm install --save-dev @types/passport-google-oauth20
docker compose exec frontend npm install browser-image-compression
```

The app runs at **http://localhost:8080**

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Database
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=transcendence
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/transcendence

# JWT — generate two strong random strings, e.g. openssl rand -hex 32
JWT_SECRET=<your_secret>
JWT_REFRESH_SECRET=<your_refresh_secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Backend port
PORT=3001

# Google OAuth — see "Google OAuth Setup" section below
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
```

**Important:** every key must appear exactly once. Duplicate keys silently override each other and cause hard-to-debug auth failures.

---

## Architecture Overview

```
Browser
  │
  ▼
nginx :8080          ← single entry point
  ├── /api/*  →  NestJS backend :3001
  └── /*      →  Next.js frontend :3000

NestJS backend
  ├── /auth/*         ← AuthController
  └── /users/*        ← UsersController
        └── Prisma → PostgreSQL
```

Avatars are stored as compressed base64 strings directly in the `User.avatar` column — no disk storage, no S3, no file serving needed.

---

## Auth Endpoints

All backend routes are prefixed with `/api` by nginx.

### Register
```
POST /api/auth/register
Content-Type: application/json

{ "email": "user@example.com", "username": "myname", "password": "mypassword" }
```
Returns: `{ accessToken, refreshToken }`

### Login
```
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "mypassword" }
```
Returns: `{ accessToken, refreshToken }`

### Refresh tokens
```
POST /api/auth/refresh
Content-Type: application/json

{ "refresh_token": "<refreshToken>" }
```
Returns: `{ accessToken, refreshToken }` — both tokens rotate on every refresh.

### Logout
```
POST /api/auth/logout
Authorization: Bearer <accessToken>
```
Clears the stored refresh token hash from the DB.

### Google OAuth
```
GET /api/auth/google
```
Redirects the browser to Google's consent screen. After the user approves, Google redirects to `/api/auth/google/callback`, which issues tokens and redirects the browser to:
```
http://localhost:8080/auth/callback?accessToken=...&refreshToken=...
```
The frontend `/auth/callback` page reads those query params, stores the tokens, and redirects to `/`.

---

## User Endpoints

All routes require `Authorization: Bearer <accessToken>`.

### Get current user
```
GET /api/users/me
```
Returns a sanitized user object — no `password` or `refreshToken` fields:
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "myname",
  "avatarPath": "data:image/jpeg;base64,...",
  "hasPassword": true,
  "createdAt": "2026-06-25T..."
}
```

`avatarPath` is a base64 data URL — use it directly as an `<img src>`.  
`hasPassword` is `false` for Google OAuth users (they have no local password).

### Update profile
```
PUT /api/users/me
Content-Type: application/json
Authorization: Bearer <accessToken>

{
  "username": "newname",          // optional
  "currentPassword": "oldpass",   // required only when changing password
  "newPassword": "newpass"        // optional, min 8 chars
}
```
Username: 3–20 chars, letters/numbers/underscores only.  
Password change: requires `currentPassword`. Rejected for Google OAuth accounts.

### Upload avatar
```
POST /api/users/me/avatar
Content-Type: application/json
Authorization: Bearer <accessToken>

{ "avatar": "data:image/jpeg;base64,..." }
```
The frontend compresses the image client-side with `browser-image-compression` before sending. Max accepted size: ~800 KB after compression.

### Get any user by ID
```
GET /api/users/:id
Authorization: Bearer <accessToken>
```

---

## Frontend Auth

### Token storage
Tokens are stored in `localStorage` via `frontend/app/lib/auth.ts`. Keys: `access_token`, `refresh_token`.

### Authenticated fetch
Use `apiFetch` from `frontend/app/lib/api.ts` for all backend calls — it attaches the Bearer token automatically and retries once on 401 (refreshes tokens, then retries the original request). If refresh also fails, it clears tokens and redirects to `/login`.

```ts
import { apiFetch } from '@/app/lib/api';

const res = await apiFetch('/users/me');
const user = await res.json();
```

### Auth context
`useAuth()` from `context/AuthContext.tsx` gives any component:

```ts
const { user, loading, login, logout, refetchUser } = useAuth();
```

- `user` — sanitized user object, or `null` if not logged in
- `loading` — true while the initial `/users/me` check is in flight
- `login(accessToken, refreshToken)` — stores tokens, fetches user, updates state
- `logout()` — clears tokens, resets user to null
- `refetchUser()` — re-fetches `/users/me` and updates state (call after profile edits)

### Protecting a page
```tsx
useEffect(() => {
  if (!loading && !user) router.replace('/login');
}, [loading, user, router]);
```

---

## Google OAuth Setup

To enable Google login you need credentials from Google Cloud Console.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select an existing one)
3. **APIs & Services → OAuth consent screen**
   - User type: External
   - Fill in app name and your email
   - Scopes: add `email` and `profile`
   - Test users: add your own Gmail address (required while in Testing mode)
4. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:8080/api/auth/google/callback`
   - Click Create — copy the Client ID and Client Secret
5. Paste both into `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:8080/api/auth/google/callback
   ```
6. Restart: `docker compose restart backend`

Google OAuth users are created with `password: null` — they cannot log in via the local email/password form, and the password change section is hidden on their profile page.

---

## Database Schema (auth-relevant fields)

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  username     String    @unique
  password     String?   // bcrypt hash; null for OAuth users
  avatar       String?   // base64 data URL
  refreshToken String?   // bcrypt hash of the current refresh token
  createdAt    DateTime  @default(now())
}
```

After any schema change:
```bash
docker compose exec backend npx prisma migrate dev --name <describe_change>
docker compose exec backend npx prisma generate
docker compose up --build
```

---

## Running Migrations on a Fresh Environment

```bash
docker compose up --build
docker compose exec backend npx prisma migrate deploy
```

`migrate deploy` applies existing migrations without creating new ones — use this in fresh environments. Use `migrate dev` only when you've changed `schema.prisma` and want to create a new migration.

---

## Common Issues

**`password authentication failed for user "postgres"`**  
Duplicate `DATABASE_URL` or `DB_PASSWORD` in `.env`. Each key must appear exactly once, and the password must match what the Postgres volume was initialized with. If in doubt: `docker compose down -v` and start fresh.

**`Cannot find module 'browser-image-compression'`**  
The package must be in `frontend/package.json` dependencies. Run `docker compose up --build` — installing it with `npm install` inside the running container doesn't persist across rebuilds.

**`413 Payload Too Large` on avatar upload**  
nginx has a default 1 MB body limit. The nginx config already sets `client_max_body_size 5m`. If you see this, make sure your local nginx config has that line in the `server` block and restart: `docker compose restart nginx`.

**Google OAuth `redirect_uri_mismatch`**  
The URI in Google Cloud Console must exactly match `GOOGLE_CALLBACK_URL` in `.env`. Both must be `http://localhost:8080/api/auth/google/callback` (note: http, not https, for local dev).