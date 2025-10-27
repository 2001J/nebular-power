# Testing Documentation

This document summarizes how tests are organized and how to run them for this repository.

Testing approach
- Unit and slice tests for services, repositories, and controllers using JUnit 5, Spring Boot Test, and Mockito.
- Integration coverage around module boundaries (energy monitoring, payment compliance, tamper detection, service control, user management).

Test layout
- Tests live under `src/test/java/com/solar/...` mirroring the main package structure.
- Examples:
  - Energy monitoring: repository, service, controller tests
  - Payment compliance: services, schedulers, controllers
  - Security/tamper: controllers and services
  - Service control: status, device commands, integration controllers
  - User management: auth/profile/customers

Running tests
- All tests: `mvn test`
- Single class: `mvn test -Dtest=EnergySummaryServiceTest`
- Single method: `mvn test -Dtest=EnergySummaryServiceTest#testGenerateDailySummary_Success`

Configuration
- H2 is used by default for tests; Spring Boot test annotations configure in‑memory context and transactional rollbacks where appropriate.

Test plan
- Unit tests: services (business logic), repositories (query methods), utility classes.
- Controller slice tests: MockMvc for request/response, validation, and `@PreAuthorize` guards.
- Integration tests: end‑to‑end across controller→service→repository with in‑memory DB; verify serialization and DTO mapping.
- Scheduler tests: reminder job triggers and edge conditions (no due items, retries on transient failures).

Representative test cases
- Energy monitoring
  - Persist single reading; reject invalid payload; batch insert deduplicates timestamps; history range filters; summaries compute from readings.
- Payment compliance
  - Upcoming payments sorted by dueDate; make‑payment validates plan and updates status; overdue listing respects grace period config.
- Tamper/security
  - Admin alerts endpoint paginates; time‑range filters on logs; simulate endpoints return 200 and enqueue events.
- Service control
  - Suspend by cause sets state; restore transitions correctly; batch operations handle partial failures.
- User/auth
  - Login returns token; change‑password validates current password; email verify returns redirect hint when required.

Results & lessons learned
- Normalizing Page responses on the frontend improved UI expectations without changing backend contracts.
- Consistent `@PreAuthorize` + `SecurityService` ownership checks simplified access rules and testability.

High‑volume runs (approach)
- Batch readings endpoint tested with high cardinality (e.g., 10k rows) against H2/PG to verify throughput and transaction boundaries.
- WebSocket publish frequency validated with synthetic bursts to confirm topic fan‑out does not starve request handling.

Correctness & efficiency analysis
- Summaries match aggregation of underlying readings (spot‑checked via fixtures and property‑based ranges).
- Payment state transitions keep invariant: a payment cannot be both PAID and OVERDUE; overdue → restored transitions update service status when configured.
- Indexes on `(installationId, timestamp)` ensure history queries remain sub‑second for typical windows.

Scalability
- Stateless controllers/services allow horizontal scale; WS broker is simple and can be fronted by multiple app instances sharing topics.
- Schedulers should run in single‑leader mode when clustered (future enhancement).

Coverage
- Coverage is not enforced in CI here; focus areas include controller security annotations, repository queries, and service logic.

Open items / gaps
- No automated load test scripts are committed; execute high‑volume scenarios manually or via external tooling.
- Frontend e2e tests are not included; consider Playwright for smoke flows (login → compliance → install detail).
