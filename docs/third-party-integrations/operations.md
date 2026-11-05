# Third-party integrations: SWUBASE operations

These notes are for SWUBASE maintainers. App developers should start with the
[developer guide](../third-party-integrations.md).

## Deployment and storage

Apply generated migrations against the intended database as part of deploying
the matching API/UI. Coordinate schema removal with the server update: an old
server that still inserts a removed column cannot keep serving that operation.
No new signing key or encryption environment variable is required by this
integration service.

SWUBASE retains only SHA-256 hashes of high-entropy client secrets, authorization
codes, and access/refresh tokens. Resource requests authorize the connected
player from the token, never from a caller-selected user ID. App/player account
restrictions and consent scopes are enforced by the backend.

The contributor-data sanitizer removes all app registrations, codes,
connections, and consumed refresh-token hashes regardless of sharing opt-in.
Normal game-result privacy rules still apply. Do not copy live credentials into
development data.

Authorization codes expire after five minutes and expired codes are cleaned up
per app during consent. At most one pending code and one connection exist per
app/player. There is no scheduled cleanup of dormant registrations or expired
connections in this version. Consumed refresh-token hashes remain until their
original expiry for reuse detection and are pruned for that connection during
refresh. Reconnection and revocation remove the old token history.

Rate limits are in memory, bounded by LRU eviction, and best effort per server
process. Configure volumetric and source-IP protection at the trusted ingress,
including for deployments with multiple replicas. The service does not trust
caller-supplied forwarded IP headers as a limiter identity.

## Repository checks

Use this worktree's isolated database and development environment:

```bash
bun --env-file=.env.worktree run db-migrate
bun run test:integration-apps
bun run --cwd frontend build
bun run test:browser:integration-apps
```

The integration test command opts into database tests using `.env.worktree`.
Sanitization tests execute the actual sanitizer SQL inside rolled-back
transactions. The browser check requires the worktree app to be running; it
creates and removes synthetic accounts and writes screenshots under ignored
`.swubase/` state. The browser command reads `.env` and `.env.worktree`.

## Implementation references

| Concern                                         | Source of truth                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Request validation and permissions              | [Shared contracts](../../shared/types/integrationApp.ts)                    |
| HTTP routes, body limits, and response wrappers | [API route](../../server/routes/integration-apps.ts)                        |
| Consent, code exchange, and refresh rotation    | [Authorization service](../../server/lib/integration-apps/authorization.ts) |
| App ownership, changes, and revocation          | [Management service](../../server/lib/integration-apps/management.ts)       |
| Bearer access and account restrictions          | [Access helpers](../../server/lib/integration-apps/access.ts)               |
| Game persistence and correction semantics       | [Resource service](../../server/lib/integration-apps/resources.ts)          |
| Database tables                                 | [Integration schema](../../server/db/schema/integration_app.ts)             |

App creation/update API payloads accept only `name`, `description`, `redirectUris`,
and `scopes`. Settings mutations require a SWUBASE session and its own request
guard; they are separate from the external client API documented in the guide.

Keep the external guides aligned with these sources when behavior changes. This
integration service remains separate from the legacy Karabast contract and MCP
OAuth provider.
