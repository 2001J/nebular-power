# Performance Baseline

This document sets initial performance targets and records current baseline from existing `.next` artifacts. For precise numbers, run a fresh `next build` and Lighthouse passes in CI and staging.

## What We Measure

- Bundle sizes per route (client chunks)
- Route-level code splitting health (App Router)
- WebVitals (FCP, LCP, TTI, CLS) in staging
- WebSocket connection stability/reconnect
- API request latency + error rate (from browser devtools/metrics)

## Current Snapshot (from `.next` manifests)

- Routes are chunked per `app/*` entry (see `solar_frontend/.next/app-build-manifest.json`). Example entries:
  - `/admin/customers/page` → `static/chunks/app/admin/customers/page.js`
  - `/admin/installations/page` → `static/chunks/app/admin/installations/page.js`
- Global client chunks: `static/chunks/webpack.js`, `static/chunks/main-app.js`

Note: exact JS/CSS asset sizes pending a fresh production build.

## Target Improvements

- Reduce initial JS for core dashboards
- Ensure heavy charts load lazily (dynamic import) where appropriate
- Audit optional Radix/shadcn components to avoid unused imports
- Confirm images/graphics use Next Image or optimized delivery

## How to Establish a Fresh Baseline (proposed CI step)

1. `npm ci && NEXT_TELEMETRY_DISABLED=1 npm run build`
2. Capture `next build` output sizes
3. Run Lighthouse CI (mobile + desktop)
4. Store metrics artifact for comparison in future PRs

## Current Build Metrics (local run)

From a fresh `npm run build`:

- Heavier routes to optimize first:
  - `app/admin/energy` First Load JS ~294 kB
  - `app/admin/installations/[id]` First Load JS ~313 kB
  - `app/customer/charts` First Load JS ~287 kB
  - `app/customer/analytics` First Load JS ~268 kB
- Most other admin/customer routes are in the 150–220 kB range.

Actions to consider:
- Lazy-load charting libraries and heavy components on those pages.
- Ensure imports are as granular as possible (tree-shaking friendly).
- Consider route-level dynamic imports for non-critical widgets.
