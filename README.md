# Finance Tracker (Web)

React frontend for the self-hosted personal finance tracker. Pairs with [`finance-tracker-api`](https://github.com/amardito/finance-tracker-api).

Stack: React 18 + Vite + Tailwind + TanStack Query + Recharts + Zustand.

## Local dev

```bash
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000 (or wherever your API runs)
pnpm install
pnpm dev
```

Vite dev server runs on `http://localhost:5173`. Make sure the API is running and `WEB_ORIGIN` on the API matches that origin.

## Build & lint

```bash
pnpm typecheck
pnpm lint
pnpm build       # outputs to dist/
pnpm preview     # serves dist/ locally
```

## Docker

```bash
# Build with a baked-in API URL
docker build --build-arg VITE_API_URL=https://your-api.example.com -t finance-tracker-web .
docker run -p 8080:80 finance-tracker-web
```

Or via docker-compose (assumes your API runs separately):

```bash
VITE_API_URL=http://localhost:4000 docker compose up -d --build
```

Open http://localhost:8080.

## Deploy to Railway

1. Create a new service from this repo. Railway auto-detects `Dockerfile` via `railway.json`.
2. Set the build-time variable `VITE_API_URL` to your API's public URL (e.g. `https://fintrack-api.amardito.dev`).
3. Set up a public domain for the web service.
4. On the API service, set `WEB_ORIGIN` to this web service's public URL so CORS and cookies work end-to-end.

## Auth flow (token-based)

- First visit: pick **Generate new** to create an anonymous account. The token is shown ONCE — save it.
- Subsequent visits / other devices: pick **Sync token** and paste your raw token.
- Tokens are kept in `localStorage` as a list (web3-wallet style). The login page lets you switch between accounts.
- In Settings → Profile you can rotate the token (revokes the old one immediately).

## Currency

Default currency is configurable on the API (`DEFAULT_CURRENCY` env). Frontend uses `Intl.NumberFormat` with `id-ID` locale for IDR (dot thousands separator). The `MoneyInput` component formats amounts as you type.
