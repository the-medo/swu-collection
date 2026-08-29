# Remote development worktree setup

## Purpose

Make it quick and safe for a coding agent or contributor to create a worktree
that behaves like an independent local SWUBASE environment. Multiple worktrees
must be runnable at the same time, each with its own PostgreSQL container,
application URLs, local state, and easy-to-find status.

The sanitized-database producer already exists: the server restores a Coolify
backup in an unexposed temporary container, applies the sanitization SQL, and
uploads `data/development/sanitized/swubase-clean-db.dmp`. This feature is the
consumer and lifecycle layer around that artifact, plus the repository guidance
that lets AI agents use it reliably.

## Goals

- A worktree can run one idempotent setup command from its root.
- Each worktree gets a distinct, labelled Docker PostgreSQL container and
  database connection; starting or deleting one cannot affect another.
- Several frontend/backend instances can run concurrently and be opened in a
  browser without port or origin collisions.
- The local database is restored from the sanitized artifact, verified, and
  migrated to the checked-out code's schema.
- Worktree state, logs, ports, and cleanup actions are visible through a small
  command interface rather than requiring Docker detective work.
- Codex desktop worktree preparation can invoke the setup automatically, while
  the same scripts remain usable from a normal shell.
- Repository instructions and skills describe the SWUBASE workflow, expected
  validation, and data-safety rules for AI agents.

## Boundaries and decisions

### Sanitized dump distribution

`images.swubase.com` is intended to serve the sanitized dump publicly, so a
worktree downloader should use unauthenticated HTTPS and must not require or
copy R2 credentials. Raw backups, the production-backup paths, and server
credentials remain server-only.

Publishing the artifact is an explicit privacy decision: it may contain the
profile, decks, collections, integrations with secrets removed, and optionally
match data of users who opted into development sharing. Before enabling the
public URL, confirm that this is compatible with the contributor consent copy
and the project's privacy expectations. If that decision changes, replace the
downloader URL with a signed/private delivery mechanism without changing the
local provisioning contract.

The published artifact needs a sibling manifest. At minimum it records the
artifact URL/key, SHA-256 checksum, byte size, generation time, source backup
timestamp, PostgreSQL major version, and schema/application revision. A
worktree verifies the checksum before restore so a partial or stale download is
never silently used.

### External services and side effects

External services are allowed when deliberately configured in the worktree's
development environment—for example, development Discord channels. Local
database isolation only isolates database writes; it does *not* prevent an app
from sending webhooks, emails, OAuth requests, uploads, or other outbound
network traffic.

Every generated or copied worktree environment file must therefore contain
explicit development endpoints and credentials, with no implicit fallback to
production secrets, webhooks, or hosts. Coolify-managed cron jobs run on the
server and are not expected to start locally. A local process that has its own
scheduler must be made explicit and documented before it is started by setup.

### Isolation model

Each worktree receives a stable slug derived from its path and branch/task
name, plus a short path hash to avoid collisions. That identity is persisted in
an ignored per-worktree state file. It owns:

- Docker resource names and labels;
- the loopback-bound PostgreSQL port and database URL;
- backend and frontend ports, process IDs, and log paths;
- generated local environment values and the current dump manifest identity.

State must not be shared through a repository checkout. A separate,
machine-wide atomic port-reservation registry is required because two different
worktrees can be prepared concurrently; probing a free port alone is subject to
a race. That registry records the identity, absolute worktree path, current Git
branch/revision, reserved ports, and liveness marker for every active setup.
It survives a deleted worktree so stale resources can be identified safely.
Commands operate only on resources carrying the matching SWUBASE labels and
should refuse ambiguous or unlabelled targets.

### Browser and authentication isolation

The implementation must choose and document a predictable per-worktree URL
scheme (for example, distinct ports on `localhost` or a unique `*.localhost`
host). It must also verify the resulting cookie, CORS, callback URL, and OAuth
configuration. Reusing the same browser origin or cookie name can make two
otherwise isolated worktrees appear to share a login session, so this is a
functional requirement rather than a cosmetic detail.

Google OAuth redirect URIs are exact, pre-registered values, not dynamic
patterns. The initial implementation uses a fixed pool of eight registered
development frontend origins (`localhost` ports 5173–5180); that is the hard
cap on concurrently Google-enabled worktrees. A maintainer can grow the pool
only by first registering each matching callback URI in Google Cloud, then
updating the checked-in pool. The allocator must be constrained to this pool
and must never select an arbitrary free port for a Google-enabled worktree.

Each worktree also receives an identity-specific auth cookie namespace. The
implementation must configure and verify it alongside the origin so sessions
from two ports on the same `localhost` host cannot collide.

## Platform support

The concurrent-worktree automation and its acceptance criteria target Linux and
WSL first, which is the Codex worktree environment in scope. The existing
PowerShell setup remains a supported single-checkout convenience until a
separate Windows parity implementation is planned; it must not claim to offer
the Linux worktree isolation guarantees.

## Artifact consistency and retention

The server publishes each completed sanitized dump at an immutable,
generation-specific key. Only after the object upload and checksum verification
complete does it publish the latest manifest pointing to that immutable key.
The existing fixed `swubase-clean-db.dmp` key may remain as a compatibility
copy, but worktree setup must download only the immutable URL in the manifest.
This prevents a manifest and a concurrently replaced fixed-key dump from being
mixed by an origin or CDN cache.

The server retains immutable generations long enough for in-progress worktree
downloads and then deletes them using a documented retention policy. The
retention cleanup must never delete the generation referenced by the current
latest manifest.

## Expected workflow

1. An agent or developer creates a worktree.
2. The worktree setup action derives/loads its identity and provisions its
   local state directory.
3. It downloads or reuses a verified sanitized dump, starts the worktree's
   PostgreSQL container, restores the dump, and applies migrations.
4. It writes the worktree-specific development configuration and reports the
   database and app URLs.
5. The developer starts the application stack through the same interface (or a
   Codex local-environment action), then opens the reported frontend URL.
6. `status`, `logs`, `down`, and stale-resource cleanup are available without
   touching another worktree.

## Codex and repository guidance

Codex desktop local-environment setup should call the idempotent worktree
setup command when it creates a worktree. `.worktreeinclude` may copy only
safe, ignored development configuration; it must never propagate raw dumps,
R2 credentials, production secrets, or an existing worktree's generated
state.

Root and nested `AGENTS.md` instructions should point agents to the one
supported setup/status/teardown workflow. Repository-native skills under
`.agents/skills/` should cover at least worktree lifecycle, development data
safety, and the relevant validation commands. Automation is a convenience, not
the only path: a developer using Git worktrees outside Codex must get the same
result by running the documented shell command.

## Acceptance criteria

- Two independently created worktrees can be brought up concurrently and have
  different labelled containers, ports, database URLs, app URLs, logs, and
  state directories.
- Updating data in one worktree cannot be observed in the other's database.
- A new worktree restores only a checksum-verified sanitized dump, then reaches
  the schema expected by its checked-out code.
- The browser can use both worktrees without unintended session/origin mixing;
  the chosen OAuth/login behaviour is covered by a manual smoke test.
- Setup is repeatable, reports actionable errors, and does not overwrite a
  healthy worktree database unless an explicit refresh/recreate option is used.
- `down` and stale-resource cleanup remove only their labelled resources and
  leave unrelated Docker containers, worktrees, and developer files intact.
  Cleanup determines staleness from the live Git worktree and current state
  identity, not merely whether a path happens to exist.
- An agent can discover the workflow from repository instructions and complete
  setup without access to server-only secrets.
