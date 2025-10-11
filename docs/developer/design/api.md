# API Overview (as built)

This overview maps the implemented API groups and base paths. For full, live documentation, run the backend and open `/swagger-ui/index.html`.

Authentication
- Mechanism: JWT Bearer in `Authorization` header.
- Obtain token: `POST /api/auth/login`
- Profile, password change, activity: `/api/profile/**`

User & Customers
- Customers: `/api/customers/**` (search, details, update, activity)
- Profile: `/api/profile/**`

Energy Monitoring
- Base paths:
  - `/monitoring/readings` (POST single/batch)
  - `/monitoring/readings/recent/{installationId}` (GET)
  - `/monitoring/readings/history/{installationId}` (GET)
  - `/monitoring/summaries/{installationId}/{period}` (GET; also `/generate/*`)
  - `/monitoring/installations/*` (GET/POST/PUT, overview, customer installations)

Payment Compliance
- Customer endpoints: `/api/payments/**` (dashboard, history, upcoming, `POST /make-payment`)
- Admin endpoints: `/api/admin/payments/**` (overdue, plans, reminder config, reports)

Tampering Detection & Security Logs
- Detection controls and simulation: `/api/security/detection/installations/{installationId}/*`
- Tamper events management: `/api/security/events/**`, admin alerts at `/api/security/admin/alerts`
- Security audit logs: `/api/security/admin/*/audit` and time‑range/activity filters

Service Control & System Integration
- Service status: `/api/service/status/**` (start/stop/restart, batch, history)
- Device commands: `/api/service/commands/**` (create, batch, status)
- System integration: `/api/service/system/**` (device heartbeats, health)
- Cross‑module integrations: `/api/service/integration/**` (payment status changes, security suspend/restore)

WebSocket endpoints
- STOMP over SockJS endpoint: `/ws`
- Topics (examples):
  - `/topic/installation/{id}/energy-data`
  - `/topic/installation/{id}/status`
  - `/topic/installation/{id}/tamper-alert`
  - `/topic/admin/system-update`, `/topic/admin/tamper-alerts`

Security and access control
- Method‑level security via `@PreAuthorize` with roles and helper `SecurityService.hasAccessToInstallation(…)`.
- WebSocket connections are authenticated via the STOMP `Authorization: Bearer <jwt>` header (see `WebSocketSecurityConfig`).

Notes
- The frontend proxies REST calls via Next.js rewrites (`/api/*`, `/monitoring/*`) to the backend base URL controlled by `NEXT_PUBLIC_API_URL`.
- OpenAPI groups are defined in `src/main/java/com/solar/config/OpenApiConfig.java` and match the paths listed above.

