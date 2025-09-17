# Testing Strategy

## Goals

- Reach 90% unit coverage on utilities, hooks, and pure components
- Reach 80% integration coverage for screen-level compositions
- Cover 100% of critical user journeys via e2e (auth, customers CRUD)

## Layers

- Unit (Vitest + RTL)
  - Utilities (`lib/utils.ts`, `exportUtils.ts`) and pure rendering logic
  - Custom hooks (`useForm`, `useAsyncState`, `usePaginatedData`)

- Integration (Vitest + RTL)
  - Screen composition: DataTable with real columns, mocked API via MSW
  - Token refresh flows: `lib/api/client.ts` with axios-mock-adapter

- E2E (Playwright)
  - Auth flows: login, register, verify, reset, change password
  - Admin: customers list, search, paginate, suspend/delete
  - Smoke: energy/system dashboards render without errors (mock WS)

## Tooling

- Vitest + @testing-library/react + jsdom
- MSW for API mocking
- Playwright for e2e suites

## CI Workflow (proposed)

- Lint → Typecheck → Unit/Integration → Build → E2E (opt-in on PR labels)

