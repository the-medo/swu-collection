# SWUBASE skill selection matrix

Choose skills from the change being made, rather than loading every skill.
Start with the primary skill below and add the listed companion skill when the
task crosses that boundary.

## Repository skills

| Task pattern or affected area | Primary skill | Also load / read |
| --- | --- | --- |
| Create, bootstrap, start, inspect, or clean a Linux/WSL Git worktree with its local PostgreSQL container | `swubase-worktree-dev` | `swubase-validation` when changing or verifying the tooling |
| Change `scripts/worktree-dev/`, `setup-local-db.sh`, `.worktreeinclude`, worktree ports, labels, cookie isolation, or worktree cleanup | `swubase-worktree-dev` | `swubase-validation` |
| Change the server-side sanitization job, its SQL, Coolify compose resource, R2 manifest/generations, or contributor-data retention | `swubase-development-data` | `swubase-validation` |
| Change how a worktree downloads, verifies, caches, or restores the sanitized dump | `swubase-development-data` | `swubase-worktree-dev`, `swubase-validation` |
| Change Drizzle schema or `drizzle/` migrations | `swubase-validation` | Read `docs/migrations.md` before generating or editing migrations |
| Change backend routes, server libraries, auth, cron behavior, or database queries | `swubase-validation` | Read the relevant domain document below when applicable |
| Change React/Vite UI, frontend API hooks, routes, or browser behavior | `swubase-validation` | Run the focused frontend validation listed in that skill |
| Review or validate a change without a narrower operational concern | `swubase-validation` | Add another skill only if the changed files match a row above |

## Common combinations

- Worktree database lifecycle or isolation change:
  `swubase-worktree-dev` + `swubase-validation`.
- Public sanitized-dump consumer change:
  `swubase-development-data` + `swubase-worktree-dev` +
  `swubase-validation`.
- Sanitization/retention policy change:
  `swubase-development-data` + `swubase-validation`.
- Ordinary backend/frontend feature with no specialized workflow:
  `swubase-validation`; load a domain document only when it covers the area.

## Domain documents

| Area | Read before changing it |
| --- | --- |
| Drizzle schema, generated SQL, or custom data migrations | `docs/migrations.md` |
| Karabast account-linking, tokens, game-result integration, or preview-card ID mapping | `docs/karabast-integration/integration-workflow.md` |
| Admin-managed preview cards, merged card lists, exports, or preview-card migration | `docs/preview-cards/preview-card-docs.md` |

## Fast rule

If the task touches worktree setup or contributor data, use the specialized
skill before acting. Otherwise use `swubase-validation` for implementation or
review, then add only the domain documentation that matches the changed area.
