---
name: swubase-backend-endpoints
description: Create or change SWUBASE Hono API endpoints, route trees, validation, authorization, response contracts, and backend service logic.
---

# SWUBASE backend endpoints

Use this skill for HTTP work under `server/routes/`, route registration in
`server/app.ts`, or server libraries called by API handlers.

## Add or change an endpoint

1. Find the closest route family and follow its directory-shaped URL layout.
   Individual method files normally create `new Hono<AuthExtension>()` and
   handle `/`; the domain aggregator mounts them at `/:id/...` as needed.
2. Put request validation before the handler with `zValidator` for every
   applicable `json`, `query`, or `param` input. Reuse a Zod contract from root
   `types/` or the appropriate `shared/` module when frontend and backend share
   it; `shared/types/` is the usual home for pure DTOs. Use Zod
   coercion for numeric query strings and the shared `booleanPreprocessor` for
   boolean query strings. Prefer a param validator to a thrown `z.parse()` in a
   handler, which otherwise reaches the generic 500 handler.
3. Enforce authorization on the server before reading or mutating protected
   data. Use the session from `c.get('user')`, `requireAdmin(c)` for the common
   admin gate, an exact `auth.api.userHasPermission` check for action-specific
   permissions, and ownership predicates for user-owned records. Client-side
   checks are never sufficient.
4. Keep the handler orchestration-sized. Move reusable, transactional, or
   integration-heavy logic to the matching `server/lib/<domain>/` module.
5. Return explicit JSON and status codes. Successful collections/resources
   generally use `{ data: ... }`; failures expose a safe `message` or `error`
   and must not leak credentials, tokens, SQL details, or upstream secrets.
6. Mount the method in its domain aggregator and mount a new domain in the
   chained `apiRoutes` definition in `server/app.ts`. That exported type powers
   the frontend Hono client, so registration is part of the API contract.
7. Add a timeout middleware in `server/app.ts` only for genuinely long-running
   routes, scoped to the exact path.

Prefer database transactions when multiple writes form one invariant. Publish
cache invalidations, WebSocket events, Discord work, or other external effects
only after the authoritative write succeeds; decide explicitly whether a
secondary-effect failure should fail the request or be best-effort.

Use 401 for a missing session, 403 for an authenticated user lacking access,
404 for a missing resource (or when concealing its existence), and 400/409 for
validated business conflicts. Put ownership into the Drizzle predicate instead
of trusting a client-supplied user ID or only checking an earlier lookup. Map
only expected database errors; let unexpected errors reach the centralized
Sentry/500 handler.

Enumerate externally supplied sort columns/directions with Zod and map them to
known Drizzle columns plus `asc()`/`desc()`. Never interpolate arbitrary request
input into `sql.raw`; some legacy routes do this and are not safe examples.

For a frontend consumer, also load `swubase-frontend-api`. For auth model or
role changes, load `swubase-auth-permissions`. For WebSocket or Discord effects,
load the corresponding specialized skill.

## Validation

Run focused Bun tests for extracted server logic, exercise success plus
validation/auth/not-found paths against the worktree backend, and run
`bun run --cwd frontend build` when route typing or a frontend consumer changed.
Finish with `git diff --check`.
