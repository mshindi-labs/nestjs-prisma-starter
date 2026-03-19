# API Reference

This is a practical route map for the current starter implementation.

## Base URL and Versioning

- URI versioning is enabled with default version `v1`
- Most controllers resolve under `/v1/...`
- `AppController` is version-neutral (`/` and `/health`)

## Open Utility Endpoints

## `GET /`

- Purpose: quick root status
- Response: `{ "message": "OK!" }`

## `GET /health`

- Purpose: runtime health snapshot
- Response includes:
  - `status`
  - `uptime`, `uptimePretty`
  - `timestamp`
  - `memory` and process memory usage
  - `cpu` platform/load summary

## Auth Endpoints (`/v1/auth`)

## `POST /signup`

- Creates account and returns auth payload
- Decorators: `@Public()` + throttled

## `POST /login`

- Email/MSISDN login path
- Decorators: `@Public()` + throttled

## `POST /refresh`

- Exchanges refresh token for a new auth payload
- Decorator: `@Public()`

## `PATCH /password/update`

- Requires authenticated user
- Changes current user password

## `POST /password/reset/request`

- Starts reset flow (usually via OTP)
- Decorators: `@Public()` + throttled

## `PATCH /password/reset`

- Completes reset flow
- Decorator: `@Public()`

## `POST /otp/request`

- Requests login OTP
- Decorators: `@Public()` + throttled

## `POST /otp/resend`

- Invalidates existing OTP and sends a new one
- Decorators: `@Public()` + throttled

## `POST /otp/verify`

- Verifies OTP and returns auth payload
- Decorators: `@Public()` + throttled

## `GET /me`

- Returns current account + nested user profile
- Requires JWT authentication

## `GET /google`

- Initiates Google OAuth redirect
- Decorators: `@Open()` + `@UseGuards(GoogleAuthGuard)`

## `GET /google/callback`

- OAuth callback, returns redirect to frontend callback URL with hash fragment tokens
- Decorators: `@Open()` + `@UseGuards(GoogleAuthGuard)`

For full OAuth flow details, see `src/auth/docs/google-oauth.md`.

## Users Endpoints (`/v1/users`)

## `GET /`

- Returns paginated users
- Query params:
  - `page`
  - `size`
  - `role_id`
  - `search` (name/email/msisdn)

Response shape:

```json
{
  "records": [],
  "page": 1,
  "size": 20,
  "count": 0,
  "pages": 0
}
```

## `GET /user/:user_id`

- Returns a single user by numeric id

## `GET /user/:user_id/profile-status`

- Returns:
  - `isProfileComplete`
  - `hasDefaultName`
  - `hasDefaultRole`

## `POST /`

- Creates user
- Supports default role fallback when `roleId` is not provided

## `PATCH /user/:user_id`

- Updates user fields
- Handles account email/msisdn updates in transaction
- Checks uniqueness conflicts

## `DELETE /user/:user_id`

- Deletes user by id
- Returns `204`

## Auth Header Patterns

For routes not marked `@Open()`:

- provide `Authorization: Bearer <token>` or
- provide `x-api-key: <X_API_KEY>`

For routes marked `@Public()` but not `@Open()`, API key still applies unless bearer token is present.

## Swagger

- UI: `/api-docs`
- JSON: `/api-docs/json`

Swagger includes bearer auth config named `access-token`.
