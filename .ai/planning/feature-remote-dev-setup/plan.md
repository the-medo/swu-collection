# Implementation plan: remote development worktree setup

## Preconditions

1. Confirm that public delivery of the sanitized dump is the intended privacy
   posture. The server must continue to keep raw Coolify backups, their paths,
   and all R2 write credentials private.
2. Decide the browser URL scheme and verify the application's actual cookie,
   CORS, OAuth callback, and trusted-origin requirements before generating
   worktree configuration. A unique port alone may not be enough if cookies are
   scoped too broadly. Google OAuth requires exact pre-registered redirect
   URIs: use the initial fixed pool of eight frontend origins
   `http://localhost:5173` through `http://localhost:5180`, and register the
   exact callback URI for each in Google Cloud before implementation. This is
   the hard cap on concurrent Google-enabled worktrees. A maintainer may expand
   it only by registering the new callbacks first, then changing the checked-in
   pool. Do not rely on dynamically allocated OAuth ports.
3. Identify the repository's authoritative migration command and the supported
   backend/frontend start commands. The worktree scripts should call these
   commands rather than duplicate migration or process logic.
4. Keep the existing `scripts/remote-dev/create-sanitized-db-backup.sh` and its
   SQL sanitization files as the server-only producer. The worktree tooling
   consumes its output; it must not acquire raw-backup access.

## Phase 1 — Define worktree identity and command contract

Create a Linux-first shell interface, for example
`scripts/worktree-dev/swubase-worktree-dev`, with subcommands:

- `setup` — provision local state and database, but do not implicitly destroy
  an already healthy database;
- `up` / `start` — start the requested database and application services;
- `status` — print the identity, URLs, ports, container health, PIDs, and log
  locations;
- `logs` — tail/select a worktree's service logs;
- `down` — stop this worktree's services and containers;
- `refresh-db` / `recreate-db` — explicitly replace its database from a newer
  sanitized dump;
- `prune` — find stale, labelled SWUBASE resources and require an explicit
  confirmation or a narrow target before removal.

Implement a shared shell library to:

- generate a readable slug plus a short hash from the absolute worktree path;
- write and validate ignored state such as `.swubase/worktree-dev.env` or
  `.swubase/worktree-dev.json`;
- allocate the frontend/OAuth origin port only from the fixed, pre-registered
  development-origin pool, then persist the selected origin; allocate backend
  and PostgreSQL ports dynamically instead;
- use an atomic, machine-wide reservation registry (outside every repository
  checkout) for every allocated port, so two different worktrees cannot both
  claim a port between a probe and bind;
- persist the identity, absolute worktree path, branch/revision, reserved ports,
  and a liveness marker in that machine-wide registry, so cleanup can identify
  a deleted or path-reused worktree after its local state file has disappeared;
- take a lock during setup so two concurrent agents cannot provision the same
  worktree twice;
- attach `com.swubase.worktree-id`, worktree-path hash, and feature labels to
  every Docker resource;
- refuse to manage a container, volume, process, or state file that does not
  belong to the current identity.

Document the state directory in `.gitignore`; do not use a shared file in the
main checkout as runtime state.

## Phase 2 — Publish and verify the sanitized artifact

Extend the server-only sanitization job to upload each completed dump to an
immutable generation key, then upload a manifest beside the fixed compatibility
dump key, for example:

`data/development/sanitized/swubase-clean-db.manifest.json`

Keep `data/development/sanitized/swubase-clean-db.dmp` as the requested latest
compatibility copy if it remains useful, but do not use it for worktree
restores. Generate its checksum from the exact immutable dump being uploaded
and include:

- dump key/URL, SHA-256, byte size, generation time, and raw-backup timestamp;
- PostgreSQL image/major version used to create the dump;
- sanitization SQL revision and application/schema revision;
- a format/version field for future compatibility changes.

Add a consumer downloader used by the worktree CLI. It should:

- obtain the manifest and dump through the public HTTPS endpoint;
- reject redirects to unexpected hosts and malformed manifests;
- download only the manifest's immutable generation URL, never the mutable
  compatibility key;
- download to a temporary file, check size and SHA-256, then atomically promote
  the verified file to a local cache;
- support an explicit `--refresh` and otherwise reuse a cache entry matching
  the manifest checksum;
- never print or require R2 credentials.

Publish in this order: upload the immutable dump, verify its uploaded checksum,
publish the latest manifest last, then optionally update the fixed compatibility
copy. Configure cache control/cache invalidation so a client does not combine a
fresh manifest with a stale object. Add a retention job for old immutable
generations, preserving the generation named by the latest manifest and enough
history for in-progress downloads.

Add tests for manifest generation/validation and failure paths (missing field,
checksum mismatch, interrupted download, and incompatible PostgreSQL major).

## Phase 3 — Provision a database per worktree

Refactor the fixed-name root `setup-local-db.sh` into reusable database
provisioning functions. Preserve a simple documented entry point for a single
checkout, but make worktree setup pass the identity-specific container name,
database name, port, and dump path.

For each worktree:

- start a PostgreSQL 16 container named from the worktree identity, with a
  loopback-only host binding such as `127.0.0.1:<port>:5432`;
- give it an identity-specific labelled volume, never a shared local database
  volume;
- wait for health, create the target database, restore the verified custom
  dump, then run the repository's migration command;
- record the generated local `DATABASE_URL` in the worktree state/configuration
  and report it without exposing any production value;
- make rerunning `setup` idempotent; require `refresh-db` or `recreate-db` to
  replace data;
- ensure every failure leaves enough diagnostics to recover, but removes only
  the partial resources created for this identity.

This phase targets Linux and WSL. Keep `setup-local-db.ps1` useful for its
existing single-checkout Windows workflow, but state clearly in its help and
documentation that it does not yet provide concurrent worktree isolation.
Windows parity is a separately scoped follow-up, not an implied acceptance
criterion of this feature.

## Phase 4 — Run several application instances safely

Add start/stop helpers for the backend and frontend that consume worktree state
and write PID files/logs into the local state directory. Bind all development
ports only as broadly as required and report the frontend, backend, and
database URLs through `status`.

Generate a gitignored worktree environment overlay (for example,
`.env.worktree`) with the local database URL, selected ports, origins, and only
explicit development-service settings. Define the precedence between this file
and an existing developer `.env` so production defaults cannot slip in.

Add an identity-specific authentication cookie namespace to that generated
configuration and the Better Auth setup. Different ports remain the required
OAuth origins, but cookies are host-scoped rather than port-scoped, so the
cookie namespace is necessary to stop two `localhost` worktrees sharing a
session.

Before finalising this phase, manually prove that two worktrees can be open in
one browser:

- frontend API calls reach the corresponding backend;
- cookies do not leak or collide between worktrees;
- CORS and trusted origins accept the selected URLs only;
- OAuth callback/login behaviour is intentional and documented;
- a configured development Discord/webhook target works only when the
  developer elected to supply it.

Do not add blanket outbound-network blocking. Local database isolation does
not block external side effects; the safeguard is explicit per-worktree
development configuration with no production fallback. Coolify cron jobs are
server-managed and must not be started by these local scripts unless a future,
separate local scheduler mode makes that explicit.

## Phase 5 — Lifecycle, diagnostics, and safe cleanup

Implement `status`, `logs`, `down`, and `prune` before enabling automatic
worktree preparation. `down` must be idempotent and preserve the database
volume by default unless a destructive `--purge-data` option is explicitly
given. `prune` resolves every labelled resource identity through the durable
machine-wide registry. If the recorded path is no longer a live Git worktree,
that registry alone makes the resource eligible for cleanup even though its
local state file is gone. If the path still exists, `prune` compares the current
state file and Git branch/revision with the recorded identity; a reused path or
changed branch makes the previous identity eligible for cleanup. Present the
exact targets and never remove unlabelled Docker resources.

Add useful diagnostics for Docker availability, port conflicts, unavailable
dump/manifest, failed checksum, restore failure, migration failure, and stale
PID files. Include the next recovery command in each error message.

## Phase 6 — Codex local-environment integration

Use Codex desktop local-environment setup actions to call the idempotent
`setup` command when Codex creates a worktree. First verify the exact supported
configuration format in the installed Codex version; keep a shell command as
the portable fallback for Git/Codex CLI users.

Add `.worktreeinclude` only for narrowly reviewed, non-secret development
inputs. Never include `.swubase/` runtime state, dump caches, R2 credentials,
production `.env` values, raw dumps, or server paths. Automatic cleanup hooks
may provide convenience, but `down`/`prune` remain the reliable lifecycle
mechanism because a worktree can be abandoned outside a trusted Codex session.

## Phase 7 — Agent instructions and repository skills

Create or update root/nested `AGENTS.md` files to tell agents:

- how to run setup, status, start, stop, and cleanup;
- where generated state lives and that it must not be committed;
- which configuration values are server-only and which development external
  connections are permitted;
- the expected validation commands after a change.

Add focused repository skills under `.agents/skills/`, each with a clear
`SKILL.md` trigger and minimal scope:

- `swubase-worktree-dev` — lifecycle and isolation commands;
- `swubase-development-data` — sanitized-dump boundaries and privacy rules;
- `swubase-validation` — backend/frontend/database checks appropriate to a
  worktree change.

Do not put credential values in any instruction, skill, example, or generated
state committed to the repository.

## Phase 8 — Verification, documentation, and rollout

Automate shell-level tests for identity generation, port selection, label
filtering, manifest verification, idempotency, and safe refusal to remove an
unlabelled resource. Add an opt-in Docker integration test that creates two
temporary worktrees and verifies distinct containers, ports, volumes, and data
visibility.

Perform this release smoke test:

1. Create two worktrees with different branches/tasks.
2. Run their setup concurrently, then `status` for both.
3. Restore/migrate both databases and verify their containers and ports differ.
4. Write a sentinel row through one database connection and confirm it is
   absent from the other.
5. Start both frontend/backend pairs and open both URLs in the same browser.
6. Exercise a configured development-side effect and confirm no production
   destination was used.
7. Run `down` for one worktree and confirm the other remains healthy.
8. Remove a disposable worktree, run the narrow stale-resource cleanup, and
   confirm unrelated Docker resources remain untouched.

Document prerequisites (Docker, disk space, public dump URL, Bun/runtime, and
the fixed OAuth-origin pool). Explicitly call out the one-time maintainer action
to register every pool callback URI in Google Cloud; contributors can use only
the already registered slots. Document the normal workflow, refresh behaviour,
disaster/recovery commands, and the exact privacy posture of the publicly
delivered artifact. Roll out first on a disposable worktree, then enable the
Codex automatic setup action once the manual path has proved reliable.
