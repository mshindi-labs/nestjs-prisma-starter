# Getting Started

This guide gets you from clone to running API quickly with the current project behavior.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (local or hosted)

## Installation

```bash
pnpm install
```

## Environment Setup

Copy and edit:

```bash
cp .env.example .env
```

Required variables include:

- `PORT`
- `DATABASE_URL`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `DB_ADAPTER` (`pg` or `neon`)
- `X_API_KEY`
- `CLIENT_ID`, `CLIENT_SECRET`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`, `FRONTEND_AUTH_CALLBACK_URL`

## Prisma Setup

Generate client to `generated/prisma`:

```bash
pnpm prisma generate
```

Create/apply migrations:

```bash
pnpm prisma migrate dev
```

## Run the Application

```bash
pnpm start:dev
```

Server startup uses:

- `PORT` env variable when set
- fallback `8000` when missing

## Verify Installation

Basic checks:

- `GET /` returns `{ "message": "OK!" }`
- `GET /health` returns runtime health info
- Swagger UI opens at `/api-docs`

## First Authenticated Request

Most versioned endpoints are under `/v1`. For requests that are not `@Open()`, include at least one of:

- `Authorization: Bearer <jwt>`
- `x-api-key: <X_API_KEY>`

Example:

```bash
curl -H "x-api-key: $X_API_KEY" http://localhost:9011/v1/users
```

## Troubleshooting

- **Environment validation failed on boot**
  - ensure all required `.env` values are present and valid
- **Prisma connection issues**
  - verify `DATABASE_URL` and `DB_ADAPTER`
  - verify PostgreSQL connectivity
- **401 unauthorized**
  - confirm your route is not `@Open()`
  - pass `x-api-key` or a valid JWT
