# Database and Prisma

This starter uses Prisma with PostgreSQL and supports two adapters at runtime.

## Prisma Configuration

Schema file:

- `prisma/schema.prisma`

Generator:

- provider: `prisma-client`
- output: `generated/prisma`
- engine: `client`

Datasource:

- provider: `postgresql`
- connection configured via env variables

## Runtime Adapter Selection

`PrismaService` selects adapter by `DB_ADAPTER`:

- `pg` -> `PrismaPg`
- `neon` -> `PrismaNeon`

Both use `DATABASE_URL` as `connectionString`.

## Environment Variables

Used for db connectivity:

- `DATABASE_URL`
- `DB_ADAPTER`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE`

## Prisma Client Lifecycle

`PrismaService`:

- connects in `onModuleInit()`
- disconnects in `onModuleDestroy()`
- logs connection state

## Schema Model Overview

Current domain entities:

- `Organization`
- `Roles`
- `User`
- `Account`
- `OTP`
- `RefreshToken`

Important enum types:

- `AccountType`: `EMAIL`, `MSISDN`, `GOOGLE`
- `OTPType`: `EMAIL_VERIFICATION`, `MSISDN_VERIFICATION`, `LOGIN`, `PASSWORD_RESET`

## Typical Prisma Commands

Generate client:

```bash
pnpm prisma generate
```

Create/apply migration:

```bash
pnpm prisma migrate dev --name <migration_name>
```

Inspect db in Prisma Studio:

```bash
pnpm prisma studio
```

## Migration Workflow

Recommended sequence:

1. edit `prisma/schema.prisma`
2. run `pnpm prisma migrate dev --name <name>`
3. run `pnpm prisma generate`
4. update services/repositories/tests for new fields

## Query Patterns in This Starter

- repositories encapsulate Prisma queries
- services handle business logic and checks
- transactional update example exists in users update flow (`user` + `account` updates)
- pagination is abstracted via `PaginationService` with `dataFetcher`/`countFetcher`

## Production Notes

- avoid schema drift by committing migrations with schema changes
- use a managed PostgreSQL service or hardened self-hosted setup
- keep connection and secret values out of source control
