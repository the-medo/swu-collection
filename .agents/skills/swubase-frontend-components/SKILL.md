---
name: swubase-frontend-components
description: Build or refactor SWUBASE React components, dialogs, forms, reusable controls, responsive layouts, and client feature state using repository UI conventions.
---

# SWUBASE frontend components

Use this skill for React UI under `frontend/src/components/` or substantial
page presentation under `frontend/src/routes/`.

## Placement and reuse

- Check `frontend/src/components/ui/` first for the Radix/shadcn primitive.
- Put reusable SWUBASE domain controls in
  `frontend/src/components/app/global/` and keep feature-specific components
  under `frontend/src/components/app/<domain>/`, colocating subcomponents and
  feature stores there.
- Keep route modules thin: route contract, params/search, and a feature page
  component are usually separate.
- Prefer Lucide for general UI icons while preserving existing domain/brand SVG
  systems. Use Tailwind classes, semantic theme tokens, `cn()` for class
  composition, and CVA for meaningful component variants.

Choose state by ownership:

| State | Preferred owner |
| --- | --- |
| Small interaction | local React state |
| Bookmarkable/shareable page state | TanStack Router search params |
| Server data | TanStack Query |
| Multi-component feature state | colocated TanStack Store |
| Structured persistent browser cache | Dexie |
| Cross-device/account preference | shared user-settings contract and settings hooks |
| Small browser-only UI preference | namespaced localStorage |

Forms use `@tanstack/react-form`, controlled inputs, and
`FormFieldError` where field validation exists. Prevent native submit
navigation and reflect mutation pending state. Reuse the app dialog wrapper or
Radix primitives and preserve accessible labels, titles/descriptions, focus
behavior, and keyboard operation; use visually hidden text when a visible label
is intentionally omitted.

Preserve light/dark behavior and prefer responsive Tailwind/container-query
layouts over viewport-reading JavaScript. Provide deliberate loading, error,
empty, disabled, and destructive-confirmation states.

`useUser`, `SignInWrapper`, `useRole`, and `usePermissions` may control UX only.
Protected actions still require server authorization.

Load `swubase-frontend-routing` for page or URL state, `swubase-frontend-api`
for server data, and `swubase-browser-storage` for persistence.

## Validation

Run the frontend build and focused ESLint. Manually check narrow/wide layouts,
light/dark themes, loading/error/empty states, and keyboard/dialog behavior
relevant to the change.
