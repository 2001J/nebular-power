# Frontend Project Structure

This document maps the current Next.js app structure, key modules, and how they depend on each other.

## Top-Level

- `solar_frontend/`
  - `app/` — App Router pages for admin and customer areas
  - `components/` — Shared UI (shadcn/radix) and domain components
  - `hooks/` — Shared hooks and domain hooks (customers, websockets)
  - `lib/` — API clients, utilities, websocket client, export helpers
  - `public/` — Static assets
  - `styles/` — Tailwind/global CSS
  - `types/` — Reusable TS types
  - `package.json` — Next 15 + React 19, TypeScript, Tailwind
  - `next.config.mjs` — Rewrites to backend API, standalone output, experimental opts
  - `tsconfig.json` — `strict: true`, bundler resolution, `@/*` path alias

## App Router Overview

- `app/admin/*` — Admin UX:
  - `customers/` (list, detail, edit, create)
  - `installations/` (list, detail, new)
  - `energy/` (overview, installation view, alerts)
  - `security/` (alerts, logs, responses)
  - `payments/` (overview, reports)
  - `loans/` (overview, detail, edit, payments)
  - `service/`, `system/`, `settings/`, `logs/`
- `app/customer/*` — Customer UX:
  - `page.tsx` dashboard, `analytics`, `reports`, `payments` (+ dialogs), `alerts`, `functions`, `profile`
- `app/(auth)` — `login`, `register`, `verify-email/[token]`, `reset-password`, `change-password`

All pages are client components where stateful behavior is required. Shared page scaffolding lives in `components/shared/*`.

## Components

- `components/ui/*` — Shadcn/Radix primitives with Tailwind
- `components/shared/*` — Table, loading/empty/error states, page headers
- `components/*` — Domain bits (charts, alerts, status cards, error boundary)

## Hooks

- `hooks/shared/*` — `useForm`, `useAsyncState` (incl. `usePaginatedData`)
- `hooks/useCustomers.ts` — Customers screen orchestration (filters, export, actions)
- `hooks/useWebSocket.ts`, `hooks/auth.ts` — Domain hooks

## Libraries

- `lib/api.ts` — Legacy monolith API file exporting `apiClient`, `customerApi`, `serviceApi`, etc.
- `lib/api/*` — New modular API: `client.ts` (axios + token refresh + retry), `customers.ts`, `auth.ts`, `types.ts`
- `lib/energyWebSocket.ts` — STOMP + SockJS helpers
- `lib/exportUtils.ts` — CSV export helpers
- `lib/utils.ts` — Formatting and generic utils
- `lib/logsApiTest.ts`, `lib/mockData.ts` — Dev/testing helpers

## Dependency Graph (High-Level)

- Pages (app/*) → Components (components/*) → UI primitives (components/ui/*)
- Pages/Components → Hooks (hooks/*)
- Hooks → API (lib/api/* or legacy lib/api.ts) and Utils (lib/*)
- API → `axios`, token handling, Next.js rewrites proxy (`/api/*`)
- WebSocket → `@stomp/stompjs`, `sockjs-client` with token headers

## Notes

- New modular API coexists with `lib/api.ts` to maintain backward compatibility.
- Next Proxy rewriter (`next.config.mjs`) forwards `/api/*` and `/monitoring/*` to backend; baseURL left blank to use relative paths.

