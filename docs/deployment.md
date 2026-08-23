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

- `NEXT_PUBLIC_CALENDAR_API_BASE` — the deployed `calendar_service` URL on Render
- `NEXT_PUBLIC_EVENTS_API_BASE` — the deployed `events_service` URL on Render

Update these once the exact Render URLs for both services are finalized.

## Why Workers + OpenNext, not Pages + next-on-pages

- This app's `calendar` and `events` pages are server components that fetch data at
  request time (`export default async function Page()`), which requires Next.js's
  full Node.js runtime.
- `@cloudflare/next-on-pages` (the Pages-based adapter) only supports the Edge runtime
  and has more feature gaps.
- Cloudflare itself now recommends `@opennextjs/cloudflare` on Workers for full-stack
  Next.js apps as of late 2025.
