# Project Architecture

This starter follows a feature-first NestJS structure with shared utilities and Prisma as data layer.

## High-Level Structure

```text
src/
  app.module.ts
  main.ts
  auth/
  users/
  prisma/
  common/
```

## Runtime Bootstrap (`main.ts`)

Global setup includes:

- CORS enabled
- `morgan('dev')` request logging
- `helmet()` security headers
- global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- URI versioning (`v1` default)
- Swagger (`/api-docs`, `/api-docs/json`)
- global guards:
  - `ApiKeyGuard`
  - `JwtAuthGuard`
  - `RolesGuard`

## Module Composition (`app.module.ts`)

Registered modules:

- `ConfigModule` (global + env validation)
- `ThrottlerModule` presets:
  - `short`: `10 req / 1s`
  - `medium`: `30 req / 10s`
  - `long`: `100 req / 60s`
- `CommonModule` (global utilities)
- `PrismaModule` (database client)
- `AuthModule`

## Feature Modules

## `auth`

Responsibilities:

- sign up / login
- token refresh flow
- password update + reset
- OTP request/resend/verify
- Google OAuth handshake
- JWT strategy validation

Key files:

- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/strategies/google.strategy.ts`
- `src/auth/guards/*`

## `users`

Responsibilities:

- CRUD endpoints
- filtered/paginated listing
- profile completeness evaluation

Key files:

- `src/users/users.controller.ts`
- `src/users/users.service.ts`
- `src/users/users.repository.ts`

## `prisma`

Responsibilities:

- initialize Prisma client on module init
- close client on module destroy
- pick db adapter from env (`pg`/`neon`)

Key files:

- `src/prisma/prisma.module.ts`
- `src/prisma/prisma.service.ts`
- `prisma/schema.prisma`

## `common`

Responsibilities:

- constants and env wiring
- reusable DTOs
- decorators (`@User`, `@Roles`)
- pagination service
- utility functions and errors

## Layering Pattern

General flow:

- **Controller**: HTTP boundary + validation DTOs
- **Service**: business logic, orchestration, safety checks
- **Repository**: Prisma queries
- **Prisma Service**: db client lifecycle

## Data Model Snapshot

Primary Prisma models:

- `Organization`
- `Roles`
- `User`
- `Account`
- `OTP`
- `RefreshToken`

Relationships include:

- `User -> Roles` (many-to-one)
- `User -> Organization` (optional many-to-one)
- `User -> Account` (one-to-many)
- `Account -> OTP` and `Account -> RefreshToken` (one-to-many)

## Request Security Path

For non-open endpoints:

1. API key guard check (unless bearer token already present)
2. JWT validation (unless route is `@Public()` or `@Open()`)
3. role authorization (if `@Roles(...)` metadata exists)

See `docs/auth-and-security.md` for details.
