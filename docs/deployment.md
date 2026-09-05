# Deploying rangroots.app/web to Cloudflare

This app deploys to **Cloudflare Workers** via the `@opennextjs/cloudflare` adapter
(Cloudflare's currently-recommended path for Next.js apps using server components /
the Node.js runtime — the older `@cloudflare/next-on-pages` + Pages combination is
Edge-runtime-only and not used here).

## One-time local setup

```bash
cd web
npm install
```

This installs `@opennextjs/cloudflare` and `wrangler` as dev dependencies (already
declared in `package.json`).

## Manual deploy (ad-hoc, from your machine)

```bash
npm run deploy
```

This runs `next build`, transforms the output into a Cloudflare Worker via OpenNext,
then publishes it with `wrangler deploy`.

To test in the actual Workers runtime locally before deploying:

```bash
npm run preview
```

## Recommended: Git-connected auto-deploy

Rather than deploying manually every time, connect the repo directly:

1. Cloudflare dashboard → **Workers & Pages → Create → Workers → Connect to Git**.
2. Select the `rangroots.app` repository, root directory `web/`.
3. Build command: `npx opennextjs-cloudflare build`
4. Deploy command: `npx wrangler deploy`
5. Every push to `main` auto-deploys; PRs get preview URLs automatically — mirrors the
   same flow already set up for `rangroots.api` on Render.

## Environment variables

Set these in `wrangler.jsonc` (`vars`) for values safe to commit, or via the Cloudflare
dashboard (**Workers & Pages → your worker → Settings → Variables**) for anything
secret:

- `CALENDAR_API_BASE` — server-side base URL used by `/api/homepage-content` for the deployed `calendar_service`
- `EVENTS_API_BASE` — server-side base URL used by `/api/homepage-content` for the deployed `events_service`
- `NEXT_PUBLIC_CALENDAR_API_BASE` — optional client-side calendar API base for routes that fetch from the browser
- `NEXT_PUBLIC_EVENTS_API_BASE` — optional client-side events API base for routes that fetch from the browser

Current checked-in values in `web/wrangler.jsonc`:

- `CALENDAR_API_BASE=https://rangroots.onrender.com`
- `EVENTS_API_BASE=https://rangroots-events-service.onrender.com`
- `NEXT_PUBLIC_CALENDAR_API_BASE=https://rangroots.onrender.com`
- `NEXT_PUBLIC_EVENTS_API_BASE=https://rangroots-events-service.onrender.com`

The homepage now relies on the same-origin route `POST /api/homepage-content`, which calls
the backend APIs server-side. That means the production landing page depends primarily on
`CALENDAR_API_BASE` and `EVENTS_API_BASE`, not on browser CORS.

## Health checks and smoke tests

Validate the deployed backend services directly:

```bash
curl -s https://rangroots.onrender.com/api/calendar/festivals?year=2026\&city_id=berlin
curl -s https://rangroots.onrender.com/api/calendar/highlights?month=2026-09\&city_id=berlin
curl -s https://rangroots.onrender.com/api/calendar/location-context?lat=52.52\&lng=13.4
curl -s https://rangroots-events-service.onrender.com/api/events?city_id=berlin\&from=2026-09-01
```

Validate the deployed frontend aggregation path:

```bash
curl -s -X POST https://<your-frontend-domain>/api/homepage-content \
  -H 'Content-Type: application/json' \
  --data '{"month":"2026-09","year":2026,"cityId":"berlin","lat":52.52,"lng":13.4}'
```

Expected behavior:

- The calendar service returns `festivals`, `highlights`, and location-context data.
- The events service returns at least the Berlin event seed data for the MVP path.
- The frontend route returns aggregated `festivals`, `highlights`, `events`, and an empty `errors` array.

## Deployment contract summary

- Cloudflare Worker hostname serves the Next.js app and `api/homepage-content`.
- Render calendar service must expose:
  - `GET /api/calendar/daily`
  - `GET /api/calendar/monthly`
  - `GET /api/calendar/festivals`
  - `GET /api/calendar/highlights`
  - `GET /api/calendar/location-context`
- Render events service must expose:
  - `GET /api/events`
  - `GET /api/events/{event_id}`

If the homepage shows missing live data in production, first check the frontend route
`/api/homepage-content`, then check the two backend base URLs independently.

## Why Workers + OpenNext, not Pages + next-on-pages

- This app's `calendar` and `events` pages are server components that fetch data at
  request time (`export default async function Page()`), which requires Next.js's
  full Node.js runtime.
- `@cloudflare/next-on-pages` (the Pages-based adapter) only supports the Edge runtime
  and has more feature gaps.
- Cloudflare itself now recommends `@opennextjs/cloudflare` on Workers for full-stack
  Next.js apps as of late 2025.
