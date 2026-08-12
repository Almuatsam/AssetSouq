# Deployment

Phase 7 of [06-Engineering-Plan.md](06-Engineering-Plan.md): a self-hosted
Docker Compose stack — Caddy (TLS) → frontend (nginx, serves the built
SPA + proxies `/api`) → backend (Node/Express) → MySQL — matching the
stack [02-TDD.md](02-TDD.md) names ("Docker + Nginx"). Everything below
was built and verified end-to-end against a real local Docker Desktop
instance, not written and left untested.

This is entirely separate infrastructure from local dev
([README.md](../README.md)'s "Getting Started") and from the E2E test
stack (`e2e/`'s own dedicated database and ports) — none of the three
share a database, and (see the warning below) none of them may ever be
allowed to share a Docker Compose *project name* either.

## ⚠️ Docker Compose project-name isolation — read this first

`docker-compose.prod.yml` sets an explicit top-level `name:
assetsouq-prod`. **Do not remove it, and give any future compose file in
this repo an equally explicit, equally distinct name.**

Compose decides "does a container for this service already exist?" by
`(project name, service name)` — not by `container_name`. Without an
explicit `name:`, Compose derives the project name from the current
directory, which is identical for every compose file in this repo (they
all live at the repo root). `docker-compose.yml` (dev) and
`docker-compose.prod.yml` (prod) both define a `mysql` service; an
unnamed prod file would make Compose treat dev's and prod's `mysql`
services as *the same one* — a `docker compose -f docker-compose.prod.yml
up mysql` would find dev's already-running container by that shared
`(project, service)` identity and **recreate it** using prod's
image/environment/volume, discarding dev's `container_name` override and
handing dev's actual database volume to the prod stack.

This is not a hypothetical: it happened once while building this guide.
Recovered with zero data loss only because MySQL's entrypoint script
leaves an already-initialized (non-empty) data directory alone on
restart, regardless of what `MYSQL_ROOT_PASSWORD` a new container
definition supplies — but the container's identity, port mapping, and
which compose file "owned" it were all wrong until manually fixed. Don't
rely on that same lucky escape twice.

## Prerequisites

- A Linux host (or any Docker-capable host) with Docker Engine + the
  Compose plugin installed.
- A domain name pointed at that host, if you want real (not self-signed)
  TLS — see "TLS" below.
- Ports 80 and 443 reachable from the internet (Caddy's ACME HTTP
  challenge needs port 80 even if you only ever intend to serve 443).

## First deploy

```bash
git clone <this repo> assetsouq && cd assetsouq
cp .env.production.example .env.production
# Fill in every value in .env.production — especially MYSQL_ROOT_PASSWORD
# and MYSQL_PASSWORD (generate with `openssl rand -hex 24`, not -base64 —
# see that file's own comment on why), JWT_SECRET (`openssl rand -base64
# 48` is fine here, it's never embedded in a URI), DOMAIN, and
# TRUST_PROXY (see that file's own comments — TRUST_PROXY=2 is correct
# for this exact stack's two reverse-proxy hops; get this wrong and the
# login rate limiter either collapses every visitor into one shared
# bucket or becomes bypassable via a spoofed header).

# Start the database first, on its own, so the next step has something
# to migrate against.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d mysql

# Apply the schema. Deliberately a separate, explicit step (the "migrate"
# service is excluded from `up`'s default profile) — never something
# that silently re-runs on every restart or races itself if this stack
# is ever scaled to multiple backend replicas.
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate

# `prisma migrate deploy` (the command above) does not run the
# configured seed the way `migrate dev`/`migrate reset` do — run it
# explicitly, once, to create the bootstrap admin from
# SEED_ADMIN_USERNAME/SEED_ADMIN_PASSWORD:
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate npx prisma db seed

# Start everything else.
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

# Verify:
curl -sk https://<your-domain>/api/health
```

Log in as the bootstrap admin and **rotate that password immediately** —
`SEED_ADMIN_PASSWORD` only needs to be strong enough to survive the
window between seeding and your first login.

## Redeploying (a new version)

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build backend frontend
# If this release includes a migration:
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend frontend
```

There's no zero-downtime rolling deploy here (a single `backend`
replica, `restart: unless-stopped`) — `up -d` briefly stops and restarts
the container. The graceful-shutdown handling in `backend/src/server.ts`
(catches `SIGTERM`, finishes in-flight requests, closes the Prisma
connection before exiting) keeps that brief window clean rather than
cutting requests off mid-response, but there is still a window. Fine for
this app's expected traffic; revisit with multiple replicas + a load
balancer if that ever stops being true.

## Environment reference

See `.env.production.example` for the full list with inline comments.
The ones worth calling out specifically, several of which were flagged
by this project's own security audit as needing a deliberate,
non-default value before real traffic:

| Variable | Why it matters here |
|---|---|
| `TRUST_PROXY` | Must equal the reverse-proxy hop count (`2` for this exact Caddy→nginx→backend stack) — see the warning in `backend/src/config/env.ts`. |
| `CORS_ORIGIN` | Deliberately unset in `.env.production.example` — `frontend/nginx.conf` reverse-proxies `/api` same-origin, so no cross-origin request (and therefore no CORS config) is ever involved in this topology. Only set it if the backend is ever deployed separately from that `nginx.conf`. |
| `JWT_SECRET` | Generate a real random value (`openssl rand -base64 48`); never reuse `backend/.env.example`'s dev placeholder. No rotation mechanism exists yet — rotating it invalidates every currently-issued token, which is otherwise fine (see the "no token revocation" note below). |
| `MYSQL_ROOT_PASSWORD` / `MYSQL_PASSWORD` | Real random values — `openssl rand -hex 24`, not `-base64` (see "Troubleshooting" below for why `MYSQL_PASSWORD` specifically needs to stay URL-safe). These end up in `.env.production`, which must never be committed (it's `.gitignore`d, but double-check before ever changing that file). |

### Known, accepted tradeoffs carried into production

Already documented at their source, repeated here since they're the
kind of thing a deployment checklist should surface, not just the code:

- **No server-side JWT revocation** (`backend/src/utils/jwt.ts`) — a
  copied/exfiltrated token stays valid until it naturally expires
  (`JWT_EXPIRES_IN`, 8h default). "Logging out" only clears the token
  client-side.
- **Employee login has no password** (`backend/src/services/authService.ts`)
  — staff-ID-only, an accepted MVP tradeoff per the PRD. Combined with
  the point above, a leaked employee JWT is the single point of failure
  for that identity until it expires.

## Backups

`scripts/backup.sh` dumps the database (gzip-compressed,
`--single-transaction` so it doesn't lock tables or need a maintenance
window) to `./backups/assetsouq-<timestamp>.sql.gz` and prunes anything
older than `RETENTION_DAYS` (default 14). `scripts/restore.sh` reverses
it — destructive, requires typing the database name to confirm.

```bash
./scripts/backup.sh                    # ad-hoc
RETENTION_DAYS=30 ./scripts/backup.sh   # override retention
./scripts/restore.sh ./backups/assetsouq-20260101T000000Z.sql.gz
```

Recommended: a daily cron job, and copy backups off the host — a backup
living on the same disk as the database it's backing up doesn't survive
that disk failing.

```cron
# /etc/cron.d/assetsouq-backup — daily at 02:00, as whatever user has
# docker compose access
0 2 * * * cd /path/to/assetsouq && ./scripts/backup.sh >> /var/log/assetsouq-backup.log 2>&1
```

## Monitoring

- **Health checks**: every container in `docker-compose.prod.yml` has a
  `HEALTHCHECK` (`docker compose ps` shows the status directly); the
  backend's own is the same `GET /api/health` endpoint used everywhere
  else in this project (E2E's `webServer` readiness check, etc.).
- **External uptime monitoring**: point any external checker (e.g.
  UptimeRobot, Healthchecks.io, a cron'd `curl` + alert) at
  `https://<your-domain>/api/health` — this is the one endpoint every
  layer of the stack (Caddy → nginx → backend → MySQL, since the
  handler's dashboard-adjacent queries touch the DB) has to be healthy
  for.
- **Logs**: every container logs to stdout/stderr (Docker's own
  convention) — `docker compose -f docker-compose.prod.yml logs -f
  [service]`. No structured/shipped logging is set up; for anything past
  occasional manual `logs` inspection, point Docker's logging driver at
  whatever log aggregation you already run, rather than adding an
  in-app logging library.
- **Disk space**: the MySQL volume and `./backups/` are the two things
  that grow unbounded on the host — worth an alert on host disk usage,
  not just container health.

## TLS

Caddy (`Caddyfile`) requests and auto-renews a Let's Encrypt certificate
for whatever `DOMAIN` is set to, the first time it starts with that
domain reachable on port 80. A bare IP or `localhost` gets a self-signed
certificate instead (what this guide's own end-to-end verification used
— browsers will warn, `curl` needs `-k`).

## Database migrations in general

`prisma migrate deploy` (used by the `migrate` service) only applies
migrations that already exist in `backend/prisma/migrations/` — it never
generates new ones. Generate new migrations locally during development
(`npm run prisma:migrate`, i.e. `prisma migrate dev`, against your local
dev database), commit the resulting `migrations/` directory, then deploy
and run the `migrate` step above as part of the redeploy process.

## Troubleshooting

Two real issues hit while validating this guide end-to-end, kept here
since they're easy to hit again:

- **`https://<domain>/` refuses to connect at all.** Almost always means
  the stack (or at least the `caddy` service) was never actually started
  — check `docker compose --env-file .env.production -f
  docker-compose.prod.yml ps` first; if a service is missing entirely
  rather than unhealthy, the `up -d` step either wasn't run yet or
  errored partway through (scroll up in its output, or check `docker
  compose ... logs caddy`).
- **`migrate` fails with `P1013: invalid port number in database URL`**,
  even though `DATABASE_URL` "looks" fine. `DATABASE_URL` is a real URI —
  a `MYSQL_PASSWORD` generated with `openssl rand -base64` (or any
  base64 generator) can contain a `/`, which Prisma's URL parser reads as
  a path separator instead of part of the password, corrupting
  everything after it including the port. Use `openssl rand -hex 24`
  (or the Node one-liner in `.env.production.example`) instead — hex
  output has no characters that need escaping in a URI. If you're stuck
  with a password that does contain `/`, `@`, or `:`, percent-encode
  just those characters in `DATABASE_URL` itself (`/` → `%2F`, etc.) —
  leave the plain `MYSQL_PASSWORD` value un-encoded, that one isn't a URI.
