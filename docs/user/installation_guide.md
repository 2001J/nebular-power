# Installation Guide

This guide explains how to run the system locally for testing and demos.

Prerequisites
- Java 21 (or use the included `mvnw` wrapper)
- Node.js 20+ and pnpm (or npm)
- Python 3.10+ (for the simulator)
- Docker (optional, for Postgres and containers)

Option A: Local (fastest)
1) Backend
- From repo root: `./mvnw spring-boot:run`
- API docs: `http://localhost:8080/swagger-ui/index.html`

2) Frontend
- `cd solar_frontend`
- `pnpm install` then `pnpm dev`
- Open `http://localhost:3000`
- Optional env:
  - `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080` in dev)
  - `NEXT_PUBLIC_WS_URL` (defaults to `http://localhost:8080`)

3) Simulator (optional)
- `cd pi_simulation`
- `pip install -r requirements.txt`
- `python main.py -u http://localhost:8080`
- Sends energy readings and device heartbeats to the backend.

Option B: Docker Compose
- From repo root: `docker compose up -d`
- Brings up Postgres, backend (`:8080`), and frontend (`:3000`) using `compose.yaml`.

Configuration notes
- Backend uses H2 by default; compose uses Postgres.
- Next.js rewrites proxy `/api/*` and `/monitoring/*` to the backend base URL (`NEXT_PUBLIC_API_URL`).

Verification
- Login at `http://localhost:3000`.
- Customer portal: view energy charts and payments.
- Admin portal: Compliance Analytics, Security Logs, Service Status.
- With simulator running, recent readings and tamper simulations should reflect in the UI.

