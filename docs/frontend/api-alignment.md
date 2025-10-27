# Frontend ↔ Backend API Alignment

This document maps the new modular frontend API clients to Spring controllers and endpoints in the backend. It also notes any normalization done on responses for UI expectations.

## Auth & Users

- Frontend modules: `lib/api/auth.ts` (modular), legacy `authApi`, `userApi` in `lib/api.ts`
- Backend controllers:
  - `AuthController` → `/api/auth/*`
  - `UserProfileController` → `/api/profile/*`
- Status: aligned. Next step: split `userApi` as `lib/api/users.ts` (optional).

## Customers

- Frontend: `lib/api/customers.ts`
- Backend: `CustomerController` → `/api/customers`
  - GET `/api/customers` (paginated), GET `/api/customers/search`, etc.
- Status: aligned.

## Energy Monitoring

- Frontend: `lib/api/energy.ts`
- Backend controllers:
  - `SolarInstallationController` → `/monitoring/installations`
    - GET `/overview` (SystemOverviewResponse)
    - GET `/customer/{customerId}`
    - GET `/{installationId}`
  - `EnergyDataController` → `/monitoring`
    - GET `/dashboard/installation/{installationId}`
    - GET `/readings/recent/{installationId}`
    - GET `/readings/history/{installationId}`
- Status: aligned.

## Installations

- Frontend: `lib/api/installations.ts`
- Backend: `SolarInstallationController`
- Response normalization: `getAllInstallations` wraps SystemOverviewResponse as a pageable-like object with `content`, to match existing UI expectations (no server change).

## Payments (Customer)

- Frontend: `lib/api/payments.ts`
- Backend: `CustomerPaymentController` → `/api/payments`
  - GET `/dashboard`, GET `/history`, GET `/upcoming`, POST `/make-payment`
- Status: aligned.

## Payments (Admin Reports / Compliance)

- Frontend: legacy `paymentComplianceApi` in `lib/api.ts` (modularization pending)
- Backend: `AdminPaymentController` and `PaymentReportController` → `/api/admin/payments/*`
- Status: usable; can modularize next without changing paths.

## Service Control

- Frontend: `lib/api/service.ts` (start/stop/restart, health, heartbeats), legacy `serviceControlApi` still in `lib/api.ts`
- Backend controllers:
  - `ServiceStatusController` → `/api/service/status/*` (start/stop/restart, update, history)
  - `SystemIntegrationController`/`IntegrationController` for system integration and health (if used)
- Status: aligned for basic controls; `serviceControlApi` can be modularized next.

## Security / Tamper Detection

- Frontend: `lib/api/security.ts`
- Backend controllers:
  - `TamperEventController` → `/api/security/*`
    - GET `/installations/{installationId}/events` (Page<TamperEventDTO>)
    - GET `/admin/alerts`, `/admin/all-alerts` (Page<TamperEventDTO>)
  - `SecurityLogController` → `/api/security/*` (logs endpoints)
- Response normalization:
  - Methods returning Page… are unwrapped to `content` arrays in the frontend client where the UI expects arrays (e.g., customer alerts). Where callers expect pageable (e.g., admin logs), the client returns the full object.

## WebSocket

- Frontend: `lib/energyWebSocket.ts`
- Backend: STOMP/SockJS endpoints under `/ws` with topics like `/topic/admin/system-update`.
- Status: aligned.

## Notes

- All modular clients use `lib/api/client.ts` (axios instance, token refresh, retry).
- Next rewrites (`/api/*`, `/monitoring/*`) are configured in `next.config.mjs` to target backend containers or localhost.
- Where backend returns Pages, we normalize to arrays if the UI expects arrays. This keeps existing UI logic intact.

## Next Modularization Targets (optional)

- `serviceControlApi` → `lib/api/serviceControl.ts`
- `paymentComplianceApi` → `lib/api/paymentCompliance.ts`
- `settingsApi` → `lib/api/settings.ts`
- `authApi`/`userApi` → keep or extract `lib/api/users.ts`

