# Karabast Integration Workflow

This document describes the workflow for linking a Swubase account with a Karabast account for stat tracking.

## Overview

The integration follows an OAuth2-like flow where Karabast redirects the user to Swubase for approval, and Swubase then provides a temporary token back to Karabast to finalize the link and exchange it for API tokens.

## Workflow Steps

### 1. Initiation (Karabast Frontend -> Swubase Frontend)
The user clicks "Link Swubase" button on Karabast. Karabast redirects the user to Swubase page:
`https://swubase.com/settings/link/karabast?response_type=code&client_id={KARABAST_CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope={SCOPES}&karabast_user_id={KARABAST_USER_ID}`

### 2. User Approval (Swubase Frontend)
The user arrives at the Swubase `frontend/src/routes/_authenticated/settings/link/karabast/index.tsx` page.
- Swubase displays a confirmation card showing the requested `scopes`. The
  external user ID is currently accepted but not displayed.
- The user clicks the "Approve Link" button.

The current page casts its search parameters instead of validating them and
redirects the plaintext link token to the supplied `redirect_uri`. Treat real
Zod search validation and an allowlist tying redirect origins to the configured
Karabast client as required security hardening, not as behavior already
enforced.

### 3. Link Token Creation (Swubase Frontend -> Swubase Backend)
The Swubase frontend calls Swubase endpoint `POST /api/integration/link-create` with the following payload:
- `clientId`: The client ID received from Karabast.
- `externalUserId`: The `karabast_user_id`.
- `scopes`: The requested scopes.
- `integration`: "karabast"
- `metadata`: {}

The backend (`server/routes/integration/link-create/post.ts`):
- Validates the `clientId` against the environment variable `KARABAST_CLIENT_ID`.
- Generates a random `linkToken`.
- Encrypts the `linkToken` and stores it in the `user_integration` table along with the `externalUserId` and current `userId`.
- Returns the plain `linkToken` to the frontend.

### 4. Redirect back to Karabast (Swubase frontend -> Karabast )
The frontend redirects the user back to the `{REDIRECT_URI}` (probably `/api/swubase`) with the following parameters:
- `link_token`: The generated link token.
- `karabast_user_id`: The external user ID (for double-check).

### 5. Link Approval (Karabast backend -> Swubase Backend)
Karabast backend calls Swubase endpoint `POST /api/integration/link-confirm`
with the current snake_case wire payload:
- `integration`: `"karabast"`
- `client_id`: Karabast's configured client ID.
- `client_secret`: Karabast's configured client secret.
- `external_user_id`: The Karabast user ID.
- `link_token`: The single-use-intended token received in the redirect.

The backend (Swubase) (`server/routes/integration/link-confirm/post.ts`):
- Validates `clientId` and `clientSecret`.
- Resolves the integration ID, loads records matching that ID and
  `externalUserId`, then decrypts each `linkTokenEnc` to compare it with the
  supplied token. Encrypted token ciphertext cannot be queried directly because
  encryption uses a random IV.
- Generates `accessToken` and `refreshToken`.
- Encrypts and stores the tokens, sets `linkedAt` timestamp, and clears the `linkTokenEnc`.
- Returns the tokens to Karabast.

### 6. Token Refresh (Karabast -> Swubase Backend)
When the access token expires, Karabast calls Swubase endpoint
`POST /api/integration/refresh-token` with the current snake_case wire payload:
- `integration`: `"karabast"`
- `refresh_token`: The current refresh token.
- `client_id`: Karabast's configured client ID.
- `client_secret`: Karabast's configured client secret.
- `external_user_id`: The external Karabast user ID.

The Swubase backend (`server/routes/integration/refresh-token/post.ts`):
- Validates credentials.
- Resolves the integration ID, loads records matching that ID and
  `externalUserId`, then decrypts each `refreshTokenEnc` to compare it with the
  supplied token.
- Generates, encrypts, and stores new tokens.
- Returns new tokens to Karabast.

The route Zod schemas are the exact wire-contract source of truth. Keep this
document synchronized with them whenever request fields change.

## Security
- All tokens are encrypted using AES-256-CBC before storage in the database.
- The normal confirmation path clears `linkTokenEnc` after approval. The claim
  is not currently atomic, so concurrent confirmations can both pass the check;
  make consumption conditional/transactional before treating the token as
  strictly single-use. Refresh-token rotation has the same concurrency gap.
- Client ID and Secret are required for server-to-server communication.
