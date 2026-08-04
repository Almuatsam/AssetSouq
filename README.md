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

## Project Structure

```
AssetSouq/
  docs/       planning documents (PRD, TDD, schema, design brief, etc.)
  backend/    Express + TypeScript + Prisma API
  frontend/   React + TypeScript + Vite app
```

## Status

Early scaffold stage — see [06-Engineering-Plan.md](docs/06-Engineering-Plan.md)
for the phased build order (Phase 1: Foundation is in progress).
