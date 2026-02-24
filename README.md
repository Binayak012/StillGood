# StillGood

StillGood is a full-stack prototype for reducing household food waste by tracking freshness, generating "use soon" alerts, and suggesting recipes from expiring items.

## Scope
- Included: authentication, household inventory, freshness engine, alerts, recipes, analytics, integrations placeholder UI.
- Explicitly out of scope: FreshEye hardware integration (text-only placeholder only).

## Tech Stack
- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Database: SQLite + Prisma schema/client
- Auth: email/password, bcrypt hashing, JWT HttpOnly cookie session
- Monorepo: `client/` and `server/` via pnpm workspaces

## Project Structure
```text
.
├── client
│   └── src
├── server
│   ├── prisma
│   │   ├── schema.prisma
│   │   ├── migrations
│   │   └── seed.ts
│   ├── scripts
│   ├── src
│   └── tests
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites
- Node.js 22+ (tested in this workspace with Node 24)
- pnpm

If pnpm is missing:
```bash
npm install -g pnpm
```

## Install
```bash
pnpm install
```

## Configure Environment
Create `server/.env` from `server/.env.example`:
```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev-only-secret"
PORT=4000
CLIENT_ORIGIN="http://localhost:5173"
```

## Database Setup
1. Apply migrations:
```bash
pnpm --filter server prisma:migrate
```
2. Seed sample data:
```bash
pnpm --filter server prisma:seed
```

Seeded demo credentials:
- Email: `demo@stillgood.local`
- Password: `Demo123!`

## Run (Client + Server)
```bash
pnpm dev
```

- Client: `http://localhost:5173`
- Server API: `http://localhost:4000/api`

## Scripts
- Lint all:
```bash
pnpm -r lint
```
- Test all:
```bash
pnpm -r test
```
- Build all:
```bash
pnpm -r build
```

## Implemented API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`

### Households
- `POST /api/households`
- `POST /api/households/join`
- `GET /api/households/me`
- `POST /api/households/invite`
- `GET /api/households/members`
- `DELETE /api/households/members/:userId` (owner only)

### Items
- `GET /api/items?status=active|archived`
- `POST /api/items`
- `PATCH /api/items/:id`
- `DELETE /api/items/:id`
- `POST /api/items/:id/open`
- `POST /api/items/:id/consume`

### Alerts
- `GET /api/alerts`
- `POST /api/alerts/:id/read`
- `POST /api/alerts/run`

### Analytics
- `GET /api/analytics/summary`
- `GET /api/analytics/events?range=week|month`

### Recipes
- `GET /api/recipes/suggestions`

### Integrations Placeholder
- `GET /api/integrations/status`

## Testing Coverage
- Freshness engine unit tests:
  - opened vs unopened logic
  - custom override logic
  - no-extension clamp on open
  - status thresholds
  - confidence heuristic
- Basic API integration tests:
  - auth session flow
  - unauthorized protection
  - items lifecycle flow
  - manual alert run + mark read
