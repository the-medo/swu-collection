# Crossfire account access

Enable `CROSSFIRE_ENABLED=1` on the API and worker, then open
`/admin?page=crossfire-access` as a SWUBASE administrator. Search by name or email
and choose **Grant access**. Administrators can grant themselves access here.
The same screen revokes access without changing any other account roles.

Every player and spectator needs the explicit `crossfire` role. Better Auth
stores multiple roles as comma-separated text in the existing `user.role`
column: `admin,crossfire`, `moderator,crossfire`, or `user,crossfire` are valid.
Administration or moderation alone does not enable Crossfire. There is no new
table, migration, environment variable, or engine/card version change.

The control uses `GET /api/admin/crossfire-access?search=…` (at most 25 accounts;
narrow the search for more) and `PATCH /api/admin/crossfire-access/:userId` with
`{"enabled":true}` or `{"enabled":false}`. These routes require administration
and recheck the live session plus `user:set-role` permission inside the database
transaction. Updates lock accounts and preserve their other roles. Responses
are uncached; writes require the configured origin. Card-release administration
also remains available to administrators without gameplay membership.

Better Auth's native `setRole` API still accepts role arrays, but it replaces the
whole list. Use the Crossfire access control when changing only membership.
Self-updates refresh the browser session immediately. Other open tabs pick up
role changes through session refresh; existing invitation connections refresh
on an authorization rejection (normally at the next 15-second heartbeat).
The worker rechecks account access on ticket redemption, replay requests and
command authorization, including inside the command commit transaction. A role
revoked before commit rejects the command without changing the game state.

Revocation does not delete or concede games, alter results, or remove replays
and bookmarks. Granting access again restores access subject to the existing
seat, ownership and spectator rules. Accounts without access see no Crossfire
navigation, deck Play controls or invitation subscription. Direct page links
show an access message, and direct API/socket calls are denied by the server.

Contributor database sanitization deliberately resets retained accounts to
`admin`; it does not preserve production Crossfire grants. After restoring a
sanitized database, use the same admin screen to grant local access. Browser
and integration fixtures create and clean up their own explicitly permitted
accounts.

Validation lives in `shared/lib/auth/roles.test.ts`, the Crossfire HTTP and
admin router tests, `play/integration/access.test.ts`, the lobby/connection/socket
integration tests, and `play/browser/access-smoke.ts` plus
`play/browser/access-admin-smoke.ts`. Browser fixtures require the running local
worktree and its development Better Auth environment; they never grant roles
to existing accounts.
