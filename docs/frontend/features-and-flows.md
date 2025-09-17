# Feature Inventory and User Flows

This inventory is based on the current App Router routes and components.

## Admin Features

- Customers
  - List with search, sort, filters, pagination
  - View details, Edit details, Create new
  - Actions: Suspend, Activate, Delete
  - Export CSV

- Installations
  - List, view details (`[id]`), create new
  - Energy monitoring per installation (with WebSocket updates)

- Energy (System)
  - System overview dashboards, charts
  - Installation energy subpages, alerts feed (WebSocket)

- Security
  - Alerts, Logs, Responses
  - Real-time admin system updates via `/topic/admin/system-update`

- Payments
  - Overview + Reports

- Loans
  - Overview, detail, edit, payments

- Service/System/Settings/Logs
  - Service status dashboards and system pages (various cards/tables)

## Customer Features

- Dashboard + Analytics + Charts
- Reports
- Payments
  - Make payment dialog, payment history
- Alerts
- Functions
- Profile

## Auth Flows

- Register, Login
- Verify email (`/verify-email/[token]`)
- Reset password (request + set)
- Change password

## Cross-Cutting User Flow Highlights

- Most data UX follows a shared pattern:
  - Hook encapsulates fetching/pagination/search
  - Common table + loading/empty/error wrappers drive UI
  - Actions call API, then refresh and toast results

