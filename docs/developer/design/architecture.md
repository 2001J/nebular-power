# System Architecture

This document reflects the architecture implemented in this repository.

High‑Level Design (HLD)
- Multi‑tier system with a Spring Boot backend, a Next.js frontend, and a light device/simulator client.
- Feature‑oriented backend modules: Energy Monitoring, Payment Compliance, Tampering Detection, Service Control, and User Management.
- Real‑time updates via STOMP over SockJS on `/ws` with topics under `/topic/**`.

High‑level architecture (text diagram)
```
Device / Pi Simulator
  └─ HTTP → /monitoring/**, /api/service/system/**

Spring Boot Backend
  ├─ REST APIs (controllers per module)
  ├─ Services (business logic)
  ├─ JPA Repositories (Postgres/H2)
  ├─ Schedulers (e.g., payment reminders)
  └─ WebSockets (STOMP topics under /topic/** via /ws)

Next.js Frontend
  ├─ Admin portal (compliance, security, service ops)
  ├─ Customer portal (energy, payments, alerts)
  └─ Axios + STOMP client

Observability / Docs
  └─ SpringDoc OpenAPI groups + Swagger UI
```

Low‑Level Design (LLD) Views
- Data flow (ingestion → persistence → realtime)
```
POST /monitoring/readings
  → EnergyDataController.submitEnergyReading
    → EnergyDataService.processEnergyData
      → EnergyDataRepository.save
      → WebSocketService.sendEnergyDataUpdate(/topic/installation/{id}/energy-data)
```

- Access control
```
@PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
SecurityService.hasAccessToInstallation(id)
  → reads Authentication principal (UserPrincipal)
  → checks ownership via repositories
```

- Realtime security
```
Client STOMP CONNECT with Authorization: Bearer <jwt>
  → WebSocketSecurityConfig.configureClientInboundChannel
    → validate JWT, set Authentication on accessor
```

Module boundaries (backend packages)
- `com.solar.user_management` → auth, profiles, customers
- `com.solar.core_services.energy_monitoring` → energy data, summaries, installations, WebSocket updates
- `com.solar.core_services.payment_compliance` → plans, payments, reminders, reports
- `com.solar.core_services.tampering_detection` → tamper events, logs, responses, detection controls
- `com.solar.core_services.service_control` → service status, device heartbeats/commands, integration ops

Technology stack
- Backend
  - Java 21, Spring Boot 3.3.4
  - Spring Security (JWT, method security), Spring Data JPA, Validation
  - WebSocket messaging: spring‑websocket (STOMP/SockJS)
  - OpenAPI: SpringDoc UI
  - Testing: JUnit 5 + Spring Boot Test + Mockito
- Database
  - PostgreSQL (prod via `compose.yaml`), H2 (dev by default)
- Frontend
  - Next.js (App Router), React, TypeScript
  - Tailwind + shadcn/ui (Radix primitives)
  - Axios for HTTP; `@stomp/stompjs` + `sockjs-client` for WS
- DevOps
  - Build: Maven (backend), pnpm (frontend)
  - Containers: Dockerfiles (`Dockerfile`, `Dockerfile.frontend`), `compose.yaml`
  - Docs: Swagger UI at `/swagger-ui/index.html`

Deployment modes
- Local dev: run backend and frontend directly; or use Docker Compose for Postgres + backend + frontend.
- Containerized: build images from `Dockerfile` (backend) and `Dockerfile.frontend` (Next.js), orchestrated via `compose.yaml`.

Scalability considerations
- Stateless REST + WebSocket brokers allow horizontal scaling.
- Background jobs (e.g., `ReminderDispatchJob`) run on a single instance or with leader election if clustered.
- Database can scale with managed Postgres and read replicas; add caching if needed.

Resilience and fault tolerance
- HTTP client retries are handled in the frontend axios layer for transient errors.
- Backend exposes health endpoints and logs operational events; service status transitions are explicit.

Future considerations
- Outbound notifications provider, device command feedback loops, and stronger idempotency on integrations.
- Optional MFA and organization hierarchies if required.

Short Code Excerpts (verified)
WebSocket endpoint and broker
```java
// WebSocketConfig
config.enableSimpleBroker("/topic");
registry.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
```

Realtime topics
```java
// WebSocketService
convertAndSend("/topic/installation/"+id+"/energy-data", energyData);
convertAndSend("/topic/installation/"+id+"/status", installation);
convertAndSend("/topic/admin/tamper-alerts", installation);
```

Ingestion endpoints
```java
// EnergyDataController
@PostMapping("/readings")
public ResponseEntity<EnergyDataDTO> submitEnergyReading(@Valid @RequestBody EnergyDataRequest req) { … }
@GetMapping("/readings/recent/{installationId}")
@PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
public ResponseEntity<List<EnergyDataDTO>> getRecentReadings(...){ … }
```
