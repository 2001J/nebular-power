# Security Assessment (Frontend)

Scope focuses on client-side risks and integration points. Backend security is out of scope here but influenced by client choices.

## Findings

- Token Storage (localStorage/sessionStorage)
  - Pros: simple, avoids CSRF with cookies
  - Cons: exposed to XSS exfiltration; ensure strict content hygiene
  - Mitigation:
    - Continue to avoid `dangerouslySetInnerHTML`
    - Sanitize any rich HTML if ever introduced (DOMPurify recommended)
    - Consider long-term move to httpOnly cookies + CSRF token for state-changing ops (requires backend changes)

- SSR Safety
  - `lib/api/client.ts` reads storage in interceptors; on server this can throw.
  - Fix: guard `localStorage/sessionStorage` use behind `typeof window !== 'undefined'` (applied).

- WebSocket Auth
  - STOMP headers include `Authorization: Bearer <token>` upon connect; ensure backend validates per-connection and on subscribe.
  - Don’t log sensitive details. WS client currently logs token presence (not value) in debug mode only.

- XSS
  - No use of `dangerouslySetInnerHTML` found.
  - Most UI binds plaintext values; React escapes by default.

- CSRF
  - Using bearer tokens in headers reduces CSRF risk.
  - If switching to cookies, reintroduce CSRF protections.

- Supply Chain / Linting
  - `next.config.mjs` disables type and lint checks for builds. Re-enable in CI to catch issues while keeping local DX fast.

## Recommendations

- Short term
  - Keep tokens in memory/localStorage, harden SSR guards (done for API client).
  - Centralize environment resolution (API/WS URLs) to prevent accidental leakage.
  - Add basic input validators/sanitizers in form utilities.

- Medium term
  - Add security lint rules (e.g., no raw HTML, audit new `dangerouslySetInnerHTML`).
  - Add Content Security Policy headers via Next middleware for stricter runtime.

- Long term
  - Consider token-in-cookie auth with httpOnly + SameSite=strict and CSRF token pattern.

