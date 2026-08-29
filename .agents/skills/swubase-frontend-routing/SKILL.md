---
name: swubase-frontend-routing
description: Add or change SWUBASE TanStack Router pages, layouts, redirects, path params, URL search params, navigation, and URL-controlled global dialogs.
---

# SWUBASE frontend routing

Use this skill for files under `frontend/src/routes/`, route-driven state, or
navigation links.

TanStack Router is file based. `$name` segments are path parameters;
underscore-prefixed segments are pathless/layout routes and render descendants
through `Outlet`.

## Search and navigation rules

- Define a Zod `validateSearch` schema at the narrowest route that owns the
  parameter. Put a parameter in `frontend/src/routes/__root.tsx` only when it
  is genuinely cross-route or controls a root-rendered overlay.
- Follow existing prefixes for shared namespaces (`modal`, `dialog`, `deck`,
  `ma`, `cs`, `tf`, `pool`, `s`) and avoid generic names that collide across
  nested schemas.
- Prefer typed `Route.useParams()`, `Route.useSearch()`, and
  `useNavigate({ from: Route.fullPath })`. Reserve
  `useSearch({ strict: false })` for components intentionally reused beneath
  multiple route schemas.
- Update search state functionally and preserve inherited values:

  ```ts
  search: previous => ({ ...previous, field: value })
  ```

  Set a field to `undefined` to remove it from the URL.
- Use Zod coercion/enums/defaults instead of casting unvalidated search input.
- Protected pages belong below `_authenticated`; admin presentation also checks
  roles. Backend authorization remains mandatory.
- Add page title metadata with `Helmet` following neighboring pages.

Never hand-edit `frontend/src/routeTree.gen.ts`. Let the TanStack Vite plugin
regenerate it during dev/build and include the generated diff when route files
change. Quote shell paths containing `$teamId`, `$deckId`, or similar names.

Load `swubase-frontend-components` for the screen implementation and
`swubase-auth-permissions` when adding protected layouts or redirects.

## Validation

Run `bun run --cwd frontend build`, inspect the generated route-tree diff, then
test direct URL load, refresh, back/forward, optional-param removal, and relevant
authenticated/anonymous behavior.
