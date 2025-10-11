# Frontend Overview (Next.js)

What it is
- Next.js App Router (TypeScript) with Tailwind and shadcn/ui.
- Admin and Customer portals under `solar_frontend/app/*`.
- Axios API clients in `solar_frontend/lib/api/*` and STOMP/SockJS client in `solar_frontend/lib/energyWebSocket.ts`.

Structure
- Pages/routes: `app/admin/*`, `app/customer/*`
- Shared UI: `components/ui/*`
- API clients: `lib/api/*.ts` (auth, customers, energy, installations, payments, security, service)
- Utilities: `lib/*` (axios client, types, export utils, websockets)

Local development
- From `solar_frontend/`:
  - `pnpm install`
  - `pnpm dev`
- API proxy (Next rewrites):
  - `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080` in dev)
- WebSockets:
  - `NEXT_PUBLIC_WS_URL` (default `http://localhost:8080`)

Patterns
- Modular API clients replacing legacy monolith (`lib/api.ts`).
- Request interceptors attach JWT from storage and handle 401 redirects.
- STOMP client authenticates with `Authorization: Bearer <jwt>` in connect headers.

Links
- Code patterns: `docs/frontend/code-patterns.md`
- API alignment: `docs/frontend/api-alignment.md`
- Performance baseline: `docs/frontend/performance-baseline.md`
- Testing strategy: `docs/frontend/testing-strategy.md`
