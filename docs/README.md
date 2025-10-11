# Solar Energy Monitoring and Control System

This repository implements an end‑to‑end solution for monitoring small‑scale solar installations sold on financing plans. It tracks energy production/consumption, enforces payment compliance, detects tampering, and exposes web dashboards for customers and admins.

Problem to be solved
- Financing reduces upfront costs but requires providers to monitor payment compliance and prevent tampering that could degrade or bypass the system.

Why it’s good
- Automates reminders, status changes, and tamper alerts, reducing manual effort while protecting provider assets and improving reliability for users.

Where it’s applied
- Residential and small commercial solar systems offered on installment/lease models where remote monitoring, payment tracking, and security are required.

How it is implemented
- A Raspberry Pi simulator produces device telemetry (energy, heartbeats, tamper events) and sends it to a Spring Boot backend. The backend stores data, updates compliance states, and publishes notifications and real‑time WebSocket topics. A Next.js frontend provides customer and admin portals for energy insights, payments, and compliance/security analytics.

Documentation structure
- User documentation: non‑technical usage and setup guidance
  - See `docs/user/README.md`
- Developer documentation: architecture, APIs, implementation and testing
  - See `docs/developer/README.md`

High‑level data flow (text diagram)
- Device/Simulator → HTTP: `/monitoring/**`, `/api/service/system/**`
- Backend (Spring Boot) → DB (JPA) + Scheduling + Integrations
- Backend → WebSocket topics (`/ws` STOMP → `/topic/**`)
- Frontend (Next.js) → REST via Next rewrites (`/api/*`, `/monitoring/*`) + STOMP client

Quick links
- Frontend overview: `docs/frontend/README.md`
- API groups and Swagger UI (run backend): `/swagger-ui/index.html`
