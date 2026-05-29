# Finance Tracker

Self-hosted personal finance tracker. Built with React + Node/Express + PostgreSQL. Deploy to Railway with two services + the Postgres plugin.

## Features

- Manual transactions with categories, tags, notes
- Multiple accounts (cash/checking/savings/credit) with live balances
- Budgets with weekly/monthly periods + progress alerts (80% warn, 100% over)
- Recurring transactions with daily/weekly/monthly/yearly cadence + idempotent backfill
- Savings goals with contributions and progress tracking
- Dashboard analytics (cashflow, category breakdown, budget health)
- CSV import (column mapping) and CSV export
- Dark/light theme, responsive UI

## Stack

- **Web**: React 18, TypeScript, Vite, Tailwind, TanStack Query, Recharts, react-hot-toast
- **API**: Node 20, Express, TypeScript, Prisma, PostgreSQL 16, argon2, iron-session, Zod, pino
- **Shared**: `packages/shared` (Zod schemas + TS types)
- **Deploy**: Docker, docker-compose for local, Railway for production

## Repo layout

```
apps/
  api/       Express + Prisma backend
  web/       Vite SPA (nginx in prod)
packages/
  shared/    Zod schemas + types
docker-compose.yml
railway.json
.github/workflows/ci.yml
```

## Local development

Requirements: Node 20+, pnpm 9, Docker (for Postgres) OR a local Postgres 16.

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres (option A: docker)
docker compose up -d db

# 3. Copy env and edit
cp .env.example .env

# 4. Build shared package + generate Prisma client + migrate
pnpm --filter @ft/shared build
pnpm --filter @ft/api exec prisma migrate dev

# 5. Run both apps (in parallel)
pnpm dev
```

- API: http://localhost:4000 (health: `/api/health`)
- Web: http://localhost:5173

The first time you visit the web app you'll be prompted to **create the single owner account**. After registration, additional sign-ups are blocked automatically.

### Or run the whole stack with Docker

```bash
docker compose up --build
```

Web: http://localhost:8080  ·  API: http://localhost:4000

## Tests

```bash
pnpm -r run test
```

## Deploying to Railway

1. **Create a new Railway project** and connect this repo.
2. **Add the PostgreSQL plugin.** Railway will expose `DATABASE_URL` to other services in the project.
3. **Create the `api` service**:
   - Source: this repo (root)
   - Railway auto-detects `railway.json` at the repo root, which points at `apps/api/Dockerfile`. No manual Dockerfile selection needed.
   - Environment variables:
     - `NODE_ENV=production`
     - `DATABASE_URL` → reference Postgres plugin's variable
     - `SESSION_SECRET` → 32+ random bytes (e.g. `openssl rand -hex 32`)
     - `SESSION_COOKIE_NAME=ft_session`
     - `WEB_ORIGIN=https://<your-web-domain>` (must match the web service URL)
     - `DEFAULT_CURRENCY=USD`
     - `SIGNUP_ENABLED=true` (set to `false` after your first registration)
     - `LOG_LEVEL=info`
     - `PORT=4000`
   - Health check: `/api/health`
   - Generate a public domain (e.g. `api-xxx.up.railway.app`)
4. **Create the `web` service** (in the same Railway project):
   - Source: this repo (root)
   - Root directory: `apps/web` — Railway will pick up `apps/web/railway.json` which points at `apps/web/Dockerfile`.
   - Build-time variable: `VITE_API_URL=https://api-xxx.up.railway.app`
   - Generate a public domain (e.g. `web-xxx.up.railway.app`)
5. **Update the API's `WEB_ORIGIN`** to the web service's public URL so CORS works, then redeploy the API.
6. Push to `main`. GitHub Actions runs typecheck/lint/test/build; Railway auto-deploys both services.
7. Visit the web URL, register the owner account, then set `SIGNUP_ENABLED=false` on the API and redeploy.

### Notes on production

- Railway's Postgres plugin handles automatic daily backups; download from the plugin dashboard as needed.
- Sessions are httpOnly cookies signed by `SESSION_SECRET`. Rotate the secret by re-deploying the API; this invalidates existing sessions.
- Cross-subdomain cookies + CORS require `credentials: true` on requests (already handled by `src/lib/api.ts`) and `WEB_ORIGIN` to exactly match the web origin.
- The recurring engine runs an in-process hourly cron with idempotent transaction creation (unique `(recurringRuleId, scheduledFor)`).
- All money values are stored as `Decimal(14, 2)`. Frontend uses `Intl.NumberFormat`.

## Backups / Restore (manual)

```bash
# Backup
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql
# Restore
psql "$DATABASE_URL" < backup-2025-01-01.sql
```

## Security checklist

- [x] argon2id password hashing
- [x] httpOnly + secure + sameSite=lax session cookies
- [x] CSRF double-submit cookie + header
- [x] helmet + CORS allowlist
- [x] Rate limit on login (5/min) and global (200/min)
- [x] Zod input validation on every mutating endpoint
- [x] Centralized error envelope (no stack leaks)
- [x] User-scoped queries on every request

## License

MIT — Personal/self-hosted use intended.
