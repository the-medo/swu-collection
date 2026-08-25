---
name: swubase-karabast-integration
description: Change SWUBASE Karabast account linking, encrypted tokens, credentials, game-result ingestion/deduplication, card-ID mapping, mocks, or unlink/refresh flows.
---

# SWUBASE Karabast integration

Use this skill for Karabast routes, settings UI, integration tables, token
utilities, game-result transformation, or preview-card ID mapping. Before
acting, read both files completely:

- `docs/karabast-integration/integration-workflow.md`
- `docs/karabast-integration/notes-and-improvements.md`

Treat the Zod schemas in `server/routes/integration/` as the exact wire-contract
source of truth. In particular, current server-to-server link-confirm and token
refresh payloads use snake_case fields.

## Security and data invariants

- User approval creates a single-use-intended link token; the normal
  confirmation path clears it after issuing access/refresh tokens. Current
  confirmation and refresh rotation are check-then-update operations, so
  concurrent requests can both pass. Use a conditional/transactional claim
  before promising strict single-use behavior.
- Store only encrypted tokens. Keep `TOKEN_ENCRYPTION_KEY` stable and in the
  environment; changing it invalidates existing integrations.
- Validate the Karabast client ID/secret on every server-to-server route. Do not
  log credentials, plaintext tokens, or inbound player access tokens.
- Strip player access tokens before saving `integration_game_data`.
- Scopes are stored but are not universally enforced today. Any new
  integration-accessible resource must define and enforce its required scope.
- Do not claim link-token expiration, revocation semantics, or rate limiting
  unless the implementation actually enforces them; the improvements document
  tracks known gaps.
- Game ingestion currently matches the access token without enforcing
  `accessTokenExpiresAt`, `revokedAt`, or scopes, and the link flow does not
  allowlist `redirect_uri`. Treat these as known security gaps, not guarantees.

Game ingestion resolves official card UIDs first, active preview inbound IDs
second, and a trimmed raw ID last. Basic bases may require their special key.
Preserve deterministic preview collision handling and lobby-match legacy alias
deduplication. Keep the advisory-lock/transaction behavior that prevents two
games from creating conflicting match identities, and publish realtime results
only after upsert.

Load `swubase-preview-cards` for preview mappings,
`swubase-websockets` for game-result events, and
`swubase-development-data` for retention/sanitization changes.

## Validation

Run:

```bash
bun test server/lib/game-results/resolveKarabastCardId.test.ts
```

Then exercise link create/confirm,
refresh, unlink, invalid credentials, expired refresh token, duplicate lobby
ingestion, and token stripping against development credentials only. Never send
a test payload to production unintentionally.

`server/lib/game-results/test-karabast-integration-data-post.ts` decrypts a
stored token and inserts integration/match/game-result data.
`test-karabast-transform.ts` can insert `karabast_lobby_match` rows even without
`--upsert`. Both are mutating and may run only against an isolated disposable
worktree database.
