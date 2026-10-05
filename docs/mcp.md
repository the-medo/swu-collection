# SWUBASE MCP

The separate Bun/Hono service lives in `mcp/` and exposes Streamable HTTP at
**`https://mcp.swubase.com/mcp`**. Its only tool is `search_cards`: a case-insensitive
card-name/ID search of the checked-in official catalog, with card text and detail
links. `limit` defaults to 10 and is capped at 25; `offset` supports pagination.
Preview cards are excluded. No collections, decks or account mutations are exposed.

Login stays on the main application. The Better Auth MCP/OAuth provider uses
existing Google/GitHub accounts, signed consent requests, authorization codes and
PKCE S256. Clients discover the issuer and register dynamically. Only
`cards:read` and optional `offline_access` are available; client-credentials grants
are disabled. Dynamic client names are self-reported and shown with their client ID.
The initial authentication challenge requests `offline_access`, so discovery-driven
clients receive a refresh token. Access tokens last five minutes. The MCP service also checks the live user,
session, client, resource and consent on every request, so bans, expired/deleted
sessions, disabled clients and removed consent deny access immediately.

The MCP runtime creates its own Drizzle client over a PostgreSQL pool capped at
four connections. It reuses the main application's table definitions with the
restricted MCP database role, without importing the main application's connection
or auth configuration. Queries use Drizzle's typed builders; PostgreSQL SQL
fragments handle UTC timestamp expressions and the transactional per-user lock.

This uses Better Auth 1.7.7 on both sides, Drizzle 0.45.2, Zod 4.6.5 and the MCP
SDK 2.3.1. The SDK serves both 2025 and 2026 protocol formats in stateless mode.
The [Better Auth MCP documentation](https://better-auth.com/docs/plugins/mcp) and
[MCP server guide](https://modelcontextprotocol.io/docs/develop/build-server)
describe the underlying authorization and transport.

## First production rollout

1. Pause the maintainer's scheduled sanitized export for this rollout. Its new
   cleanup SQL requires the new tables. Keep further production pushes paused
   until the migration handoff completes.
2. In the **existing main app**, add the runtime environment variable:

   ```dotenv
   MCP_RESOURCE_URL=https://mcp.swubase.com/mcp
   ```

   Keep its current `BETTER_AUTH_URL=https://swubase.com`, auth secret and provider
   credentials. Do not enable cross-subdomain cookies. Google/GitHub callbacks
   stay on the main app; no new provider callback for the MCP hostname is needed.

3. Deploy the main app after merging this branch. Migration `0072` adds the OAuth
   tables and usage ledger without modifying existing account tables. Startup
   completes migrations before auth initialization and HTTP admission. Verify
   `Migration complete` and `Server running` in Coolify, then check
   `https://swubase.com/.well-known/oauth-authorization-server/api/auth` returns JSON
   with issuer `https://swubase.com/api/auth` and a registration endpoint.
4. Create a dedicated database login using an owner/admin `psql` connection to
   the **existing SWUBASE database**. Choose a generated password and enter it
   interactively; do not commit it:

   ```sql
   CREATE ROLE swubase_mcp LOGIN CONNECTION LIMIT 8;
   \password swubase_mcp
   \i mcp/deploy/grants.sql
   ```

   The grant script reads only the columns needed for access checks and inserts/
   updates usage. It cannot read session tokens, OAuth secrets, signing keys,
   email addresses, collections or decks. No schema ownership or migration rights
   are required. Apply the script using a checkout containing this branch, or
   copy its SQL into your administrator session. `DBNAME` is a built-in psql
   variable for the connected database.

   Drizzle includes defaulted ledger fields in its insert statement, so the script
   grants INSERT permission for each current usage column. SELECT and UPDATE stay
   limited to the columns needed by MCP. If the MCP role already exists, reapply
   `mcp/deploy/grants.sql` before deploying this version.

## Coolify application

Create a **new Git-backed Application** in the same project/server and private
network as PostgreSQL. Use this repository and `main`; leave the existing backend
as its own application. Set:

| Setting                        | Value                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Build pack                     | Dockerfile                                                                              |
| Base directory                 | `/`                                                                                     |
| Dockerfile location            | `/Dockerfile.mcp`                                                                       |
| Container port / Ports Exposes | `3210`                                                                                  |
| Domains                        | `https://mcp.swubase.com:3210`                                                          |
| Health check                   | Use the image's built-in Bun health check; leave Coolify's separate HTTP check disabled |
| Persistent volumes             | None                                                                                    |

The port in Coolify's domain selects the **container** port; public clients use
HTTPS on 443. Route the whole hostname, including both well-known discovery
paths. Do not add a `/mcp` path prefix or strip paths. See
[Coolify domains and target ports](https://coolify.io/docs/core/networking/domains).

Add these **runtime** variables, with the database URL using the private database
hostname and the new role's URL-encoded password:

```dotenv
DATABASE_URL=postgresql://swubase_mcp:YOUR_URL_ENCODED_PASSWORD@YOUR_PRIVATE_DB_HOST:5432/YOUR_DATABASE
MCP_RESOURCE_URL=https://mcp.swubase.com/mcp
MCP_AUTH_ISSUER=https://swubase.com/api/auth
MCP_HOST=0.0.0.0
MCP_PORT=3210
MCP_CALLS_PER_MINUTE=60
```

The image defaults to `0.0.0.0:3210`; setting the values explicitly makes the
Coolify configuration visible. The service needs outbound HTTPS to the main
app's JWKS endpoint and private PostgreSQL access. It needs no Better Auth secret,
Google/GitHub credentials, frontend build variables or public host-port mapping.
Native MCP clients do not need `MCP_ALLOWED_ORIGINS`. For a browser-based client,
add its exact HTTPS origin to that comma-separated variable. Wildcards are refused.

## Cloudflare DNS and TLS

1. In the `swubase.com` zone, add an **A** record named **`mcp`** pointing to the
   public IP of the server running Coolify's proxy. Add AAAA only if that server
   also accepts IPv6. Initially use **DNS only** while checking the origin route
   and certificate. If the deployment uses Cloudflare Tunnel instead of a public
   IP, add this hostname to the existing tunnel and route it to the Coolify proxy.
2. Save the HTTPS domain in Coolify and deploy. Allow inbound 80/443 to its proxy
   so automatic certificate issuance can complete.
3. You may then enable Cloudflare proxying. Use **Full (strict)** with a valid
   origin certificate; keep both browser-to-Cloudflare and Cloudflare-to-origin
   connections encrypted. See [Cloudflare Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
4. Ensure cache rules bypass `mcp.swubase.com`, and exclude this API hostname from
   interactive browser challenges or Cloudflare Access login pages. Preserve
   Authorization headers and the app's OAuth error responses. The main app's
   `/api/auth/*` and authorization-server discovery route must also remain usable
   by MCP clients. The API sets `Cache-Control: no-store`.

Verify the public discovery document and an unauthenticated request:

```bash
curl -i https://mcp.swubase.com/.well-known/oauth-protected-resource/mcp
curl -i -X POST https://mcp.swubase.com/mcp \
  -H 'Content-Type: application/json' -d '{}'
```

Expect JSON metadata naming the main-app issuer, then HTTP **401** with a
`WWW-Authenticate` header pointing to that metadata. A 404 at `/` or a 405 for an
authenticated GET `/mcp` is normal: this is an API, and it keeps no HTTP sessions.
Connect an OAuth-capable agent to `https://mcp.swubase.com/mcp`, sign in, approve
access, and call `search_cards` with `{"query":"Darth Vader","limit":5}`.
Native clients registering HTTP loopback callbacks should send
`application_type: "native"` and a loopback IP redirect URI.

## GitHub deployment wiring

Add Actions secret **`COOLIFY_WEBHOOK_MCP`** with this new application's
authenticated deployment webhook. Use the existing `COOLIFY_TOKEN`; keep
`COOLIFY_DEPLOY_ENABLED` as the deployment switch. Disable the new application's
Coolify Auto Deploy if GitHub Actions owns deployments, as described in
[deployment.md](deployment.md).

`mcp/` and `Dockerfile.mcp*` select only MCP. Root dependencies, shared contracts,
auth, database schema and catalog changes also select MCP. The workflow offers a
manual `mcp` selection. Migration pushes hold **both MCP and Crossfire** until the
main app's migrations are verified: manually deploy each held service afterward.
Re-running the push retains the hold. A separate `Check MCP` workflow runs the
focused typecheck and unit tests without database or production credentials.
OAuth, reconnect challenges, revocation and database grants are covered by the
opt-in local database integration test, which CI skips. The maintainer is selected
for sanitizer changes; re-enable its schedule after migrations and its deployment
finish.

## Usage and revocation

`mcp_tool_usage` stores user ID, registered client ID, tool, start time, outcome,
returned-card count and duration. It records admitted, validated tool executions,
including empty searches and failures. Authentication failures, discovery,
validation failures and rate-limit denials are not tool executions. Browser and
server telemetry omit OAuth pages, API requests and their signed query strings. Admission is
limited per user across clients/replicas (60 per minute by default); it is not a
billing system. Queries, arguments, tokens and headers are never stored.

Inspect usage through an **owner/admin database connection**:

```sql
SELECT u.display_name, t.user_id, t.client_id, t.tool, count(*) AS calls,
       count(*) FILTER (WHERE t.outcome = 'success') AS successful,
       sum(t.result_count) AS cards_returned, sum(t.duration_ms) AS total_ms
FROM mcp_tool_usage t JOIN "user" u ON u.id = t.user_id
WHERE t.started_at >= now() - interval '30 days'
GROUP BY u.display_name, t.user_id, t.client_id, t.tool
ORDER BY calls DESC;
```

A `started` row means execution was admitted but did not finish recording, for
example because the process stopped. Account deletion cascades usage deletion.
No retention job or dashboard is included; keep an operational retention policy
and remove old rows with the database owner when appropriate. Contributor dumps
always clear the whole ledger, OAuth records and signing keys, regardless of opt-in.

The provider's authenticated `/api/auth/oauth2/delete-consent` endpoint removes
consent, which immediately denies MCP access. It does **not** invalidate existing
refresh tokens: approving the same client again can make those tokens usable
again. For a permanent disconnect, an operator must remove both consent and
refresh tokens for that user/client using an owner/admin connection:

```sql
BEGIN;
DELETE FROM oauth_refresh_token WHERE user_id = 'USER_ID' AND client_id = 'CLIENT_ID';
DELETE FROM oauth_consent WHERE user_id = 'USER_ID' AND client_id = 'CLIENT_ID';
COMMIT;
```

Alternatively, disable the `oauth_client` to deny all its users. There is no
connected-apps management UI in this first version. Logging out or ending the
granting SWUBASE session also stops access. Revoking only a refresh token prevents
future refresh; an already issued JWT can survive for its remaining five-minute
lifetime while its session and consent remain live.

## Local development and validation

Bootstrap a worktree using the supported worktree tools. Set
`MCP_RESOURCE_URL=http://localhost:3210/mcp` in that worktree's development `.env`
and `MCP_AUTH_ISSUER` to the worktree's exact **public frontend origin** plus
`/api/auth` (see `swubase-worktree-dev status`). The frontend proxy must serve
`/.well-known/oauth-authorization-server/api/auth` as well as `/api/auth`; the
development Vite configuration includes this route. Start the existing app with
`scripts/worktree-dev/swubase-worktree-dev up`, then start MCP separately:

```bash
bun --env-file=.env --env-file=.env.worktree run mcp:start
bun run mcp:check
SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test mcp/oauth.db.test.ts
SWUBASE_MCP_DB_TEST=1 bun --env-file=.env --env-file=.env.worktree test mcp/sanitization.db.test.ts
node --test scripts/deploy/*.test.mjs
bun run --cwd frontend build
```

The DB integration test refuses a non-loopback or non-worktree database, uses
synthetic users and local HTTP servers, exercises the actual auth configuration,
and removes its fixtures. The sanitizer test executes the real cleanup and
privacy assertions in a transaction that always rolls back; run it separately
from the OAuth tests. Keep each simultaneous worktree's MCP port and resource
URL distinct; the worktree launcher does not allocate or start MCP. Apply migrations
with the development/owner connection; use the restricted role only for the MCP
runtime. When generating auth schema, enable `MCP_RESOURCE_URL` explicitly and
reconcile the output with SWUBASE's custom auth fields and enum/indexes.
