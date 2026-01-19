# Notes and Improvements - Karabast Integration

## Potential Dangers

### 1. Token Expiration Handling
The current implementation of `refresh-token` generates new tokens but doesn't explicitly revoke old ones beyond replacing them in the database. If Karabast fails to store the new tokens, they might lose access.

### 2. Encryption Key Dependency
All sensitive data is encrypted using `TOKEN_ENCRYPTION_KEY`. If this key is lost or changed, all existing integrations will be broken and users will need to re-link their accounts.

### 3. Lack of Rate Limiting
The `link-confirm` and `refresh-token` endpoints are publicly accessible (protected by client secret). These should ideally have rate limiting to prevent brute-force attempts on tokens, even though tokens are long and random.

### 4. Plaintext linkToken in URL
The `linkToken` is passed back to Karabast as a query parameter in the redirect URI. While common in OAuth2 (as `code`), it's a potential leak point if the user's browser history or logs are compromised.

## Recommended Improvements

### 1. Link Token Expiration
Currently, `linkToken` does not have an expiration time in the database. We should add a `link_token_expires_at` column and check it in `link-confirm`. A 10-15 minute window is usually sufficient.

### 2. Revocation Endpoint
Add an endpoint for Karabast (or Swubase) to explicitly revoke an integration. This should clear all tokens and set `revoked_at`.

### 3. Webhook Notifications
If Swubase data changes (e.g., user deletes a deck), we could implement webhooks to notify Karabast if they have the appropriate scopes.

### 4. Scopes Enforcement
The `scopes` are stored but not currently enforced by the API (as the API doesn't have many protected resources for integrations yet). When adding more endpoints for Karabast, we must ensure they check the authorized scopes.

### 5. Detailed Logging
Add audit logs for integration events (link created, approved, refreshed, failed attempts) to help with debugging and security monitoring.

### 6. User-facing Integration Management
Create a page in Swubase settings where users can see their active integrations and revoke them manually.
