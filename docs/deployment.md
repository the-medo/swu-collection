# Selective Coolify deployments

[Deploy changed services](../.github/workflows/deploy.yml) runs on pushes and pull
requests to `main`. GitHub selects services and calls their authenticated Coolify
deploy webhooks. **Coolify still pulls the source, builds the images and deploys
them using the existing configuration.** No container registry is required.
The production PostgreSQL resource is not a deployment target.

Automatic webhook calls are disabled until the GitHub repository variable
`COOLIFY_DEPLOY_ENABLED` is set to `true`. Pull requests always run the tooling
tests and show a plan without secrets or deployment calls.

## What gets deployed

| Changed files | Selected services |
| --- | --- |
| `scripts/remote-dev/` cleanup script, SQL, Dockerfile or Compose file | Maintainer |
| `frontend/`, root `Dockerfile`, ordinary API routes/services | Main app |
| `play/worker/`, `play/deploy/`, `Dockerfile.crossfire*` | Crossfire |
| Other production `play/` code, including engine, cards, storage and view contracts | Main app + Crossfire |
| `server/lib/crossfire/`, `server/lib/discord/`, `server/db/`, `server/auth/` | Main app + Crossfire |
| `shared/`, `types/`, `lib/`, root dependencies/configuration, database migrations | Main app + Crossfire |
| Documentation, test files, Crossfire test/browser fixtures, local worktree tooling | None |
| Deployment workflow/tooling changes or otherwise unclassified paths | All three |

Migration inputs (`drizzle/`, `migrate.ts`, `server/db/migrate.ts`) hold the automatic
Crossfire request and report a failed job requiring the [migration handoff](#migration-handoff).

The maintained rules live in [services.mjs](../scripts/deploy/services.mjs).
Unknown paths select all services so new build inputs cannot silently go stale.
Add a narrower rule and a test when adding a new top-level directory or changing
cross-service imports. Runtime data files remain deployment inputs.

**An engine change currently also requires the main app.** The API imports
`play/host/durable-game.ts` from `server/lib/crossfire/lobbies.ts` and
`matches.ts` to create initial game checkpoints. That module imports the engine.
Treating the entire `play/` directory as worker-only would leave game admission
running older engine code. Worker transport/lifecycle files can deploy alone.

The maintainer builds from `scripts/remote-dev/` and does not embed the application
schema or root Bun dependencies. Schema changes therefore do not rebuild it unless
its SQL/scripts also change. Review its sanitization rules whenever schema changes
affect contributor data; deploying does not update those rules automatically.

## One-time setup

1. **Verify that all three resources are Git-backed applications.**
   Since the current resources deploy on pushes, keep their working source/build
   configuration. Each must track this repository's `main` branch. Keep the main app's root
   `Dockerfile`, Crossfire's root `Dockerfile.crossfire`, and the maintainer's
   existing Git-backed Docker Compose/build context under `scripts/remote-dev/`.
   Keep environment variables, private networking, volumes, domains, database
   configuration and the maintainer's daily scheduled task in Coolify.
   For the maintainer, use Build Pack **Docker Compose**, Base Directory
   `/scripts/remote-dev`, Docker Compose Location `/docker-compose.coolify.yml`.
   A raw Compose Service pasted into Coolify does not fetch changed repository
   files; if that describes your maintainer, follow [the conversion below](#maintainer-resource-type).
   This workflow requires an application webhook that returns a deployment UUID.
2. **Enable Coolify API access.** On a self-hosted instance, enable **Settings →
   Advanced → API Access** if disabled. The Coolify HTTPS URL must be reachable
   from GitHub-hosted runners. A private-only endpoint needs a runner with access
   to that network instead of `ubuntu-latest`.
3. **Create an API token.** In **Keys & Tokens → API Tokens**, create a token for
   the team owning the applications with **deploy** permission. Save the token;
   it is shown only once. General read/write or database credentials are not
   needed for this workflow.
4. **Copy each authenticated deploy URL.** Open each application →
   **Configuration → Webhooks → Deploy Webhook (auth required)**. Copy the
   individual URL, shaped like
   `https://coolify.example.com/api/v1/deploy?uuid=RESOURCE_UUID&force=false`.
   Do not copy a Manual Git Webhook, a tag/group webhook or the PostgreSQL URL.
5. **Add four GitHub repository secrets** under **Settings → Secrets and variables
   → Actions → Secrets → New repository secret**:

   | Secret | Value |
   | --- | --- |
   | `COOLIFY_TOKEN` | The deploy token |
   | `COOLIFY_WEBHOOK_MAIN` | Main app's authenticated deploy URL |
   | `COOLIFY_WEBHOOK_MAINTAINER` | Maintainer's authenticated deploy URL |
   | `COOLIFY_WEBHOOK_CROSSFIRE` | Crossfire's authenticated deploy URL |

6. **Merge the workflow to `main` and inspect its plan.** While
   `COOLIFY_DEPLOY_ENABLED` is absent/false, GitHub makes no automatic webhook
   calls. Existing Coolify auto-deploy behavior continues until the next step.
   Once the workflow is on the default branch, **Actions → Deploy changed services
   → Run workflow** also offers a service selector and a dry-run checkbox (on by
   default). Select branch `main`; deployment jobs refuse other branches.
7. **Switch deployment ownership during a quiet push window.** For all three
   applications, turn off **Configuration → Advanced → Deployment & Git → Auto
   Deploy** and save. On some versions it appears directly under Advanced.
   Keep the GitHub App/source connection so Coolify can fetch/build the repo.
   Disable/remove any separately configured GitHub repository push webhooks that
   also trigger these resources. Leave unrelated integrations intact.
8. **Verify a manual deployment for each of the three services**, selecting one
   service at a time and unchecking **dry run**. This works while automatic GitHub
   deployments are disabled. Confirm the deployment appears under the **expected
   application**, and verify its new commit and healthy runtime. This catches
   accidentally swapped webhook secrets. Then create the GitHub Actions
   repository **variable** `COOLIFY_DEPLOY_ENABLED` with the exact value `true`.
   Subsequent pushes to `main` call only the selected application webhooks.
9. **Verify the automatic path with the next real code change.** Confirm the plan
   says automatic deployments are enabled, that each expected `Request … deployment`
   job ran rather than being skipped, and that the corresponding application
   deployment appears in Coolify. Check that unrelated services stayed untouched.
   If jobs are skipped, verify `COOLIFY_DEPLOY_ENABLED` is an Actions **variable**
   with value `true`, not a secret. Keep deployment ownership consistent while fixing it.

Coolify's authenticated deployment webhooks keep working when its Git auto-deploy
is disabled. Watch Paths are not needed: this workflow owns path selection.
See Coolify's [deployment webhooks](https://coolify.io/docs/core/automation/deploy-webhooks)
and [automatic deployments](https://coolify.io/docs/applications/deployments/automatic-deployments).

## Maintainer resource type

If the maintainer already has a Git source, branch and Docker Compose build pack,
keep it. Earlier repository instructions called it a Compose Service ambiguously.
Coolify's [Compose resource types](https://coolify.io/docs/applications/builds/docker-compose)
distinguish Git-backed **Applications** from pasted **Services**; only the former
pull this repository on deployment.

For an existing pasted Service, convert deliberately before enabling the workflow:

1. Pause its daily scheduled task and wait for any running cleanup to finish.
2. Create a Git-backed application on the same server/project, pointing at `main`,
   with the maintainer Compose settings above. Leave domains and port mappings empty.
3. Re-enter the existing R2 credentials/endpoint, `CLEAN_POSTGRES_PASSWORD` and
   server-only `REMOTE_DEV_RAW_BACKUP_HOST_DIR` through Coolify's environment UI.
   Verify the `/backups/raw` bind remains read-only. Never copy these into GitHub.
4. Let the new application create its own `clean-postgres-data` volume. This is
   scratch data: the sanitizer drops/recreates its clean database each run, so
   there is no production data to migrate. Keep the old resource/volume until
   verification is complete, and never point either at the production PostgreSQL volume.
5. Deploy it, check both containers are healthy/running and confirm that
   `/app/scripts/remote-dev/create-sanitized-db-backup.sh` exists in `sanitizer`.
   Recreate the previous scheduled task with the same schedule/timezone, targeting
   `sanitizer` and the command in the Compose file. Keep only one schedule enabled.
6. Verify the first scheduled sanitized export and public manifest update before
   retiring the old resource. Copy the **new application's** authenticated deploy
   URL into `COOLIFY_WEBHOOK_MAINTAINER`, then verify its manual workflow deployment.

## Operation and recovery

- A push compares its `before` and `after` Git trees, covering every commit in the
  push. Renames include both old and new paths; deletions count too. This does
  not use GitHub's limited changed-file payload/path-filter list. If the previous
  commit is unavailable (including initial branch creation), all services are
  selected, with Crossfire held for migration verification. Pull requests compare
  against their merge base.
- Read the workflow summary for the plan. A green deployment job means **Coolify
  accepted a request**, not that its build finished or the application is healthy.
  The job prints the deployment UUID; check that deployment's logs in Coolify.
- Services are requested independently. One failed webhook does not cancel the
  others. Requests for the same service use a concurrency group without cancelling
  a running request; plans for different pushes are never coalesced together.
  GitHub may replace a pending request with a newer request for the **same** service.
  Coolify still owns its build queue and deployment concurrency.
- Coolify builds the current configured `main` branch, which can be newer than
  the commit that triggered a queued workflow. This is not an immutable-SHA rollout
  or rollback system. Re-running an old Actions run still deploys current `main`.
- There is no automatic retry for timeouts: a request may already have reached
  Coolify. Inspect the queue before manually running the affected service again.
  Missing secrets, HTTP errors, malformed replies and replies without an
  application deployment UUID fail the job. An unrelated later push does not
  recover a previously failed service; manually redeploy that service.
- Environment-variable changes, base-image refreshes, token rotation and changes
  made only in Coolify have no Git diff. Use a manual selected deployment, or the
  Coolify dashboard. Cached builds are preserved (`force=false`); use Coolify's
  force-deploy option when deliberately rebuilding without cache.

To stop automatic GitHub deployment calls, set `COOLIFY_DEPLOY_ENABLED=false`.
Manual runs still work. If reverting to the old flow, keep that variable false
and re-enable Coolify Auto Deploy/the previous push webhooks to avoid duplicate
deployments.

## Migration handoff

The main app applies migrations; Crossfire has no migrator. For a push that
changes migration inputs, the main app (and maintainer when selected) can deploy,
but the Crossfire job **fails before sending its webhook**, with a required-action
message. The same guard applies when the previous commit is unavailable.
This prevents the worker's faster build from starting before that push's migration.

Pause further production pushes during this handoff; the guard is per push, not a
persistent deployment lock. Verify `=== Migration complete ===` followed by
`Server running` in the new main app's logs, then **Run workflow → main branch →
service crossfire → dry run unchecked**. Confirm it completes in Coolify. Re-running
the original push keeps the hold; its failed job is an intentional handoff signal.
Manual selection bypasses the guard, so do not manually select `all` before migrations finish.

Wire-breaking releases and incompatible database changes still need a planned
maintenance window; this is not an atomic multi-service rollout system. For those
releases, disable `COOLIFY_DEPLOY_ENABLED` before merging, then manually deploy
services in the order described by the [Crossfire production runbook](crossfire/production-setup.md).
Keep old/new versions compatible for ordinary automatic rollouts. PostgreSQL
itself is never a workflow target; the maintainer's private scratch database stays
part of its existing Compose application.

## Local validation

No app, database, Bun dependency installation or production credentials are needed:

```bash
node --test scripts/deploy/*.test.mjs
```

The tests use temporary Git repositories and mocked HTTP responses; they never
contact Coolify. Node 20+ is sufficient (provided by the GitHub Ubuntu runner).
For workflow syntax checking, optionally install [actionlint](https://github.com/rhysd/actionlint/blob/main/docs/install.md)
and run `actionlint .github/workflows/deploy.yml`.
