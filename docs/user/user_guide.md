# User Guide

This guide covers the main user journeys supported by the web application.

Getting started
- Open `http://localhost:3000` (or your deployed frontend) and log in with your credentials.
- The app detects your role and shows either the Customer or Admin workspace.

Customer portal
- Dashboard
  - See installation status, upcoming payments, and recent activity.
- Energy
  - Charts for recent readings and history per installation.
  - Summaries by period (daily/weekly/monthly) where available.
- Payments
  - Upcoming payments and history.
  - Make a payment (in‑app flow posts to `/api/payments/make-payment`).
- Profile
  - Update password after initial setup; manage basic profile details.

Admin portal
- Compliance Analytics
  - Consolidated view across Security, Installation, and Activity tabs.
  - Generate time‑range reports and export data.
- Installations
  - Browse installations and inspect an installation’s live data view.
  - Real‑time updates via WebSocket for energy/status/tamper alerts.
- Security Logs
  - Query audit logs by installation, time range, or activity type.
  - Review and act on tamper alerts.
- Payments / Compliance
  - View overdue items, manage payment plans, and trigger reminders.
- Service Control
  - Start/stop/restart, suspend/restore by cause (payment/security/maintenance).
  - Inspect and send device commands; review integration/health endpoints.

Notes
- Admin actions are protected; if you lack access, contact an administrator.
- Real‑time updates require a valid JWT for the WS connection; if you’re logged out, the WS reconnect will fail until you sign in again.

