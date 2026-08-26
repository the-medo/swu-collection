# SWUBASE worktree development

On Linux or WSL, set up the current Git worktree with:

```bash
scripts/worktree-dev/swubase-worktree-dev setup
scripts/worktree-dev/swubase-worktree-dev up
```

`setup` creates or reuses a labelled PostgreSQL 16 container and volume unique
to the worktree, restores a local or sanitized dump only when the database does
not yet exist, and applies migrations. `up` additionally starts the backend and
frontend. Use `status`, `logs`, and `down` to inspect or stop this worktree.

The compatibility command `./setup-local-db.sh` delegates to `setup`.

## Agent-neutral bootstrap

For a fresh worktree, an agent or developer can install both dependency sets
and provision its isolated database in one step:

```bash
scripts/worktree-dev/bootstrap-worktree.sh
```

The bootstrap intentionally stops after `setup`: it neither copies `.env` nor
starts the app. Supply a reviewed, development-only `.env` through the
agent/developer's explicit configuration mechanism before running `up`. The
generated `.env.worktree` files are local runtime state and must never be
copied between worktrees.

## Dumps

The command selects its data source in this order:

1. `--dump /path/to/pg-dump.dmp`;
2. `SWUBASE_DEV_DUMP_PATH`;
3. ignored `pg-dump.dmp` in the worktree root;
4. the public sanitized manifest at `images.swubase.com`.

The public path requires no R2 credential. The manifest points at an immutable
dump object, and the downloader verifies its HTTPS origin, size, PostgreSQL
major version, and SHA-256 before restoring. Raw Coolify backups are never
downloaded by this tooling.

Run `refresh-db` only to intentionally replace existing local development data:

```bash
scripts/worktree-dev/swubase-worktree-dev refresh-db
```

## App URLs, remote access, and OAuth

Frontend ports are reserved from `5173` through `5180`; this is a hard cap of
eight concurrent worktrees. Backend and database ports are dynamically reserved
and always bind to `127.0.0.1`.

By default, every developer uses the localhost-only access profile:

```text
http://localhost:{frontend_port}
```

This is the right default for ordinary local development. To configure a
machine once for a private HTTPS proxy, run:

```bash
scripts/worktree-dev/swubase-worktree-dev configure-access \
  --origin-template 'https://steamdeck.tail73a93e.ts.net:{frontend_port}' \
  --tailscale-serve
```

The command writes the uncommitted, per-machine profile to
`~/.config/swubase/worktree-dev/access.env` and prints the exact Google OAuth
callback URIs for all eight possible frontend ports. New or stopped worktrees
read that profile automatically; an already-running worktree must be restarted
with `down` then `up` to adopt a changed profile.

`--tailscale-serve` creates a private Tailscale Serve proxy from the selected
HTTPS port to that worktree's loopback Vite server. It requires that the
configured hostname exactly matches the machine's Tailscale DNS name. The
launcher refuses to replace another Serve configuration and removes a mapping
only when it still points to that exact worktree frontend. It never uses
Tailscale Funnel.

Developers using a different HTTPS reverse proxy can set their own origin
template with `--no-tailscale-serve`; their proxy remains outside this tool's
control. Restore the default at any time with:

```bash
scripts/worktree-dev/swubase-worktree-dev configure-access --localhost
```

Google requires exact redirect URIs and does not support a wildcard origin or
port pattern. Register the values printed by `configure-access --show` for the
chosen hostname before using Google sign-in. The generated worktree
configuration assigns an auth-cookie prefix per worktree because cookies are
host-scoped rather than port-scoped. `status` prints the public URL, loopback
URL, callback URI, and Serve state for the current worktree.

`up` requires both Bun and Node. The launcher deliberately runs Vite's dev
server under Node so its WebSocket proxy has the Node socket APIs it requires;
the backend and other repository tooling continue to use Bun.

## Cleanup

`down` stops processes and PostgreSQL but retains the labelled database volume
for a quick restart. `down --purge-data` removes only this worktree's labelled
container, volume, ports, and generated state. `prune` lists stale resources;
`prune --yes` removes only the listed labelled resources after their worktree is
no longer live.

## Opt-in integration test

After changing the worktree lifecycle, Docker resource ownership, port
allocation, or cleanup behavior, run:

```bash
scripts/worktree-dev/test-concurrent-worktrees.sh
```

This test creates two temporary detached Git worktrees and labelled PostgreSQL
containers. It restores an empty, local custom-format fixture dump, verifies
that their database resources, ports, and cookie prefixes differ, writes a
sentinel only to one database, then purges it while ensuring the other remains
ready. It does not read `.env`, download contributor data, or contact R2. Root
dependencies and the `postgres:16-alpine` image must already be installed; it
removes its temporary worktrees and labelled test resources on exit.

## Codex Desktop (optional adapter)

In the Linux/WSL setup-script field of a Codex Desktop local environment, use:

```bash
scripts/worktree-dev/bootstrap-worktree.sh
```

Codex then runs the same agent-neutral bootstrap automatically when it creates
a managed worktree. `.worktreeinclude` copies the local `.env` only for those
Codex-managed worktrees; keep that file development-only. It has no effect for
Claude Code, direct Git worktrees, or other agents, which must provide their
own development configuration explicitly.
