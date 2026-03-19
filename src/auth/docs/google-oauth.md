# Google OAuth — Social Login

This document covers the full Google OAuth flow: how it is implemented in this
NestJS backend and how the paired Next.js frontend should consume it.

> **API versioning**: All backend routes are prefixed with `/v1` (URI
> versioning, `defaultVersion: '1'` in `main.ts`). Every example URL in this
> document reflects that prefix.

---

## Table of Contents

1. [How the flow works](#1-how-the-flow-works)
2. [Backend implementation](#2-backend-implementation)
   - [Environment variables](#21-environment-variables)
   - [Prisma schema changes](#22-prisma-schema-changes)
   - [Files added / modified](#23-files-added--modified)
   - [Account-linking logic](#24-account-linking-logic)
   - [API endpoints](#25-api-endpoints)
3. [Frontend implementation (Next.js)](#3-frontend-implementation-nextjs)
   - [Environment variables](#31-environment-variables)
   - [Initiating login](#32-initiating-login)
   - [Callback page](#33-callback-page)
   - [Token storage](#34-token-storage)
   - [Using tokens](#35-using-tokens)
4. [Security notes](#4-security-notes)
5. [Google Cloud Console setup](#5-google-cloud-console-setup)
6. [Verification checklist](#6-verification-checklist)

---

## 1. How the flow works

```
User clicks "Continue with Google"
  │
  ▼
Frontend navigates browser to:
  GET /v1/auth/google                       ← backend initiates OAuth redirect
  │
  ▼
Google consent screen
  │  (user approves)
  ▼
Google redirects to:
  GET /v1/auth/google/callback              ← backend receives code, exchanges for profile
  │
  │  Backend:
  │  1. Validates Google profile
  │  2. Finds/creates/links account
  │  3. Mints JWT access + refresh tokens
  │
  ▼
Backend redirects browser to:
  FRONTEND_AUTH_CALLBACK_URL#accessToken=...&refreshToken=...
  │
  ▼
Next.js /auth/social-callback page
  │  Reads tokens from URL hash fragment
  │  Stores tokens
  │
  ▼
Redirect to /dashboard (or wherever)
```

The tokens are passed in a **URL hash fragment** (`#`) rather than query params
(`?`) because hash fragments are never sent to servers — they only exist in the
browser. This keeps tokens out of server logs, `Referrer` headers, and browser
history on the receiving end.

---

## 2. Backend implementation

### 2.1 Environment variables

Add these to your `.env`:

```env
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=http://localhost:9010/v1/auth/google/callback
FRONTEND_AUTH_CALLBACK_URL=http://localhost:3000/auth/social-callback
```

These are read via constants in `src/common/constants/auth-constants.ts`.

### 2.2 Prisma schema changes

Two changes to `prisma/schema.prisma`:

```prisma
enum AccountType {
  EMAIL
  MSISDN
  GOOGLE      // added
}

model Account {
  // ... existing fields ...
  googleId   String?  @unique @map("google_id")   // added

  @@index([googleId])                              // added
}
```

Run the migration:

```bash
npx prisma migrate dev --name add-google-auth
```

### 2.3 Files added / modified

| File                                     | Action   | Purpose                                                            |
| ---------------------------------------- | -------- | ------------------------------------------------------------------ |
| `prisma/schema.prisma`                   | Modified | Add `GOOGLE` enum value and `googleId` field                       |
| `src/common/constants/auth-constants.ts` | Modified | Export Google OAuth env constants                                  |
| `src/auth/strategies/google.strategy.ts` | **New**  | Passport Google strategy — calls `signInWithGoogle`                |
| `src/auth/guards/google-auth.guard.ts`   | **New**  | `AuthGuard('google')` wrapper                                      |
| `src/auth/guards/index.ts`               | Modified | Export `GoogleAuthGuard`                                           |
| `src/auth/accounts.repository.ts`        | Modified | `findByGoogleId()`, updated `CreateAccountData` and `update()`     |
| `src/auth/auth.service.ts`               | Modified | `signInWithGoogle()` method                                        |
| `src/auth/auth.controller.ts`            | Modified | `GET /v1/auth/google` and `GET /v1/auth/google/callback` endpoints |
| `src/auth/auth.module.ts`                | Modified | Register `GoogleStrategy` as provider                              |

### 2.4 Account-linking logic

`AuthService.signInWithGoogle()` follows this decision tree:

```
Given: { googleId, email?, name, avatar? }

1. Find account by googleId
   └─ Found → use it

2. Not found + email provided → find account by email
   └─ Found (existing email/OTP account)
      → link: update account.googleId = googleId
      → use it

3. Still not found
   → create new User (name, avatar, default role)
   → create new Account (accountType: GOOGLE, googleId, email?)
   → use it

4. Check account.isActive → throw 401 if inactive

5. Sign JWT + create refresh token → return AuthResponseDto
```

This means a user who registered via email/password can later log in with Google
using the same email — their account is linked automatically without creating a
duplicate.

### 2.5 API endpoints

#### `GET /v1/auth/google`

Initiates the OAuth flow. The browser is redirected to Google's consent screen.
No request body needed.

- Guard: `GoogleAuthGuard` (triggers Passport redirect)
- Auth: `@Open()` (bypasses JWT guard entirely)

#### `GET /v1/auth/google/callback`

Google redirects here after the user consents. Passport validates the profile,
`signInWithGoogle` runs, then the browser is redirected to the frontend.

- Guard: `GoogleAuthGuard`
- Auth: `@Open()`
- Response: `302 Redirect` to
  `FRONTEND_AUTH_CALLBACK_URL#accessToken=...&refreshToken=...`
- The `@Res()` decorator is used directly — NestJS response serialization is
  bypassed for the redirect.

---

## 3. Frontend implementation (Next.js)

### 3.1 Environment variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:9010/v1
```

> Note the `/v1` suffix is included in `NEXT_PUBLIC_API_URL` so all `apiFetch`
> calls stay clean (e.g. `apiFetch('/auth/me')` rather than
> `apiFetch('/v1/auth/me')`).

### 3.2 Initiating login

Add a button anywhere in your login UI. A full browser navigation is required
(not a `fetch`) because the backend returns a redirect chain through Google.

```tsx
// components/GoogleLoginButton.tsx
'use client';

export function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google`;
    // resolves to: http://localhost:9010/v1/auth/google
  };

  return (
    <button onClick={handleGoogleLogin} type="button">
      Continue with Google
    </button>
  );
}
```

### 3.3 Callback page

Create `app/auth/social-callback/page.tsx`. This must be a **client component**
because `window.location.hash` is only available in the browser (not during
SSR).

```tsx
// app/auth/social-callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SocialCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Hash fragment is never sent to the server — browser-only
    const fragment = window.location.hash.slice(1); // strip leading '#'
    const params = new URLSearchParams(fragment);

    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=social_auth_failed');
      return;
    }

    // Store tokens (see §3.4 for storage strategy)
    storeTokens(accessToken, refreshToken);

    // Navigate away — hash fragment is not cleared explicitly because
    // router.replace() navigates to a new URL entirely
    router.replace('/dashboard');
  }, [router]);

  return (
    <div>
      <p>Completing login...</p>
    </div>
  );
}

function storeTokens(accessToken: string, refreshToken: string) {
  // See §3.4 — choose one storage strategy
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}
```

### 3.4 Token storage

The tokens returned by Google login are identical in shape to those returned by
email/password login (`AuthResponseDto`). Use the **same storage mechanism** you
already use for the rest of your auth flows.

| Strategy                                   | Access token                             | Refresh token                             | Notes                                                                                       |
| ------------------------------------------ | ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| **localStorage** (simplest)                | `localStorage`                           | `localStorage`                            | Readable by JS on the page — acceptable for most apps, vulnerable to XSS                    |
| **Memory + httpOnly cookie** (most secure) | In-memory (React state / Zustand / etc.) | `httpOnly` cookie via a Next.js API route | XSS-proof for refresh token; access token lost on page reload so auto-refresh is needed     |
| **httpOnly cookies for both**              | `httpOnly` cookie                        | `httpOnly` cookie                         | Most secure; requires a Next.js API route to set cookies server-side from the callback page |

For the **httpOnly cookie** approach, the callback page should POST the tokens
to a Next.js API route instead of storing them directly:

```tsx
// app/auth/social-callback/page.tsx (httpOnly variant)
useEffect(() => {
  const fragment = window.location.hash.slice(1);
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('accessToken');
  const refreshToken = params.get('refreshToken');

  if (!accessToken || !refreshToken) {
    router.replace('/login?error=social_auth_failed');
    return;
  }

  // POST to Next.js API route which sets httpOnly cookies
  fetch('/api/auth/set-tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
  }).then(() => {
    router.replace('/dashboard');
  });
}, [router]);
```

```ts
// app/api/auth/set-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { accessToken, refreshToken } = await req.json();

  const response = NextResponse.json({ ok: true });

  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days (match JWT_EXPIRES_IN)
  });

  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days (match REFRESH_TOKEN_EXPIRES_IN_DAYS)
  });

  return response;
}
```

### 3.5 Using tokens

Once stored, Google-authenticated users are indistinguishable from
email/password users. Use the access token as a `Bearer` header in all API
requests:

```ts
// lib/api.ts (example)
async function apiFetch(path: string, options?: RequestInit) {
  const accessToken = localStorage.getItem('accessToken'); // or read from cookie/memory

  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  });
}

// Examples:
// apiFetch('/auth/me')           → GET http://localhost:9010/v1/auth/me
// apiFetch('/v1/auth/refresh')   → POST http://localhost:9010/v1/auth/refresh
```

When the access token expires, call `POST /v1/auth/refresh` with the refresh
token to get a new pair — same as for any other auth method.

---

## 4. Security notes

- **Hash fragments vs query params**: `#tokens` are never sent to any server and
  do not appear in server access logs or `Referrer` headers. Query params
  (`?tokens`) would be logged everywhere.
- **HTTPS in production**: Always use `https://` for `GOOGLE_CALLBACK_URL` and
  `FRONTEND_AUTH_CALLBACK_URL` in production. Google OAuth rejects plain HTTP
  callback URLs except for `localhost`.
- **Token expiry**: Access tokens expire per `JWT_EXPIRES_IN` (7 days). Refresh
  tokens expire per `REFRESH_TOKEN_EXPIRES_IN_DAYS` (90 days). Refresh tokens
  are rotated on every use.
- **Account linking**: Google login with an existing email address links to the
  existing account rather than creating a duplicate. A user should not end up
  with two separate accounts.
- **Inactive accounts**: If an account's `isActive` flag is `false`,
  `signInWithGoogle` throws `401 Unauthorized` — same behavior as email login.

---

## 5. Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → **APIs &
   Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Add **Authorized redirect URIs**:
   - Development: `http://localhost:9010/v1/auth/google/callback`
   - Production: `https://api.yourdomain.com/v1/auth/google/callback`
5. Copy the **Client ID** and **Client Secret** into `.env`

---

## 6. Verification checklist

- [ ] Migration ran: `npx prisma migrate dev --name add-google-auth`
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set in `.env`
- [ ] `GOOGLE_CALLBACK_URL` in `.env` is
      `http://localhost:9010/v1/auth/google/callback`
- [ ] The same URL is registered as an authorized redirect URI in Google Cloud
      Console
- [ ] `FRONTEND_AUTH_CALLBACK_URL` points to your Next.js
      `/auth/social-callback` route
- [ ] Visit `http://localhost:9010/v1/auth/google` — Google consent screen
      appears
- [ ] After consent, browser lands on
      `FRONTEND_AUTH_CALLBACK_URL#accessToken=...`
- [ ] DB row: `mtl_accounts` has `account_type = GOOGLE` and `google_id`
      populated
- [ ] Account linking: sign up via email/password with the same email, then run
      the Google flow — verify `google_id` is added to the existing account (no
      duplicate row)
- [ ] `GET /v1/auth/me` with the returned access token returns the correct user
