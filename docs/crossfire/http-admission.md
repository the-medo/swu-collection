# Crossfire HTTP admission

The main API mounts [Crossfire routes](../../server/routes/crossfire.ts) under
`/api/crossfire`. They are disabled unless `CROSSFIRE_ENABLED=1` is deliberately
set in the environment. Local development can set it in the ignored `.env` and
restart through the worktree launcher, which supplies that worktree's database,
origin and auth configuration. No generated `.env.worktree` file needs editing.

Every player and spectator also needs the explicit Better Auth `crossfire` role.
Roles are additive: `admin,crossfire` retains administration while allowing play;
`admin` or `moderator` alone does not grant Crossfire access. The existing nullable
text `user.role` column stores these comma-separated roles, so no migration is
needed. Membership is checked on HTTP requests, ticket issue/redemption, replay
access, invitation delivery, and inside game-command commits. Revocation closes
live sockets during their next authorization check and never deletes history.
Administrators manage membership at `/admin?page=crossfire-access`; see the
[account access guide](access.md). Crossfire links, deck Play controls and
invitation subscriptions are hidden for accounts without membership. Direct page navigation displays an access message.

| Method | Path below `/api/crossfire` | Request / result |
| --- | --- | --- |
| GET | `/decks/:deckId/readiness` | Returns `{ ready, issues }` for an accessible deck; no snapshot or deck-source metadata |
| POST | `/lobbies` | `{ deckId, policy }`; returns `{ data: lobby }` with 201 |
| GET | `/lobbies/:lobbyId` | Returns the caller's small lobby view |
| POST | `/lobbies/:lobbyId/join` | `{ deckId, acceptedPolicy }`; accepts seat and starts the game atomically |
| DELETE | `/lobbies/:lobbyId` | Creator cancels a waiting lobby; returns 204 |
| POST | `/lobbies/:lobbyId/tickets` | `{ role: "player" | "spectator" }`; returns a ticket, game ID and expiry with 201 |

[Shared contracts](../../shared/types/crossfire.ts) contain only browser-safe
lobby settings, metadata and request schemas. User/session identity comes from
the parent Better Auth middleware. The services recheck live auth in PostgreSQL.
Client-supplied identity fields are rejected. Policy consent and seat ownership
remain enforced by the same private services used by integration tests.

Mutations require `Origin` to exactly match the configured `BETTER_AUTH_URL`,
which must be a canonical HTTP(S) origin when enabled. All responses use
`Cache-Control: no-store`. Streamed bodies are bounded to 8 KiB before JSON
validation. Each API process permits at most 60 mutations per user per minute
across the route family, with at most 10,000 limiter entries. Rejected bursts
receive 429 and `Retry-After`; reads remain available. This local limiter is not
a distributed quota and needs review before API replicas or production release.

Expected errors use safe codes: 401 for absent/expired auth, 403 for denied
connections/origins, 404 for missing/inaccessible lobbies or decks, 409 for
conflict/consent/version mismatches, and 422 for unsupported decks. Invalid input
returns 400 and oversized bodies 413. Disabled routes return 503. Unexpected
failures reach the existing central error handler without exposing SQL to the
caller. Ticket values must stay out of URLs, logs and persisted browser caches.

Admission lazily creates its own native PostgreSQL pool with four connections,
a five-second connection timeout and a twenty-second idle timeout. It targets
the same configured database as the main API. Do not pass `db.$client` into the
native Crossfire adapters: the Drizzle driver modifies that client's JSON
serialization and date parsing. Deck reads inside admission use the existing
Drizzle query definitions through a transaction proxy on the native pool.

The separate game worker redeems tickets as described in [transport](transport.md).
The issuer supplies no executable state, decks, auth IDs or raw journal.

Deck readiness uses the same authenticated, repeatable-read deck preparation as
admission. It reports unsupported identities and format/structure issues only
after checking deck access. This is advisory: create/join validate again and
freeze their accepted snapshot, so a subsequent edit cannot bypass admission.

Focused route validation is `bun test server/routes/crossfire/createRouter.test.ts`.
Run `bun run play:storage:test` against the explicit local database for service
behavior and `bun run --cwd frontend build` for the shared route contract.
The running worktree has also been exercised with synthetic Better Auth sessions
through create/get/join, player/spectator ticket issuance and redemption,
role/origin denial and real sign-out. Those local fixture rows were removed.
