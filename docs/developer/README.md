# Solar Energy Monitoring and Control – Developer Docs

This developer documentation provides architecture, APIs, implementation details, and testing guidance that reflect the current codebase. Use this as the primary reference when modifying or extending the system.

What’s here
- Design
  - System Architecture: `docs/developer/design/architecture.md`
  - Components: `docs/developer/design/components.md`
  - Database Design: `docs/developer/design/database.md`
  - API Overview: `docs/developer/design/api.md`
  - Security: `docs/developer/design/security.md`
- Implementation: `docs/developer/implementation/README.md`
- Testing: `docs/developer/testing/README.md`

Development quickstart
- Backend (Spring Boot)
  - Run locally: `./mvnw spring-boot:run`
  - Swagger UI: `/swagger-ui/index.html`
  - Profiles: default uses H2; `SPRING_PROFILES_ACTIVE=prod` with Postgres (see `compose.yaml`)
- Frontend (Next.js)
  - From `solar_frontend/`: `pnpm install` then `pnpm dev`
  - API proxy: set `NEXT_PUBLIC_API_URL` (dev defaults to `http://localhost:8080` via rewrites)
  - WebSockets: set `NEXT_PUBLIC_WS_URL` (default `http://localhost:8080`)
- Device simulator
  - From `pi_simulation/`: `pip install -r requirements.txt` then `python main.py -u http://localhost:8080`

Notes
- WebSocket topics live under `/ws` (SockJS/STOMP). See `energyWebSocket.ts` and backend `WebSocketConfig`.
- API groupings and paths align with `OpenApiConfig` groups (User Management, Energy Monitoring, Payment Compliance, Tampering Detection, Service Control).
