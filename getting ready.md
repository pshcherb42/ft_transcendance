# Getting ready — from a fresh clone to a running server

This is the order to follow on a brand-new machine (or after a `make defclean`)
to get everything — app, HTTPS, Google login, and the public tunnel — up and
running.

---

## Just want to run it locally, no tunnel needed?

If you're a teammate who just wants the app running on your own machine —
no cross-device access, no public URL — just do this, no need to
read the rest of the doc:

```bash
git clone <repo-url>
cd ft_transcendance
```

**Got a teammate's `.env` instead of starting from `.env.example`?** Save
it as your own `.env` right here, then run:

```bash
make jwt-secrets-force
```

This regenerates fresh `JWT_SECRET`/`JWT_REFRESH_SECRET`/`JWT_RESET_SECRET`
values just for you, overwriting whatever was in the file you were given —
everything else (Google OAuth, Resend key, DB creds) stays as-is. Safe to
run here since your server hasn't started yet — this file isn't "live" for
anyone. (Just don't run `jwt-secrets-force` again later on a `.env` your
*own* server is already running against — that rotates the secrets under
a live instance, logging you out and invalidating any reset link you've
just sent yourself.)

**Starting from scratch instead?**

```bash
make jwt-secrets      # creates .env from .env.example + fills in JWT secrets
```

Open `.env` and fill in the handful of values that can't be auto-generated
(DB password can be anything; Google OAuth Client ID/Secret — ask a
teammate for the shared ones, or set up your own; leave `RESEND_API_KEY`
as a placeholder unless you're specifically testing password recovery).

```bash
make install-deps     # once
make host-deps        # optional, editor autocomplete only
make                  # starts everything
```

Open **`https://localhost:8443`**. Done — `make` already handles the local
SSL cert on its own. The public tunnel is a Docker service that only starts
if this machine has a `cloudflared/config.yml` (see the full install
below) — without it, `make` just runs the app locally and skips the tunnel
entirely. Nothing to configure or disable.

---

# Full Install

## 0. Clone + `.env`

```bash
git clone <repo-url>
cd ft_transcendance
make jwt-secrets
```

`make jwt-secrets` creates `.env` from `.env.example` (if it doesn't exist
yet) and auto-generates real values for `JWT_SECRET`, `JWT_REFRESH_SECRET`,
and `JWT_RESET_SECRET` — but only fills in values that are still empty or a
`<placeholder>`, never overwrites a secret already in use. Add `-force`
(`make jwt-secrets-force`) if you deliberately want to rotate your own
already-set secrets. Fill in the rest of `.env` by hand (DB password,
Google OAuth credentials, etc.) — never commit this file.

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

## 3. Configure — SSL, the tunnel, Google OAuth

### 3.1 Local HTTPS cert

Handled automatically by `make up` (calls `scripts/createCertSSL.sh`) —
nothing to do here manually.

### 3.2 One-time Cloudflare Tunnel setup

_(Skip this whole section if the tunnel was already created before — see
step 3.2b to bring an existing one to a new machine instead.)_

The tunnel itself runs as a Docker service (the official `cloudflare/cloudflared`
image, wired up in [docker-compose.yml](docker-compose.yml)) — no binary to
download or install, on any OS. All it needs is a config folder. Creating
the tunnel in the first place, though, is a one-off interactive step (it
opens a browser to log in), so it's easiest done with the CLI directly:
`brew install cloudflared` on macOS, or `apt install cloudflared` /
the [official package](https://pkg.cloudflare.com/) on Ubuntu.

```bash
cloudflared tunnel login
cloudflared tunnel create transcendance
cloudflared tunnel route dns transcendance transcendance.rmanzanas.com
```

- `login` opens a browser to pick the `rmanzanas.com` domain.
- `create` prints a **tunnel ID** and writes credentials to
  `~/.cloudflared/<tunnel-id>.json` on your machine.
- `route dns` creates the CNAME for you automatically.

These commands write into `~/.cloudflared/` by default, but the Docker
service reads from a **project-local** folder instead, so move the two
files it just created into the repo:

```bash
mkdir -p cloudflared
cp ~/.cloudflared/config.yml cloudflared/
cp ~/.cloudflared/<tunnel-id>.json cloudflared/
```

`cloudflared/` is gitignored — **never commit anything in it**, the `.json`
file is the tunnel's private key. Then edit `cloudflared/config.yml` so it
matches the paths and hostnames as seen *from inside the container* rather
than from your host:

```yaml
tunnel: <the-tunnel-id-from-above>
credentials-file: /etc/cloudflared/<tunnel-id>.json  # container path, not host path

ingress:
  - hostname: transcendance.rmanzanas.com
    service: https://nginx:443     # nginx's own container, not localhost
    originRequest:
      noTLSVerify: true            # local cert is self-signed, this hop never leaves the compose network
  - service: http_status:404
```

From here on, `make` starts the tunnel automatically (see step 4) — there's
no separate `make tunnel` step or terminal to keep open.

### 3.2b Bringing an already-created tunnel to a new machine

Whoever already has the tunnel set up can hand you `cloudflared/` and
`.env` together as a password-protected zip instead of you redoing any of
the above:

```bash
# they run, on their machine:
make pack-secrets                 # -> ~/Desktop/ft_transcendance_secrets.zip

# you run, after git clone, on yours:
make unpack-secrets ZIP=~/Downloads/ft_transcendance_secrets.zip
```

Share the zip and its password through **different channels** (e.g. the
zip over chat, the password read out loud) — that's what makes the
password protection actually worth something. Don't run
`tunnel create`/`route dns` yourself in this case — that would create a
second, different tunnel instead of reusing this one.

### 3.3 `.env` — point the app at the public domain

```
FRONTEND_URL=https://transcendance.rmanzanas.com
GOOGLE_CALLBACK_URL=https://transcendance.rmanzanas.com/api/auth/google/callback
```

### 3.4 Google Cloud Console

- **Clients** → your OAuth client → **Authorized redirect URIs**: add
  `https://transcendance.rmanzanas.com/api/auth/google/callback`
- Same client → **Authorized JavaScript origins**: add
  `https://transcendance.rmanzanas.com`
- **Branding** → **Authorized domains**: add `rmanzanas.com`

### 3.5 Backend CORS — ✅ done

[backend/src/websockets/websockets.gateway.ts](backend/src/websockets/websockets.gateway.ts#L36-L45)'s
`allowed` origin check now includes a line for
`https://transcendance.rmanzanas.com` — chat/game sockets work fine over
the tunnel. Nothing left to do here; kept as a note in case this domain
ever changes.

### 3.6 Password recovery — needs `RESEND_API_KEY` + `JWT_RESET_SECRET`

The feature itself is fully built (`/forgot-password` → email → `/reset-password`),
this is just the account/DNS setup, same category of one-time task as the
tunnel:
- Sign up at [resend.com](https://resend.com), grab an API key → `RESEND_API_KEY` in `.env`.
- `JWT_RESET_SECRET` is already generated by `make jwt-secrets` (step 0).
- Without any further setup, Resend only lets you send to the email address
  you signed up with. To send to anyone else, verify a domain (e.g.
  `mail.rmanzanas.com`) in Resend's dashboard — it gives you a couple of
  DNS TXT records to add via Cloudflare, same mechanism as the tunnel's
  CNAME. Once verified, update the `from` address in
  `backend/src/auth/mail.service.ts` to use that domain.

---

## 4. `make`

Builds/starts everything (`docker compose up`), generating the local SSL
cert on the way if it's missing:

```bash
make
```

If `cloudflared/config.yml` exists in the project (step 3.2 or 3.2b), the
tunnel container starts right along with it, in the same terminal — no
second terminal, no separate `make tunnel` step. If that file doesn't
exist, the tunnel is skipped entirely and the app just runs locally.

---

## Done — where to check it worked

- `https://localhost:8443` → works from the machine actually running Docker.
- `https://transcendance.rmanzanas.com` → works from **any** computer, as
  long as `make` is running on the machine that has `cloudflared/config.yml`
  set up — the tunnel starts automatically as part of the stack.
- Google login works from either URL, as long as step 3.4 was done.
- Password recovery (`/forgot-password` → email → `/reset-password`) works
  once step 3.6 is done — test with the Resend account's own email first,
  since sending to other addresses needs the domain verified.

## Quick reference

| Step                             | Command                                     | One-time or every session?                   |
| -------------------------------- | -------------------------------------------- | --------------------------------------------- |
| Install deps                     | `make install-deps`                         | Once (or after dependency changes)            |
| Editor types                     | `make host-deps`                            | Once (or after dependency changes)            |
| Create `.env` + JWT secrets      | `make jwt-secrets`                          | Once per machine                              |
| Rotate your own JWT secrets      | `make jwt-secrets-force`                    | Only when you deliberately want to            |
| Cloudflare tunnel setup          | `cloudflared tunnel login/create/route dns` | Once ever, per tunnel                         |
| Share the tunnel + `.env`        | `make pack-secrets` / `make unpack-secrets` | Once per new teammate/machine                 |
| `.env` + Google Console + CORS   | manual                                      | Once ever, per domain                         |
| Resend + `JWT_RESET_SECRET`      | see step 3.6                                | Once ever                                     |
| Run the app (+ tunnel if set up) | `make`                                      | Every session                                 |

---

## Fast guide — full setup, no explanations

1. `git clone <repo-url> && cd ft_transcendance`
2. `make jwt-secrets`
3. Fill in the rest of `.env` (DB password, Google OAuth, `RESEND_API_KEY`)
4. `make install-deps`
5. `make host-deps`
6. One-time tunnel setup:
   - New tunnel: `cloudflared tunnel login/create/route dns`, then copy the
     resulting `config.yml` + `<tunnel-id>.json` into `./cloudflared/` and
     adjust `service:`/`credentials-file:` for the container (see 3.2).
   - Existing tunnel: `make unpack-secrets ZIP=...` instead, skip to step 9.
7. Set `.env`: `FRONTEND_URL` and `GOOGLE_CALLBACK_URL` to the tunnel domain
8. Google Console: add redirect URI + JS origin + authorized domain
9. Resend: verify `mail.rmanzanas.com`, set `RESEND_API_KEY`, update the
   `from` address in `mail.service.ts` if it changed
10. `make` (tunnel starts automatically since `cloudflared/config.yml` exists)
