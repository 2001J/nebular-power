# Security Design (as implemented)

Overview
- Stateless JWT authentication, method‑level authorization, CORS, and authenticated WebSocket connections.
- Focused role model (ADMIN, CUSTOMER) and resource‑level access checks for installations.

Authentication
- Login: `POST /api/auth/login` returns JWT; token is presented in `Authorization: Bearer <jwt>`.
- Passwords are hashed with BCrypt (`BCryptPasswordEncoder`).
- Email verification and password change flows are present; refresh tokens and MFA are not currently implemented.

Authorization
- Method security with `@PreAuthorize` across controllers.
- Role checks and ownership checks via `SecurityService.hasAccessToInstallation(Long installationId)` and `isCurrentUser(Long userId)` ensure customers access only their resources.

WebSocket security
- STOMP over SockJS endpoint `/ws`.
- Clients must include `Authorization: Bearer <jwt>` in STOMP connect headers.
- `WebSocketSecurityConfig` validates the JWT and sets the authenticated principal for the WS session.

CORS and CSRF
- CSRF is disabled for stateless APIs; JWT protects authenticated operations.
- CORS allows configured origins (see `SecurityConfig.corsConfigurationSource`).

Auditing
- Security/tamper logs are exposed under `/api/security/**` for admin queries (installations, time‑range, activity type).
- User activity logs are captured for profile/auth flows where applicable.

Data protection (practical notes)
- TLS is expected at the ingress/proxy in deployment environments.
- Passwords are hashed; other field‑level encryption is not enabled by default in this repository.

Future enhancements
- Optional MFA (email/TOTP), refresh tokens and token revocation/blacklist.
- Field‑level encryption for PII if required by deployment policy.
7. **Maintenance**: Security patches are applied promptly

### Secure Coding Guidelines

Developers follow secure coding guidelines:

- Input validation for all user inputs
- Output encoding to prevent XSS attacks
- Parameterized queries to prevent SQL injection
- Proper error handling that doesn't leak sensitive information
- Secure authentication and session management
- Principle of least privilege for database access

### Third-Party Security

Security of third-party components is managed through:

- **Vendor assessment**: Evaluation of vendor security practices
- **Vulnerability monitoring**: Tracking of vulnerabilities in third-party components
- **Regular updates**: Prompt application of security patches
- **Contractual requirements**: Security requirements in vendor contracts

## Future Security Enhancements

The security architecture is designed to evolve with emerging threats and technologies:

- **Zero Trust Architecture**: Moving towards a model where nothing is trusted by default
- **Passwordless Authentication**: Implementing WebAuthn/FIDO2 for stronger authentication
- **Advanced Threat Protection**: Implementing AI-based threat detection
- **Quantum-Resistant Cryptography**: Preparing for post-quantum cryptographic threats
