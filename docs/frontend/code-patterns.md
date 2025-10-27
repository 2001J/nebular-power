# Code Patterns and Architecture

## Architectural Style

- Next.js App Router with mostly client components for interactive pages.
- Separation by domain (admin, customer) at the route level.
- Shared UI via shadcn + Radix primitives, composed in `components/ui/*`.
- Feature hooks orchestrate data fetching/state (`hooks/useCustomers`, `useAsyncState`).
- API layer: transitioning from legacy monolith (`lib/api.ts`) to modular clients in `lib/api/*`.
- WebSocket layer encapsulated in `lib/energyWebSocket.ts` with STOMP + SockJS.

## Patterns Observed

- API Access
  - `axios` instance (`lib/api/client.ts`) with request/response interceptors, token refresh, retry on 408/429/502/503/504.
  - Relative URLs to go through Next proxy (CORS-free).
  - Legacy `lib/api.ts` with many endpoints; increasingly replaced by `lib/api/*` modules.

- State Management
  - React hook-based local state; custom hooks for async + pagination (`useAsyncState`, `usePaginatedData`).
  - Minimal global state; auth handled via tokens in storage.

- UI Composition
  - Shared DataTable + loading/empty/error wrappers for consistent UX.
  - Tailwind utilities and `cn` merge helper for class composition.

- Forms and Validation
  - `useForm` hook with pluggable validate function, toasts on error/success.
  - `react-hook-form` is installed but `useForm` custom hook used in multiple places.

## Design Decisions

- Performance-friendly routing via Next App Router chunking (see `.next/app-build-manifest.json`).
- Build errors and ESLint disabled in `next.config.mjs` to prioritize dev velocity; should be re-enabled in CI.
- Token storage in localStorage/sessionStorage (trade-off: XSS exposure vs. CSRF with cookies).

## Opportunities

- Consolidate on modular API clients; gradually migrate imports from `lib/api.ts` and deprecate it.
- SSR-safety: wrap storage access in `typeof window !== 'undefined'` in interceptors.
- Standardize error handling with a small `lib/logging.ts` wrapper and consistent toasts/user messages.
- Type-first API surface in `lib/api/types.ts` and reuse across pages/hooks.
- Extract environment config into `lib/config.ts` for centralized API/WS URLs.

