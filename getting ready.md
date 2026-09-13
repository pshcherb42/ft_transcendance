# Getting ready — from a fresh clone to a running server

This is the order to follow on a brand-new machine (or after a `make fclean`)
to get everything — app, HTTPS, Google login, and the public tunnel — up and
running.

---

## 0. Clone + `.env`

```bash
git clone <repo-url>
cd ft_transcendance
cp .env.example .env
```
Fill in `.env` with real values (DB password, `JWT_SECRET`, Google OAuth
credentials, etc.) — never commit this file.

---

## 1. `make install-deps`

Installs the backend's npm packages **inside** the Docker container, then
generates the Prisma client and runs the DB migrations.
```bash
make install-deps
```
Only needed once, or again after `package.json` changes / a `make fclean`.

---

## 2. `make host-deps`

Installs `node_modules` on your actual machine (not in Docker) — this is
just so your editor gets autocomplete/type-checking. Doesn't affect what
actually runs.
```bash
make host-deps
```

---

## 3. `make cloudflared`

Downloads the `cloudflared` binary into the project root (gitignored) if
it's not already there — no root/sudo needed. On macOS it just tells you to
`brew install cloudflared` instead.
```bash
make cloudflared
```

This step only gets you the *binary*. The tunnel itself still needs a
one-time setup per Cloudflare account (see step 4).

---

## 4. Configure — SSL, the tunnel, Google OAuth

### 4.1 Local HTTPS cert
Handled automatically by `make up` (calls `scripts/createCertSSL.sh`) —
nothing to do here manually.

### 4.2 One-time Cloudflare Tunnel setup
*(Skip this whole section if the tunnel was already created before — see
step 4.2b to just bring an existing one to a new machine.)*

```bash
./cloudflared tunnel login
./cloudflared tunnel create transcendance
./cloudflared tunnel route dns transcendance transcendance.rmanzanas.com
```
- `login` opens a browser to pick the `rmanzanas.com` domain.
- `create` prints a **tunnel ID** and writes credentials to
  `~/.cloudflared/<tunnel-id>.json` — **never commit this file**, it's the
  tunnel's private key.
- `route dns` creates the CNAME for you automatically.

Then write `~/.cloudflared/config.yml`:
```yaml
tunnel: <the-tunnel-id-from-above>
credentials-file: /home/you/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: transcendance.rmanzanas.com
    service: https://localhost:8443
    originRequest:
      noTLSVerify: true   # local cert is self-signed, this hop is local anyway
  - service: http_status:404
```

### 4.2b Bringing an already-created tunnel to a new machine
Just copy two files into `~/.cloudflared/` on the new machine:
- `<tunnel-id>.json` (the credentials file)
- `config.yml`

Don't run `tunnel create`/`route dns` again — that would create a second,
different tunnel instead of reusing this one.

### 4.3 `.env` — point the app at the public domain
```
FRONTEND_URL=https://transcendance.rmanzanas.com
GOOGLE_CALLBACK_URL=https://transcendance.rmanzanas.com/api/auth/google/callback
```

### 4.4 Google Cloud Console
- **Clients** → your OAuth client → **Authorized redirect URIs**: add
  `https://transcendance.rmanzanas.com/api/auth/google/callback`
- Same client → **Authorized JavaScript origins**: add
  `https://transcendance.rmanzanas.com`
- **Branding** → **Authorized domains**: add `rmanzanas.com`

### 4.5 Backend CORS — ⚠️ not done yet, still needs this code change
[backend/src/websockets/websockets.gateway.ts](backend/src/websockets/websockets.gateway.ts#L36-L45)
only allows `localhost`, raw IPs, or dot-less hostnames as WebSocket
origins — a real domain like `transcendance.rmanzanas.com` currently gets
**blocked**, which would break chat and the game over the tunnel. Add one
line to the `allowed` check:
```ts
const allowed =
  /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
  /^https:\/\/transcendance\.rmanzanas\.com$/.test(origin) ||   // <-- add this
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
  ...
```

---

## 5. `make tunnel`

Run in its own terminal — starts (or re-downloads if missing) `cloudflared`
and connects the tunnel:
```bash
make tunnel
```
Leave this running the whole time you want the app reachable from outside.

---

## 6. `make`

In another terminal — builds/starts everything (`docker compose up`),
generating the local SSL cert on the way if it's missing:
```bash
make
```

---

## Done — where to check it worked

- `https://localhost:8443` → works from the machine actually running Docker.
- `https://transcendance.rmanzanas.com` → works from **any** computer, once
  `make tunnel` is running on the machine hosting the app.
- Google login works from either URL, as long as step 4.4 was done.

## Quick reference

| Step | Command | One-time or every session? |
|---|---|---|
| Install deps | `make install-deps` | Once (or after dependency changes) |
| Editor types | `make host-deps` | Once (or after dependency changes) |
| Get cloudflared | `make cloudflared` | Once per machine |
| Cloudflare tunnel setup | `cloudflared tunnel login/create/route dns` | Once ever, per tunnel |
| `.env` + Google Console + CORS | manual | Once ever, per domain |
| Run the tunnel | `make tunnel` | Every session |
| Run the app | `make` | Every session |
