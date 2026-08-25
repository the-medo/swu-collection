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

## App URLs and OAuth

Frontend ports are reserved from `http://localhost:5173` through
`http://localhost:5180`; this is a hard cap of eight concurrent
Google-enabled worktrees. Before using Google sign-in, a maintainer must
register the exact Better Auth callback URI for every enabled origin in Google
Cloud. The generated worktree configuration assigns an auth-cookie prefix per
worktree because cookies are host-scoped rather than port-scoped.

Backend and database ports are dynamically reserved and bind to `127.0.0.1`.
Use `status` to see the exact URLs.

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

## Codex Desktop

In the Linux/WSL setup-script field of a Codex Desktop local environment, use:

```bash
scripts/worktree-dev/codex-setup.sh
```

It installs root/frontend dependencies and runs `setup`. `.worktreeinclude`
copies the local `.env` into Codex-managed worktrees; keep that file
development-only. The generated `.env.worktree` overlay is worktree-local and
must not be copied or committed.
