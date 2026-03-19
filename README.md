# NestJS + Prisma Starter

Production-oriented starter API built with NestJS, Prisma, PostgreSQL, JWT auth, API-key support, rate limiting, Swagger, and modular feature structure.

## What This Starter Includes

- NestJS v11 backend with modular feature structure (`auth`, `users`, `common`, `prisma`)
- Prisma v7 client generated to `generated/prisma`
- PostgreSQL support with pluggable Prisma adapter (`pg` or `neon`)
- Authentication stack:
  - JWT access + refresh token flow
  - Email/password + MSISDN/OTP support
  - Google OAuth (`/v1/auth/google`)
- Global security and request handling:
  - API key guard
  - JWT guard
  - role-based guard
  - request validation pipe
  - throttling presets (`short`, `medium`, `long`)
- Swagger docs at `/api-docs`
- Shared pagination service and DTO patterns

## Tech Stack

- NestJS
- Prisma
- PostgreSQL
- Passport (`jwt`, `google-oauth20`)
- class-validator / class-transformer
- Jest + Supertest
- pnpm

## Quick Start

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and fill in all required values.

```bash
cp .env.example .env
```

At minimum, ensure:

- `DATABASE_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `DB_ADAPTER` (`pg` or `neon`)
- `X_API_KEY`
- `JWT_SECRET`
- `CLIENT_ID`, `CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_AUTH_CALLBACK_URL`

### 3) Generate Prisma client

```bash
pnpm prisma generate
```

### 4) Apply migrations

```bash
pnpm prisma migrate dev
```

### 5) Run the API

```bash
pnpm start:dev
```

Default listen behavior:

- uses `PORT` from environment when provided
- falls back to `8000` in code if `PORT` is missing

## Scripts

### Development

- `pnpm start` - start app
- `pnpm dev` - start in watch mode
- `pnpm start:dev` - start in watch mode
- `pnpm start:debug` - debug + watch
- `pnpm build` - compile
- `pnpm start:prod` - run compiled build

### Code Quality

- `pnpm lint` - run eslint (`--fix`)
- `pnpm format` - format source/test files

### Testing

- `pnpm test` - unit tests
- `pnpm test:watch` - test watch mode
- `pnpm test:cov` - test coverage
- `pnpm test:e2e` - e2e tests

### Prisma

- `pnpm prisma generate`
- `pnpm prisma migrate dev`

## API Surface

Versioning is URI-based with default version `v1`. Most controllers are served as `/v1/...`.

### Public/Open utility routes

- `GET /` - root status
- `GET /health` - process/runtime health details

### Auth routes (`/v1/auth`)

- `POST /signup`
- `POST /login`
- `POST /refresh`
- `PATCH /password/update`
- `POST /password/reset/request`
- `PATCH /password/reset`
- `POST /otp/request`
- `POST /otp/resend`
- `POST /otp/verify`
- `GET /me`
- `GET /google`
- `GET /google/callback`

### User routes (`/v1/users`)

- `GET /`
- `GET /user/:user_id`
- `GET /user/:user_id/profile-status`
- `POST /`
- `PATCH /user/:user_id`
- `DELETE /user/:user_id`

## Authentication and Access Model

Global guards are applied in this order:

1. `ApiKeyGuard`
2. `JwtAuthGuard`
3. `RolesGuard`

Behavior summary:

- `@Open()` routes bypass API key + JWT requirements
- `@Public()` routes bypass JWT, but still require `x-api-key` unless they are also `@Open()`
- Bearer token requests are accepted by API key guard and then validated by JWT guard

For details, see `docs/auth-and-security.md`.

## Swagger

- UI: `/api-docs`
- JSON: `/api-docs/json`

Swagger is configured with Bearer auth definition named `access-token`.

## Project Structure

```text
src/
  app.controller.ts
  app.module.ts
  app.service.ts
  main.ts
  auth/
  users/
  prisma/
  common/
prisma/
  schema.prisma
generated/
  prisma/
```

## Database

Prisma schema lives at `prisma/schema.prisma`.

Current core models:

- `Organization`
- `Roles`
- `User`
- `Account`
- `OTP`
- `RefreshToken`

Current datasource provider is PostgreSQL.

## Documentation Index

Additional project docs live in `docs/`:

- `docs/getting-started.md`
- `docs/project-architecture.md`
- `docs/api-reference.md`
- `docs/auth-and-security.md`
- `docs/database-and-prisma.md`
- `docs/development-workflow.md`

Feature-specific docs that already exist:

- `src/auth/docs/google-oauth.md`
- `src/common/services/pagination/docs/PAGINATION_IMPLEMENTATION.md`
- `src/common/services/pagination/docs/PAGINATION_EXAMPLE.md`

## License

`MIT`
