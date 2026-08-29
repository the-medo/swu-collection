---
name: swubase-frontend-api
description: Create or change SWUBASE frontend Hono API hooks, TanStack Query keys, cache freshness, errors, mutations, and invalidation behavior.
---

# SWUBASE frontend API

Use this skill for work under `frontend/src/api/`, the typed client in
`frontend/src/lib/api.ts`, or TanStack Query cache behavior.

## Conventions

- Use the typed `api` Hono client by default. Keep any necessary raw `fetch`
  exception (for example, an untyped multipart upload) contained in the API
  layer with the relative `/api` origin; never put it in a component or
  hard-code a backend origin.
- Put one operation hook under `frontend/src/api/<domain>/` and export it from
  that domain's `index.ts` when the domain uses a barrel.
- For a coherent route family, define a query-key factory like
  `frontend/src/api/tournament-weekends/queryKeys.ts`. Include every request
  input that changes returned data. Use a stable family prefix so mutations can
  invalidate the correct breadth.
- Gate missing IDs and auth prerequisites with `skipToken` or a correctly
  combined `enabled` condition; never issue placeholder-ID requests.
- Check `response.ok`. Prefer `createApiError()` from
  `frontend/src/api/errors.ts` and `ErrorWithStatus` so server messages and
  status codes survive.
- Keep contracts used on both sides in root `types/` or the appropriate
  `shared/` module; `shared/types/` is the usual home for pure DTOs. Use
  `import type` when importing a server-side type into frontend code.
- On mutation success, update, invalidate, or remove every affected cache,
  including dependent views. Do not invalidate only the most obvious query.
- Choose `staleTime` deliberately. `Infinity` is appropriate only when explicit
  invalidation or a Dexie/server-version protocol owns freshness.
- Decide whether the hook or component owns success/error toasts; do not show
  the same notification in both.

New code should follow the newer player-watch and tournament-weekend patterns:
typed key factories and `createApiError`, rather than legacy ad-hoc strings and
generic errors.

Load `swubase-backend-endpoints` for a new server contract,
`swubase-browser-storage` when Query data is persisted in Dexie/localStorage,
and `swubase-websockets` when realtime events update the same cache.

## Validation

Run:

```bash
bun run --cwd frontend build
cd frontend && bunx eslint src/api/player-watch src/components/app/player-watch
```

Replace those example paths with the changed feature, then exercise loading,
error, empty, mutation, and refetch/invalidation states.
