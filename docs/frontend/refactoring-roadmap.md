# Refactoring Roadmap

Prioritizes low-risk, high-impact changes first. All changes must preserve behavior.

## Phase 1 — Stabilize and Document (now)

- Add SSR guards around storage/token access in API client
- Freeze legacy `lib/api.ts` and start migrating new screens to `lib/api/*`
- Add docs: structure, patterns, features, security, performance baseline
- Prepare CI workflow skeleton (lint/build/test placeholders)

## Phase 2 — Code Quality and Safety

- Introduce ESLint flat config in repo with Next + TS rules (CI-only initially)
- Add Prettier config (.prettierrc) for consistency
- Enable type/lint checks in CI (keep build ignores locally)
- Add `lib/config.ts` to centralize env defaults (API/WS URLs)

## Phase 3 — API Layer Migration

- Migrate imports referencing `@/lib/api` to modular clients (`@/lib/api/customers`, `auth`, etc.)
- Extract common patterns (pagination/search) to `hooks/shared`
- Remove dead endpoints from monolith; keep a compatibility shim until cutover

## Phase 4 — Performance

- Add dynamic import boundaries around large charts/grids
- Audit Radix/shadcn imports for tree-shaking friendliness
- Add route-level code-splitting analysis in CI + budgets

## Phase 5 — Testing

- Add Vitest + React Testing Library for unit tests
- Add MSW for API mocks
- Add Playwright for core e2e (auth, customers list, CRUD happy paths)

## Phase 6 — Security

- Add CSP headers (report-only → enforce)
- Add input sanitizers where relevant
- Optional: explore auth cookie move (requires backend)

