# Components & Modules (as implemented)

This document reflects the implemented modules, their responsibilities, key classes/methods, and navigation flows. It forms a core part of the solution plan.

## Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                           Solar Monitoring System                     │
│                                                                       │
│  ┌───────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │ User Management   │  │ Energy Monitoring   │  │ Payment Compliance│ │
│  └───────────────────┘  └─────────────────────┘  └──────────────────┘ │
│            ▲                         ▲                        ▲       │
│            │                         │                        │       │
│  ┌───────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │ Tamper & Security │  │ Service Control     │  │ WebSocket Msg    │ │
│  └───────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

Modules map to packages under `com.solar` and to REST controllers + services.

## Component Details

### User Management
- Controllers: `AuthController`, `UserProfileController`, `CustomerController`
- Responsibilities: authentication (JWT issuance), password changes, email verification, profile activity logging, customer CRUD/search.
- Notable classes: `SecurityConfig` (CORS/JWT), `JwtTokenProvider`, `UserServiceImpl`, `EmailServiceImpl`.

### Energy Monitoring
- Controllers: `EnergyDataController`, `EnergySummaryController`, `SolarInstallationController`
- Responsibilities: ingest readings (single/batch), fetch recent/history and dashboards, compute summaries, manage installation data.
- Notable classes: `EnergyDataServiceImpl`, `EnergySummaryServiceImpl`, `SolarInstallationServiceImpl`, `WebSocketService` (publishes energy/status/tamper topics).

### Payment Compliance
- Controllers: `CustomerPaymentController`, `AdminPaymentController`, `PaymentReportController`
- Responsibilities: customer dashboards, upcoming/history, make‑payment; admin plans/overdue/reminder configs/reports; scheduled reminders.
- Notable classes: `PaymentServiceImpl`, `PaymentPlanServiceImpl`, `PaymentReminderServiceImpl`, `ReminderDispatchJob`.

### Tamper Detection & Security Logging
- Controllers: `TamperEventController`, `TamperDetectionController`, `SecurityLogController`
- Responsibilities: admin tamper alerts, customer views, detection controls/simulation, security audit logs (installations, time ranges, activity types).
- Notable classes: `TamperEventServiceImpl`, `SecurityLogServiceImpl`.

### Service Control & Integration
- Controllers: `ServiceStatusController`, `DeviceCommandController`, `SystemIntegrationController`, `IntegrationController`
- Responsibilities: start/stop/restart, suspend/restore by cause; device commands and status; device heartbeat intake; bridging payment/security events to service status.
- Notable classes: `ServiceStatusServiceImpl`, `DeviceCommandServiceImpl`, `SystemMonitoringServiceImpl`.

### WebSocket Messaging
- Endpoint: `/ws` (SockJS/STOMP)
- Topics: `/topic/installation/{id}/energy-data`, `/status`, `/tamper-alert`, `/topic/admin/system-update`, `/topic/admin/tamper-alerts`
- Security: `WebSocketSecurityConfig` authenticates via STOMP `Authorization: Bearer <jwt>`.

## Component Interactions

Key flows
1) Login (User Management) → JWT issued → used for REST and WS
2) Energy readings (Energy Monitoring) → persist → publish `/topic/installation/{id}/energy-data`
3) Payment overdue (Payment Compliance) → Integration/Service Control → suspend installation
4) Tamper alert (Tamper) → publish `/topic/installation/{id}/tamper-alert` and `/topic/admin/tamper-alerts` → optional suspend via Service Control

Short Code Excerpts (verified)
Energy ingestion
```java
@PostMapping("/readings")
public ResponseEntity<EnergyDataDTO> submitEnergyReading(@Valid @RequestBody EnergyDataRequest request) {
  return ResponseEntity.ok(energyDataService.processEnergyData(request));
}
```

WebSocket publish
```java
public void sendEnergyDataUpdate(Long installationId, EnergyDataDTO energyData) {
  messagingTemplate.convertAndSend("/topic/installation/"+installationId+"/energy-data", energyData);
}
```

Security guard on controller
```java
@GetMapping("/readings/recent/{installationId}")
@PreAuthorize("hasRole('ADMIN') or @securityService.hasAccessToInstallation(#installationId)")
public ResponseEntity<List<EnergyDataDTO>> getRecentReadings(...) { … }
```

## Module/Class Structure & Main Methods (inputs → outputs)

Controllers
- AuthController
  - POST `/api/auth/login` LoginRequest → AuthResponse
  - POST `/api/auth/change-password` PasswordChangeRequest + currentPassword → {message}
  - GET `/api/auth/verify-email/{token}` token → {message, redirect?}
- CustomerController
  - GET `/api/customers/search` query → Page<CustomerDTO>
  - GET `/api/customers/{id}` → CustomerDTO; PUT `{id}` Update → CustomerDTO
- EnergyDataController
  - POST `/monitoring/readings` EnergyDataRequest → 200/400
  - POST `/monitoring/readings/batch` BatchEnergyReadingsRequest → 200
  - GET `/monitoring/readings/recent/{installationId}` → Page<EnergyReadingDTO>
  - GET `/monitoring/readings/history/{installationId}` range → Page<EnergyReadingDTO>
  - GET `/monitoring/dashboard/installation/{installationId}` → DashboardResponse
- EnergySummaryController
  - GET `/monitoring/summaries/{installationId}/{period}` → List<EnergySummaryDTO>
  - POST `/monitoring/summaries/{installationId}/generate/*` → EnergySummaryDTO
- SolarInstallationController
  - GET `/monitoring/installations/{installationId}` → SolarInstallationDTO
  - GET `/monitoring/installations/customer/{customerId}` → List<SolarInstallationDTO>
  - GET `/monitoring/installations/overview` → System overview DTO
- TamperEventController / TamperDetectionController / SecurityLogController
  - GET `/api/security/admin/alerts` → Page<TamperEventDTO>
  - POST `/api/security/detection/installations/{id}/simulate/*` → 200
  - GET `/api/security/admin/installations/{id}/audit/time-range` → Page<SecurityLogDTO>
- ServiceStatusController
  - POST `/api/service/status/{installationId}/suspend/*` → ServiceStatusDTO
  - POST `/api/service/status/{installationId}/restore` → ServiceStatusDTO
  - GET  `/api/service/status/{installationId}` → ServiceStatusDTO
- DeviceCommandController
  - POST `/api/service/commands/{installationId}` DeviceCommandRequest → DeviceCommandDTO
  - GET  `/api/service/commands/{installationId}` → List<DeviceCommandDTO>
- CustomerPaymentController
  - GET `/api/payments/dashboard` → PaymentDashboardDTO
  - GET `/api/payments/upcoming` → Page<PaymentDTO>
  - GET `/api/payments/history` → Page<PaymentDTO>
  - POST `/api/payments/make-payment` MakePaymentRequest → PaymentDTO
- AdminPaymentController / PaymentReportController
  - Plans/payments config endpoints; overdue listings; reminder config; reports

Key services
- SecurityService: `hasAccessToInstallation(id)`, `isCurrentUser(userId)`
- WebSocketService: `sendEnergyDataUpdate`, `sendInstallationStatusUpdate`, `sendTamperAlert`, `sendAdminSystemUpdate`
- Payment services: update statuses, create reminders, compute compliance metrics
- Energy services: persist readings, compute summaries, publish updates

DTOs vs Entities
- REST controllers exchange DTOs; JPA entities are internal to services/repositories.

## UI Design Overview (navigation)

Portals
- Customer: Dashboard → Energy → Payments → Profile
- Admin: Home → Compliance Analytics (Security/Installation/Activity tabs) → Installations (detail/live) → Security Logs → Payments/Plans → Service Control

Important handlers (frontend)
- Payments: submit make‑payment → `/api/payments/make-payment`
- Compliance: date range change → `complianceApi.getComprehensiveReport(...)`
- Installation detail: WS connect on mount; topics energy/status/tamper

Additional Short Excerpts (verified)
Make payment (customer)
```java
@PostMapping("/make-payment")
public ResponseEntity<PaymentDTO> makePayment(Authentication auth,
    @Valid @RequestBody MakePaymentRequest request) {
  Long userId = getUserIdFromAuthentication(auth);
  PaymentDTO payment = paymentService.makePayment(userId, request);
  return ResponseEntity.status(HttpStatus.CREATED).body(payment);
}
```

Authorization helper
```java
public boolean hasAccessToInstallation(Long installationId) {
  Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
  if (authentication == null || !authentication.isAuthenticated()) return false;
  if (authentication.getAuthorities().stream()
        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) return true;
  Object principal = authentication.getPrincipal();
  if (principal instanceof UserPrincipal) {
    Long userId = ((UserPrincipal) principal).getId();
    return installationRepository.findById(installationId)
      .map(i -> i.getUser() != null && i.getUser().getId().equals(userId))
      .orElse(false);
  }
  return false;
}
```

## Open Items / Gaps
- No “Financial/Invoice” subsystem is implemented; docs above avoid those claims.
- Notifications are email‑based only (no push/mobile component).
