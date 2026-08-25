### I will update contribution guide if somebody is interested. 

## Tech stack
- **Frontend**: React, TypeScript, Tailwind CSS, TanStack Router, TanStack Query
- **Backend**: Hono, PostgreSQL, Drizzle ORM
- **Runtime**: Bun for both server and client

## Prerequisities
1. Docker installed (used only for local DB, but you can use something else)
2. bun installed

### Start database (Postgres in Docker)

On Linux or WSL, use the worktree-aware setup command. It creates a labelled
PostgreSQL container, volume, and ports unique to this checkout. Place an
ignored `pg-dump.dmp` in the repository root, or let the command download the
checksum-verified public sanitized dump:

```bash
# Linux or WSL
./setup-local-db.sh
# or: scripts/worktree-dev/swubase-worktree-dev setup
```

```powershell
# Windows (PowerShell)
.\setup-local-db.ps1
```

The Linux/WSL command keeps a healthy database on repeated runs. Use
`scripts/worktree-dev/swubase-worktree-dev refresh-db` only when you explicitly
want to replace it. See [`scripts/worktree-dev/README.md`](scripts/worktree-dev/README.md)
for concurrent worktrees, status, app URLs, and cleanup.

The current PowerShell script remains a single-checkout setup helper; concurrent
worktree isolation is currently supported on Linux/WSL.


### Create .env file
Currently it is possible to sign in only using github / google, so you will need cliend id/secrets for at least one of them, even in development:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5442/swubase_postgres_local
BETTER_AUTH_SECRET=___random_string
BETTER_AUTH_URL=http://localhost:5173
VITE_BETTER_AUTH_URL=http://localhost:5173
GITHUB_CLIENT_ID=client_id_from_your_github_app
GITHUB_CLIENT_SECRET=client_secret_from_your_github_app
GOOGLE_CLIENT_ID=client_id_from_your_google_app
GOOGLE_CLIENT_SECRET=client_secret_from_your_google_app
CONTINENTL_API_KEY=(optional - api key for https://continentl.com/)
R2_ACCESS_KEY_ID=(optional - only if you want to upload images/files to your bucket)
R2_SECRET_ACCESS_KEY=(optional - like above)
R2_ENDPOINT=(optional - like above)
```

_TODO: provide localhost callback URLS for github/google_


To run server:
1. `bun install`
2. `bun dev`

To run frontend, go to `/frontend` and do the same:
1. `bun install`
2. `bun dev`

For an isolated worktree, `scripts/worktree-dev/swubase-worktree-dev up` starts
both processes with the generated per-worktree ports and URLs.
