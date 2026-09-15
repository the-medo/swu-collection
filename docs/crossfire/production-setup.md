# Crossfire production setup: Coolify Dockerfile + Traefik

Operator runbook checked against the repository and Coolify documentation on
2026-09-15. This assumes the existing SWUBASE web/API application uses the root
`Dockerfile`, Traefik, and the public origin `https://swubase.com`. Production
resources have not been inspected or deployed. Reuse the existing private database
address, Coolify destination/network and secrets where indicated below.

Crossfire requires **one additional application container**. It shares the current
PostgreSQL database, accounts and frontend. There is no new database, Redis service,
worker volume, OAuth application, DNS record or Crossfire scheduled task to create.

## 1. Prepare the release and database

Deploy the same Crossfire-capable Git revision to the web application and worker.
The worker must build from the repository root, because it imports shared and
server modules. Deploying only the web application does not start a game worker.

Take a normal production PostgreSQL backup before applying the release. Include
the entire database, including `public` and `play`; the latter contains private
games, reports and replays and must be included in ongoing backups too.

The existing root Drizzle migration chain creates the `play` schema. Apply **all
pending migrations**, through `0057_crossfire` in this revision. Do
not create tables manually or apply only the last migration. Crossfire membership
uses the existing `user.role` column and needs no additional migration.

This is the consolidated first-release migration. A database already running the
old development migration chain needs [baseline reconciliation](migration-baseline.md)
before using this history; do not rerun `CREATE SCHEMA play` over it.

The [web entrypoint](../../server/index.ts) runs migrations automatically. Deploy
the updated web image first and wait for `=== Migration complete ===` followed by
`Server running` in its application logs before starting the worker or granting
playtest access. The HTTP listener opens before migration completion, so an HTTP
response alone is not evidence that migrations finished. The worker has no migrator.

For a separately managed migration job, execute `bun run db-migrate` from `/app`
in the **new web image**, with the production `DATABASE_URL`, before starting
application processes. Avoid concurrent migration jobs. A Coolify pre-deployment
command runs in the old container, so it cannot reliably apply migrations added
in the new image. See [Coolify Dockerfile deployment commands](https://coolify.io/docs/applications/builds/dockerfile#deployment-commands).

## 2. Configure the existing SWUBASE web application

Keep its root build context `/`, Dockerfile `Dockerfile`, current domain and port
`3010`. Add or update these values without replacing the application's other
environment variables.

**Build variables:**

```dotenv
BUN_VERSION=1.3.14
VITE_BETTER_AUTH_URL=https://swubase.com
VITE_ENVIRONMENT=production
```

The root Dockerfile still defaults to Bun 1.2.19; explicitly use the 1.3.14 runtime
used by the worker and local validation. Check the build log's base image version.
Keep **Inject Build Args to Dockerfile** enabled for the public Vite build values.
Leave `VITE_CROSSFIRE_WS_URL` unset: its default is the same-origin game socket
path. Changing a Vite value requires rebuilding the frontend.

**Runtime variables:**

```dotenv
CROSSFIRE_ENABLED=1
BETTER_AUTH_URL=https://swubase.com
DATABASE_URL=<existing production PostgreSQL URL on the private Docker network>
CROSSFIRE_CARD_BUNDLE_BUCKET=swu-images
R2_ENDPOINT=<existing R2 S3 endpoint>
R2_ACCESS_KEY_ID=<existing R2 access key>
R2_SECRET_ACCESS_KEY=<existing R2 secret>
```

Keep the existing Better Auth secret, OAuth configuration and all other SWUBASE
settings. Neither authentication nor database credentials need to be regenerated.
Store secrets as **Runtime Variable enabled / Build Variable disabled**. Public
`VITE_*` variables are embedded in the browser build. Coolify documents these
separate scopes in [Environment variables](https://coolify.io/docs/applications/configuration/environment-variables).

The API downloads card releases from R2; the game worker reads installed releases
from PostgreSQL. Reuse the existing R2 credentials and preserve permissions needed
by the application's other upload features. Crossfire downloads themselves need
read access to `swu-images/crossfire/card-bundles/`.

## 3. Create the Crossfire worker application

Create a second Git application in the same Coolify project/environment, on the
same server and **destination network** as the web application and PostgreSQL.
Use the same repository/release revision.

| Coolify setting | Value |
| --- | --- |
| Name | `swubase-crossfire` |
| Build Pack | Dockerfile |
| Base Directory | `/` |
| Dockerfile Location | `Dockerfile.crossfire` |
| Ports Exposes | `3110` |
| Ports Mappings | Empty |
| Domains | `https://swubase.com:3110/api/ws/crossfire` |
| Advanced → Strip Prefixes | **Disabled** |
| Advanced → Consistent Container Names | **Enabled** |
| Advanced → Operations → Stop Grace Period (seconds) | `20` |
| General → Custom Docker Options | `--init` |
| Replicas / running worker instances | **One** |
| Persistent Storage | None |
| Initial resource limits | 2 CPUs, 2 GiB memory; measure real load before increasing admission |
| Start command | Leave the Dockerfile command in place |
| Healthcheck | Use the image's built-in health check |

The build context and Dockerfile fields follow [Coolify's Dockerfile settings](https://coolify.io/docs/applications/builds/dockerfile#configure-the-build-context).
The image already defaults to Bun 1.3.14 and starts `bun play/worker/index.ts`.
Do not give it the web application's start command or frontend build settings.

The domain's `:3110` selects the **container** port; players still connect through
HTTPS/WSS on public port 443. The path route takes priority over the web application's
root route. Disabling prefix stripping is essential: the worker expects the full
`/api/ws/crossfire/GAME_ID` path. See [Coolify port/path routing](https://coolify.io/docs/core/networking/domains#route-to-a-port-or-path).

Consistent Container Names makes Coolify stop the previous worker before starting
its replacement. This avoids overlapping worker instances behind ordinary load
balancing; live game ownership is currently local to one worker. The 20-second
grace period exceeds its ten-second shutdown deadline. Expect a brief reconnect
during a worker replacement. See [Coolify rolling-update conditions](https://coolify.io/docs/applications/deployments/rolling-updates#settings-that-prevent-a-rolling-update)
and [supported custom Docker options](https://coolify.io/docs/applications/builds/custom-docker-options).

Configure the following as **runtime-only** environment values on the worker:

```dotenv
CROSSFIRE_ENABLED=1
CROSSFIRE_HOST=0.0.0.0
CROSSFIRE_PORT=3110
DATABASE_URL=<same private production PostgreSQL URL as the web application>
BETTER_AUTH_URL=https://swubase.com

DISCORD_CROSSFIRE_REPORTS_ENABLED=true
DISCORD_CROSSFIRE_REPORTS_CHANNEL_ID=1548656614079336549
DISCORD_CROSSFIRE_REPORTS_APP_BASE_URL=https://swubase.com
DISCORD_BOT_TOKEN=<existing bot token with access to that forum>
```

Use the exact public origin, without a trailing slash or path. `localhost` in
`DATABASE_URL` would refer to the worker itself. The worker must reach the same
database over the private network; it cannot use the local development database.
It needs no R2 credentials, OAuth client secret or `BETTER_AUTH_SECRET`.

Optional explicit limits below equal the current defaults:

```dotenv
CROSSFIRE_MAX_GAMES=128
CROSSFIRE_REPLAY_IDLE_MS=240000
CROSSFIRE_REPLAY_CHECKPOINT_ACTIONS=5
CROSSFIRE_REPLAY_MAX_MIB=256
CROSSFIRE_REPLAY_GAME_MIB=64
CROSSFIRE_REPLAY_MAX_GAMES=32
```

These are memory/admission bounds, not demonstrated concurrent-game capacity.
The main API and worker use additional PostgreSQL pools; allow headroom above
the application's existing connections. See [pool sizes and ownership](architecture-and-operations.md).

Deploy the worker after the web migration has completed. Its successful startup
log contains `Crossfire worker listening on port 3110`.

## 4. Check the two distinct WebSocket routes

| Public request | Container |
| --- | --- |
| `/api/ws/crossfire/GAME_ID` | Crossfire worker, port 3110 |
| `/api/ws/invitations/crossfire` | Existing web/API, port 3010 |
| `/api/crossfire/...`, `/api/admin/...`, pages and assets | Existing web/API, port 3010 |

Do not forward every `/api/ws` request to the game worker. Invitation badges,
toasts and expiry notifications run through the main API. Preserve the browser's
`Origin` header; do not replace it with an internal container address.

In the **worker's Coolify Terminal**, check the internal listener:

```bash
bun -e 'const r = await fetch("http://127.0.0.1:3110/health"); console.log(r.status, await r.text()); process.exit(r.ok ? 0 : 1)'
```

Expected: `200 {"status":"ok"}`. This is a listener/lifecycle check, not a
continuous database probe. `https://swubase.com/health` is not the worker's health
endpoint under this routing scheme.

A read-only SQL check on the existing production database can confirm installation:

```sql
SELECT to_regclass('play.games'),
       to_regclass('play.journal_live'),
       to_regclass('play.journal_history'),
       to_regclass('play.card_bundles');

SELECT key, value
FROM application_configuration
WHERE key = 'crossfire_card_bundle_version';
```

After service initialization, the initial active card value is `1.0.0`, unless
an operator has already activated another release. No manual configuration row
is needed. The setting is `crossfire_card_bundle_version`; runtime version 1.0.0
comes from code, not a `crossfire_engine_version` database setting.

## 5. Enable players, card updates and Discord reports

1. Sign in as an administrator and open **Administration → Crossfire → Player
   access** (`/admin?page=crossfire-access`). Grant yourself and the intended
   players/spectators access. This preserves other roles; `admin,crossfire` and
   `moderator,crossfire` work. Admin or moderator alone does not allow gameplay.
   There is no automatic grant to all existing accounts.
2. Open **Crossfire → Card releases** (`/admin?page=crossfire-cards`). Confirm
   installed/active release `1.0.0` with 1,498 definitions and that the published
   release list loads from R2. The initial release was already published to
   `swu-images`; its [discovery index](https://images.swubase.com/crossfire/card-bundles/releases.json)
   was read successfully on 2026-09-15. Startup seeds the compiled release even
   without R2, so no initial download/activation is required. For future updates,
   review then activate the new release here; uploading alone does not activate it.
3. Give the bot **View Channel, Send Messages / Create Posts, and Embed Links**
   in forum `1548656614079336549`. Allow posts without mandatory tags. Submit one
   labelled test report from a game and check that it creates a new forum post
   linking to the saved report in SWUBASE. The link requires the reporter's or an
   administrator's account, with Crossfire access.

Reports save in PostgreSQL before the worker immediately attempts Discord delivery.
No scheduled task is needed. Failed deliveries remain saved and have no automatic
retry timer; follow [report recovery](report-notifications.md#delivery-state-and-recovery)
if Discord is unavailable. Use the worker terminal's `send-reports.ts` tool only
when deliberately retrying a retained report.

Keep all installed historical card bundles: running games, BO3 continuations and
replays retain their original versions. See [card publishing and compatibility](card-releases.md)
for subsequent agent-authored card updates.

## 6. Verify the complete flow before inviting more players

Use two explicitly enabled accounts, and an enabled spectator when testing
spectating:

- Confirm normal accounts have no Crossfire menu/Play button and cannot open the
  protected APIs. Granting access should reveal Crossfire after session refresh.
- Send an invitation; check the recipient's toast, navigation count and acceptance.
  Browser Network should show the invitation socket and game socket as separate
  successful WebSocket upgrades, using the routes above.
- Start a game, act, make a choice, refresh, and confirm the same position resumes.
  Check that each account only sees the permitted hand/resource identities.
- Try undo approval, a bookmark, replay seeking and a bug report with a note.
- Finish a game. Confirm the replay and each player's deck statistics appear after
  archive/statistics processing. The worker starts its finalizer on startup and
  checks every 30 seconds; allow time for processing and backlog. For BO3, check
  games share a match identity and a new match receives a new identity.
- During a controlled test game, restart the worker and confirm reconnect restores
  the committed position. If the worker was killed, recovery may wait for its
  previous ownership lease (normally 15 seconds) to expire.

The finalizer compacts completed journals and publishes statistics automatically.
Replays and game checkpoints remain in PostgreSQL; R2 stores card releases and
public assets. Worker/container deletion therefore does not delete saved games.
Keep database backups and monitor database size, pool usage, worker memory and
failed finalization/report counts as usage grows.

| Symptom | First checks |
| --- | --- |
| Crossfire hidden or access denied | Explicit `crossfire` role, refreshed session, API `CROSSFIRE_ENABLED=1` |
| Lobby works but game cannot connect | Worker running/healthy; Traefik game path targets 3110; Strip Prefixes disabled |
| Game works but invitations do not update | Invitation WebSocket still routes to the main API; API flag enabled |
| Socket upgrades but authorization closes it | Exact public `BETTER_AUTH_URL`, preserved Origin, same DB, current session/role |
| Worker exits on startup | All migrations completed; private DB reachable; compatible installed card release; required runtime values |
| Card releases say R2 is not configured | Bucket and R2 runtime credentials belong on the main API |
| Saved report has no Discord post | Worker Discord values, bot forum permissions, retained delivery error; explicit retry when repaired |
| Finished games remain unarchived | Finalizer errors/timeouts and DB connectivity; worker running; retained engine/card compatibility |

## Local development

Continue using the existing worktree launcher and its isolated PostgreSQL:

```bash
scripts/worktree-dev/swubase-worktree-dev setup
# Supply a development-only .env, including CROSSFIRE_ENABLED=1.
scripts/worktree-dev/swubase-worktree-dev up
scripts/worktree-dev/swubase-worktree-dev status
```

The launcher loads `.env` together with generated `.env.worktree` overrides,
starts the API, frontend and Crossfire worker, and configures Vite's local game
proxy. Use `status` for this worktree's actual ports and origin. Do not copy
production settings or another worktree's generated environment into it. The
generated files stay uncommitted. After a sanitized DB restore, grant local
Crossfire membership again through Player access; production grants are removed
by sanitization. See [the detailed local workflow](architecture-and-operations.md#local-development).
