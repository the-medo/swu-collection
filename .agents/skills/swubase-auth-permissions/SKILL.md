---
name: swubase-auth-permissions
description: Change SWUBASE Better Auth configuration, OAuth/session behavior, user fields, roles, permission policy/helpers, or frontend auth affordances safely across the stack.
---

# SWUBASE authentication and permissions

Use this skill for `server/auth/`, Better Auth schema changes, OAuth providers,
sessions/cookies, authorization policy/helpers, role definitions, or
role/permission UI. An endpoint that merely applies an existing gate needs
`swubase-backend-endpoints`, not this skill, unless auth behavior changes.

## Sources of truth

- `server/auth/auth.ts`: Better Auth server configuration, providers,
  additional user fields, trusted origins, and worktree cookie prefix.
- `server/auth/permissions.ts`: shared access-control statements and roles.
- `server/db/schema/auth-schema.ts`: database tables consumed by the adapter.
- `server/app.ts`: session hydration into `AuthExtension` variables.
- `server/lib/getTeamMembership.ts`: team membership lookup for owner/member
  decisions.
- `frontend/src/lib/auth-client.ts`: client plugin/role mirror.
- `frontend/src/routes/_authenticated.tsx`, `frontend/src/hooks/useUser.ts`,
  `frontend/src/hooks/useRole.ts`, and
  `frontend/src/hooks/usePermissions.ts`: presentation and navigation gates.

Backend authorization is authoritative. Use `requireAdmin(c)` for the common
admin gate, exact `auth.api.userHasPermission` calls for action-level access,
`getTeamMembership()` plus an explicit owner/member decision for team access,
and ownership checks for user resources. Frontend role/permission checks only
hide or disable UI. `AuthExtension` provides typed nullable session variables;
it does not protect a route by itself.

When adding an access-control statement or role, update server and client
configuration together. When changing Better Auth tables or additional user
fields, run `bun run auth-generate`, carefully reconcile the generated schema
with existing project fields, and create a Drizzle migration using
`swubase-database-migrations`; do not accept destructive generated changes
blindly.

Better Auth user IDs are text, not UUIDs. New foreign keys to the user table
must use a compatible type. Any new auth or personal field must also be reviewed
under `swubase-development-data` so contributor sanitization cannot leak it.

Preserve worktree isolation: `BETTER_AUTH_URL`, `VITE_BETTER_AUTH_URL`, trusted
origins, OAuth callback URIs, and `BETTER_AUTH_COOKIE_PREFIX` must describe the
same local instance. Cookies are host-scoped, so the per-worktree prefix is
required even when ports differ.

Never log provider secrets, session tokens, account tokens, or cookies. Do not
invent credentials or production fallbacks. Return 401 when authentication is
missing; use 403 for denied authenticated callers or a deliberate concealed 404
when that resource's policy must not reveal its existence.

## Validation

Test anonymous, ordinary-user, permitted-role, and forbidden-role behavior on
the backend. Then test sign-in callback, refresh/direct navigation, sign-out,
and protected UI. Run the frontend build and apply any auth schema migration to
the isolated worktree database.
