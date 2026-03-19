# Development Workflow

This document captures a practical workflow for extending the starter safely and consistently.

## Daily Commands

Install:

```bash
pnpm install
```

Run API:

```bash
pnpm start:dev
```

Run lint:

```bash
pnpm lint
```

Run tests:

```bash
pnpm test
pnpm test:e2e
```

## Feature Implementation Flow

Recommended order:

1. update Prisma schema (if needed)
2. generate/apply migration
3. update DTOs
4. update repository queries
5. update service business logic
6. update controller routes/contracts
7. add or update tests
8. update docs

## Adding a New Module

For a new domain feature:

1. create `src/<feature>/`
2. add:
   - `<feature>.module.ts`
   - `<feature>.controller.ts`
   - `<feature>.service.ts`
   - `<feature>.repository.ts` (if data access needed)
   - `dto/*`
3. register module in `app.module.ts` (or import via an existing feature module)
4. expose Swagger decorators for routes and DTOs

## Guard and Access Design

When adding endpoints:

- use `@Open()` only for endpoints that must skip both API key and JWT checks
- use `@Public()` for unauthenticated JWT routes that still should respect API key policy
- add `@Roles(...)` where role restrictions are needed

## DTO and Validation Rules

- use dedicated DTOs for create/update/query contracts
- annotate with `class-validator`
- keep transformations explicit (`class-transformer`)
- rely on global validation pipe, do not parse input manually in controllers

## Pagination Pattern

Use `PaginationService.paginate()` in services:

- pass `dataFetcher(skip, take)`
- optionally pass `countFetcher()`
- return `PaginationResponse<T>` shape

Reference docs:

- `src/common/services/pagination/docs/PAGINATION_IMPLEMENTATION.md`
- `src/common/services/pagination/docs/PAGINATION_EXAMPLE.md`

## Testing Approach

- unit tests for service/repository logic
- e2e tests for route-level behavior
- cover both success and failure paths
- keep mocks close to behavior being tested

## Release Hygiene

Before merging:

- `pnpm lint` passes
- `pnpm test` passes
- if API contract changed, update Swagger annotations + docs
- if schema changed, ensure migration files are included
