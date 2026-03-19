# Auth and Security

This guide documents the security model currently implemented by the starter.

## Global Guards

Guards are attached globally in `main.ts` in this order:

1. `ApiKeyGuard`
2. `JwtAuthGuard`
3. `RolesGuard`

Order matters because API key checks run before JWT role checks.

## Route Access Semantics

## `@Open()`

- bypasses API key and JWT checks
- intended for endpoints that must be externally reachable without credentials (for example OAuth handshake endpoints)

## `@Public()`

- bypasses JWT checks
- does **not** bypass API key checks
- requests still need `x-api-key` unless a bearer token is already present

## Protected (default)

- require a valid bearer token or a valid API key path through guards
- role checks apply when `@Roles(...)` metadata is present

## API Key Auth

`ApiKeyGuard` expects header:

```text
x-api-key: <X_API_KEY>
```

Behavior:

- if route is `@Open()`: passes immediately
- if `Authorization: Bearer ...` is present: guard allows request to continue so JWT guard can validate token
- otherwise `x-api-key` is required and must match `X_API_KEY`

## JWT Auth

JWT guard uses Passport `jwt` strategy.

- token source: `Authorization: Bearer <token>`
- signing secret: `JWT_SECRET`
- payload validation delegated to `AuthService.validateUser(...)`

## Role-Based Access

Use `@Roles('roleName')` to declare required roles.

- roles guard reads role metadata from `ROLES_KEY`
- compares required role names against `request.user.roleName`

## Rate Limiting

Global throttler presets:

- `short`: 10 requests / 1 second
- `medium`: 30 requests / 10 seconds
- `long`: 100 requests / 60 seconds

Auth endpoints add stricter per-route throttles for login, OTP, and reset workflows.

## Password and Token Notes

Key auth constants:

- JWT expiration: `7d`
- refresh token expiration window: `90 days`
- max login attempts: `5`
- lockout duration: `15 minutes`
- bcrypt rounds: `10`

## OAuth Security Notes

Google OAuth flow:

- initiation: `/v1/auth/google`
- callback: `/v1/auth/google/callback`
- callback redirects to frontend using hash fragment tokens:
  - `#accessToken=...&refreshToken=...`

See `src/auth/docs/google-oauth.md` for full flow and frontend integration.

## Validation and Input Hardening

Global `ValidationPipe` is configured with:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`
- `enableImplicitConversion: true`

This enforces DTO boundaries and prevents unknown payload keys from passing through.

## Secure Usage Checklist

- Set a strong `JWT_SECRET`
- Set a strong `X_API_KEY`
- Use HTTPS in non-local environments
- Restrict CORS origins (current setup enables CORS globally; tighten for production)
- Rotate secrets regularly
- Keep Google OAuth callback URLs exact and environment-specific
