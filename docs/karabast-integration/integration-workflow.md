# Karabast Integration Workflow

This document describes the workflow for linking a Swubase account with a Karabast account for stat tracking.

## Overview

The integration follows an OAuth2-like flow where Karabast redirects the user to Swubase for approval, and Swubase then provides a temporary token back to Karabast to finalize the link and exchange it for API tokens.

## Workflow Steps

### 1. Initiation (Karabast Frontend -> Swubase)
The user clicks "Connect Swubase" on Karabast. Karabast redirects the user to:
`https://swubase.com/settings/link/karabast?response_type=code&client_id={KARABAST_CLIENT_ID}&redirect_uri={REDIRECT_URI}&scope={SCOPES}&karabast_user_id={KARABAST_USER_ID}`

### 2. User Approval (Swubase Frontend)
The user arrives at the `frontend/src/routes/_authenticated/settings/link/karabast/index.tsx` page.
- Swubase displays a confirmation card showing the `karabast_user_id` and requested `scopes`.
- The user clicks the "Approve Link" button.

### 3. Link Token Creation (Swubase Frontend -> Backend)
The frontend calls `POST /api/integration/link-create` with the following payload:
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

### 4. Redirect back to Karabast (Swubase -> Karabast)
The frontend redirects the user back to the `{REDIRECT_URI}` with the following parameters:
- `linkToken`: The generated link token.
- `karabast_user_id`: The external user ID (for double-check).

### 5. Link Approval (Karabast -> Swubase Backend)
Karabast calls `POST /api/integration/link-confirm` from its server-side:
- `integration`: "karabast"
- `clientId`: Swubase client ID.
- `clientSecret`: Swubase client secret.
- `linkToken`: The token received in the redirect.
- `karabastUserId`: The external user ID.

The backend (`server/routes/integration/link-confirm/post.ts`):
- Validates `clientId` and `clientSecret`.
- Finds the `user_integration` record by `karabastUserId` and matching (decrypted) `linkToken`.
- Generates `accessToken` and `refreshToken`.
- Encrypts and stores the tokens, sets `linkedAt` timestamp, and clears the `linkTokenEnc`.
- Returns the tokens to Karabast.

### 6. Token Refresh (Karabast -> Swubase Backend)
When the access token expires, Karabast calls `POST /api/integration/refresh-token`:
- `refreshToken`: The current refresh token.
- `clientId`: Swubase client ID.
- `clientSecret`: Swubase client secret.
- `karabastUserId`: The external user ID.

The backend (`server/routes/integration/refresh-token/post.ts`):
- Validates credentials.
- Finds the record by `refreshTokenEnc` and `karabastUserId`.
- Generates, encrypts, and stores new tokens.
- Returns new tokens to Karabast.

## Security
- All tokens are encrypted using AES-256-CBC before storage in the database.
- `linkToken` is one-time use and cleared after approval.
- Client ID and Secret are required for server-to-server communication.
