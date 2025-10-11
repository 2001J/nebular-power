# Implementation Documentation

This document provides implementation details that align with the codebase in this repository: package layout, notable services, and cross‑module behaviors.

## Table of Contents

1. [Code Organization](#code-organization)
2. [Key Components](#key-components)
3. [Design Patterns](#design-patterns)
4. [Security Implementation](#security-implementation)
5. [Error Handling](#error-handling)
6. [Logging](#logging)
7. [Performance Optimizations](#performance-optimizations)
8. [Internationalization](#internationalization)

## Code Organization

The Solar Energy Monitoring and Financing System follows a modular, layered architecture that separates concerns and promotes maintainability. The codebase is organized as follows:

```
src/
├── main/
│   ├── java/com/solar/
│   │   ├── SolarApplication.java               # Application entrypoint
│   │   ├── config/                             # OpenAPI config
│   │   ├── exception/                          # GlobalExceptionHandler, etc.
│   │   ├── user_management/                    # Auth, profile, customers, security config
│   │   └── core_services/
│   │       ├── energy_monitoring/              # Energy readings, summaries, installations, WS
│   │       ├── payment_compliance/             # Payments, plans, reminders, reports
│   │       ├── tampering_detection/            # Tamper events/logs/detection
│   │       └── service_control/                # Service status, device commands, integration
│   └── resources/
│       └── application.properties              # Profiles (H2 by default)
└── test/java/com/solar/                        # Extensive JUnit + Spring tests per module
```

### Package Structure

The codebase follows a feature-based package structure, where related functionality is grouped together:

- **com.solar**: Root package for all application code
  - **config**: Configuration classes for Spring Boot, security, etc.
  - **core_services**: Core business services organized by domain
  - **exception**: Global exception handling
  - **security**: Security-related components
  - **user_management**: User and role management


### Layered Architecture

Within each feature module, the code is organized in layers:

1. **Controller Layer**: REST API endpoints that handle HTTP requests
2. **Service Layer**: Business logic implementation
3. **Repository Layer**: Data access using Spring Data JPA
4. **Model Layer**: Domain entities and value objects
5. **DTO Layer**: Data transfer objects for API requests and responses

This layered approach ensures separation of concerns and makes the codebase easier to maintain and test.

## Key Components

### Core services and flows

Energy monitoring
- Controllers under `/monitoring/**` accept single and batch readings, expose recent/history series, and generate summaries.
- `EnergyDataServiceImpl` persists readings and emits WebSocket updates via `WebSocketService` to `/topic/installation/{id}/energy-data`.
- `SolarInstallationServiceImpl` updates status and emits status and tamper topics.

Energy summary generation implementation
- See `src/main/java/com/solar/core_services/energy_monitoring/service/impl/EnergySummaryServiceImpl.java:1` for the actual implementation, including `generateDailySummary`, weekly/monthly aggregation, and DTO conversion.

Payment compliance
- `CustomerPaymentController` (`/api/payments/**`) exposes dashboards, history, upcoming, and `make-payment`.
- `AdminPaymentController` (`/api/admin/payments/**`) manages plans, overdue processing, reminder configs, and reports.
- `ReminderDispatchJob` runs scheduled reminder dispatch; `PaymentEventPublisherImpl` integrates with service control when needed.

Tampering detection
- `/api/security/**` provides detection controls, events management, admin alerts, and audit logs filtered by time range and activity type.

Service control
- `/api/service/status/**` transitions service state (start/stop/restart/suspend/restore) at installation level.
- `/api/service/commands/**` queues device commands; `/api/service/system/**` accepts device heartbeats.
- `/api/service/integration/**` bridges payment/security events into service control actions.

Security helpers
- Method security is backed by `SecurityService`:
  - `hasAccessToInstallation(Long installationId)` limits customer access to owned installations
  - `isCurrentUser(Long userId)` for profile endpoints

## Implementation Decisions

- Data representation
  - DTOs at API boundaries; entities are not leaked to clients.
  - Pagination uses Spring Page objects; frontend unwraps `content` where only arrays are needed.
- Error handling
  - Centralized via `GlobalExceptionHandler` to return consistent problem shapes.
  - Validation via Hibernate Validator annotations on DTOs.
- Authentication & authorization
  - Stateless JWT with `Authorization: Bearer <token>`; method security with `@PreAuthorize` and helper checks in `SecurityService`.
- Realtime updates
  - STOMP over SockJS with topics per installation and admin scopes; clients send JWT in STOMP connect headers.
- Language & style
  - Java 21; Lombok judiciously; clear naming; small, testable services.
- Efficiency
  - Batch ingestion endpoint for readings; WS pushes reduce polling; repositories index time/installation where needed.

## Components Plan (physical)

- Backend (Spring Boot): HTTP REST + STOMP WS, default H2; prod Postgres.
- Database: Postgres (compose) or H2 (dev). Port 5432/5433 (host).
- Frontend (Next.js): HTTP client + STOMP client; proxies `/api/*` and `/monitoring/*` to backend via rewrites.
- Simulator (Python): Posts readings to `/monitoring/readings` and heartbeats to `/api/service/system/device-heartbeat`.

## Installation Guide

- Use the end‑user setup: `docs/user/installation_guide.md` for step‑by‑step local or compose startup.

Model references
- SolarInstallation model: `src/main/java/com/solar/core_services/energy_monitoring/model/SolarInstallation.java:1`
- EnergySummary model: `src/main/java/com/solar/core_services/energy_monitoring/model/EnergySummary.java:1`

#### EnergySummary
- See `src/main/java/com/solar/core_services/energy_monitoring/model/EnergySummary.java:1` for the current fields and summary period enum.

### Data Transfer Objects (DTOs)
- DTOs live under `src/main/java/com/solar/core_services/**/dto/`.

### Controllers
- See concrete controllers under:
  - `src/main/java/com/solar/user_management/controller/`
  - `src/main/java/com/solar/core_services/**/controller/`

## Design Patterns

The system implements several design patterns to address common challenges:

### Repositories
- See repository interfaces under `src/main/java/com/solar/core_services/**/repository/`.

### Services
- See service interfaces/impls under `src/main/java/com/solar/core_services/**/service/` and `/service/impl`.

### DTO builders
- DTOs commonly use Lombok `@Builder`; see DTOs under `src/main/java/com/solar/core_services/**/dto/`.

### Pattern notes
- Speculative pattern examples removed. Refer to concrete services and controllers for actual patterns in use.

## Security implementation highlights

- `SecurityConfig` enables stateless JWT auth, CORS, and permits `/api/auth/**`, `/swagger-ui/**`, `/ws/**` handshake.
- WebSocket auth via `WebSocketSecurityConfig` that reads the STOMP `Authorization` header and sets the principal if JWT is valid.

## Code Quality & Conventions
- Packages are feature‑based; controllers are thin; services encapsulate logic; repositories are Spring Data JPA.
- Identifiers are descriptive; avoid one‑letter vars; logging is structured and minimal in controllers.
- Reuse via service interfaces and DTO mappers; no premature abstraction beyond feature boundaries.

## Open Items / Gaps
- No invoice/ROI subsystem; only payment compliance is implemented.
- Outbound notification channels are limited to email; no push provider integration.

### Authorization
- See `src/main/java/com/solar/core_services/energy_monitoring/service/SecurityService.java:1` for the implementation used by `@PreAuthorize` expressions.

## Error Handling
- Global handler: `src/main/java/com/solar/exception/GlobalExceptionHandler.java:1`.

## Logging
- Standard SLF4J usage across services where needed; no dedicated logging wrapper.

## Performance Optimizations

### Caching
- Not configured in the current repository; consider as a future enhancement if needed.

### Database Optimizations

The system uses database optimizations to improve performance:

- **Indexing**: Indexes are created on frequently queried columns
- **Pagination**: Results are paginated to limit the amount of data returned
- **Lazy Loading**: Associations are loaded lazily to avoid unnecessary database queries
- **Query Optimization**: JPQL queries are optimized for performance

## Internationalization
- Not configured; omitted.
