# AssetSouq

IT Asset Disposal & Employee Raffle System — a web app for managing a
company's IT asset disposal process: eligible employees register interest
in available devices, an automated draw fairly selects a buyer at a fixed
price, and admins manage devices, registrations, winners, payments, and
reports.

See [`docs/`](docs/) for the full planning set:

- [01-PRD.md](docs/01-PRD.md) — product requirements & business rules
- [02-TDD.md](docs/02-TDD.md) — technical design & stack
- [03-App-Flow.md](docs/03-App-Flow.md) — employee/admin/draw flows
- [04-Backend-Schema.md](docs/04-Backend-Schema.md) — data model
- [05-Design-Brief.md](docs/05-Design-Brief.md) — visual design system
- [06-Engineering-Plan.md](docs/06-Engineering-Plan.md) — phased build plan

## Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui + React Router + TanStack Query + i18next
- **Backend**: Node.js + Express + TypeScript + Prisma ORM + MySQL + JWT
- **Auth**: JWT, role-based (Employee, Admin)

## Getting Started

### Database (local dev)

A `docker-compose.yml` at the repo root runs a throwaway MySQL container
for local development, so it doesn't touch any MySQL you already have
installed:

```bash
cp .env.example .env   # generate your own MYSQL_ROOT_PASSWORD / MYSQL_PASSWORD
docker compose up -d   # MySQL on localhost:3308 — see docker-compose.yml
                        # for why not 3306/3307 (both may already be in use)
```

Point `backend/.env`'s `DATABASE_URL` at the same credentials/port.
`prisma migrate dev` needs `CREATE DATABASE` privileges for its shadow
database, so grant the app user broader rights once (safe here — it's an
isolated dev-only container):

```bash
docker exec assetsouq-mysql-dev mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
  -e "GRANT ALL PRIVILEGES ON *.* TO 'assetsouq'@'%'; FLUSH PRIVILEGES;"
```

### Backend

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev             # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

### E2E tests (Playwright)

Critical-path browser tests live in `e2e/`, entirely separate from the
`frontend/`/`backend/` unit and integration suites (`npm test` in each).
They run against a dedicated `assetsouq_e2e` database on the same MySQL
container as local dev (never touches `assetsouq_dev`) and their own
backend/frontend instances on ports 4001/5174, so they can run alongside
an already-running dev environment without a port clash.

```bash
docker exec assetsouq-mysql-dev mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
  -e "CREATE DATABASE IF NOT EXISTS assetsouq_e2e;"

cd e2e
cp .env.e2e.example .env.e2e.local   # fill in real values
npm install
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` starts the backend and frontend for you (Playwright's
`webServer` config) and resets `assetsouq_e2e` to a clean, freshly-seeded
state before every run (see `global-setup.ts`) — no manual setup beyond
the database/env file above.

## Project Structure

```
AssetSouq/
  docs/       planning documents (PRD, TDD, schema, design brief, etc.)
  backend/    Express + TypeScript + Prisma API
  frontend/   React + TypeScript + Vite app
  e2e/        Playwright end-to-end tests (own package, own DB)
```

## Status

Phases 1-5 of [06-Engineering-Plan.md](docs/06-Engineering-Plan.md) are
built: Foundation, Employee Module, Admin Module, Draw Engine, and
Reports. Phase 6 (Testing) is in progress — unit/integration coverage is
enforced per-feature throughout (80%+ on all four metrics, both apps) and
critical-flow E2E coverage now exists in `e2e/`. Phase 7 (Deployment) is
not yet started.
