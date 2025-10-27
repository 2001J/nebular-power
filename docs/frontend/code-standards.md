# Code Standards and Style Guide

## Typescript

- `strict: true` (already enabled) — keep it.
- Avoid `any`; prefer precise types and domain models in `lib/api/types.ts`.
- Use discriminated unions for status-like fields where practical.

## React

- Prefer function components with hooks.
- Keep client-only code out of server modules; guard browser-only APIs.
- Memoize expensive renders; use `useMemo/useCallback` for stable deps in tables/lists.

## API

- Use `lib/api/client.ts` + `makeApiRequest` for retries and error handling.
- Build modular clients per resource (`lib/api/*`); avoid adding to legacy `lib/api.ts`.
- Keep relative paths to leverage Next rewrite proxy.

## UI

- Use shadcn/radix primitives from `components/ui/*`.
- Reuse `components/shared/*` for consistent table and load/error states.

## Formatting & Linting

- Prettier: 2-space indent, trailing commas where possible, single quotes.
- ESLint: Next + TS recommended; `no-console` warn in prod, `react-hooks/exhaustive-deps` warn.

