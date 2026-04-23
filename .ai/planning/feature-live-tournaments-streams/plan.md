# Live Tournament Streams Plan

## Goal

Extend the existing live-tournament weekend resource flow so users can submit YouTube stream links and missing Melee IDs through a dialog, admins can review them in a richer table, approved YouTube streams render as embeds in the live page, and admins get a visible pending-review alert while browsing the live weekend.

## Current Repo Baseline

- `frontend/src/components/app/home/live-tournaments/sections/StreamsSection.tsx` currently renders approved resources as plain external links and uses the section header count badge.
- `frontend/src/components/app/home/live-tournaments/components/TournamentCardActionsMenu.tsx` exposes a disabled submit action, so there is no actual entry point into resource submission yet.
- `frontend/src/api/tournament-weekends/useCreateTournamentWeekendResource.ts` already posts weekend resources, so the new dialog should build on that instead of inventing a second submission flow.
- `server/routes/tournament-weekends/_id/resources/post.ts` currently accepts `stream | video | vod` and still allows Twitch URLs, which conflicts with the new requirement to support YouTube only.
- `frontend/src/components/app/admin/TournamentWeekendsPage/ResourceApproval.tsx` already gives admins a simple approve/hide table, but it has no delete action, no submitter name, no flag/tournament context, and no Melee-specific approval side effect.
- `server/routes/tournament-weekends/live/get.ts` returns only approved resources, so admins currently have no lightweight way to notice pending submissions from the live page itself.

## Key Decisions

- Reuse `tournament_weekend_resource`; no new table should be needed for v1 of this feature.
- Extend the weekend resource type union with `melee`. The table schema already stores `resource_type` as `varchar(50)`, so this should be a code-level contract change, not a migration.
- Keep storing canonical URLs in `resourceUrl`:
  - stream: canonical YouTube watch URL derived from the parsed video ID
  - melee: canonical `https://melee.gg/Tournament/View/{id}` URL derived from the submitted Melee ID
- Add normalization helpers so equivalent links dedupe cleanly against the existing unique index on `(tournamentId, resourceType, resourceUrl)`.
- Keep `video` and `vod` readable for backward compatibility, but the new submission dialog should only create `stream` and `melee` resources.
- Treat legacy non-YouTube stream rows as admin-visible data, but do not embed them in `StreamsSection`.

## Backend Plan

### 1. Tighten resource validation and normalization

- Update `types/TournamentWeekend.ts` so `TournamentWeekendResourceType` includes `melee`.
- Refactor `server/routes/tournament-weekends/_id/resources/post.ts` to use resource-type-specific validation:
  - `stream` must be a valid YouTube URL and normalize to one canonical watch URL
  - `melee` should normalize to a canonical Melee tournament URL
  - remove Twitch acceptance from this route
- Add shared helpers for:
  - extracting a YouTube video ID from supported URL shapes
  - building the canonical YouTube watch URL
  - extracting a Melee tournament ID from a URL
  - building the canonical Melee tournament URL

### 2. Add a dedicated resource list endpoint

- Add `GET /api/tournament-weekends/:id/resources`.
- Return an enriched payload instead of raw `tournament_weekend_resource` rows. Each row should include:
  - the resource
  - tournament summary needed by the UI (`id`, `name`, `location`, `meleeId`)
  - submitter display name from `user.displayName` or `user.name`
- Support a simple filter for review workflows, for example `status=all|pending|approved`.
- Keep admin access required for unapproved rows. Public users should never get pending resources from this endpoint.
- This endpoint will power both the admin review table and the blue pending-alert check on the live page.

### 3. Add resource deletion

- Add `DELETE /api/tournament-weekends/:id/resources/:resourceId` as an admin-only route.
- Mirror the existing weekend resource ownership check pattern used by the approve route so the resource must belong to the given weekend.
- After delete, return `204`.
- If the deleted resource is an approved `melee` resource and the current `tournament.meleeId` matches that resource, clear `tournament.meleeId` so the tournament record does not drift out of sync.

### 4. Extend resource approval behavior

- Keep `PATCH /api/tournament-weekends/:id/resources/:resourceId` as the approval endpoint, but extend its side effects:
  - approving `stream` only toggles `approved`
  - approving `melee` also parses the Melee ID from the stored URL and writes it into `tournament.meleeId`
- Add a conflict guard: if a tournament already has a different `meleeId`, the route should fail with a clear `409` instead of silently overwriting it.
- When hiding an approved `melee` resource, clear `tournament.meleeId` only if it still matches that resource.

### 5. Wire routes and response types

- Register the new `GET` and `DELETE` handlers in `server/routes/tournament-weekends.ts`.
- Add response types for the resource list endpoint in `types/TournamentWeekend.ts`.
- Keep `GET /api/tournament-weekends/:id` and `GET /api/tournament-weekends/live` unchanged for now; the dedicated resource endpoint avoids bloating the existing weekend detail payload and preserves the current public/live contract.

## Frontend Plan

### 1. Build a reusable submission dialog

- Replace the obsolete `StreamSubmissionPrompt.tsx` pattern with a real dialog component under `frontend/src/components/app/home/live-tournaments/components/`.
- The dialog should accept:
  - `weekendId`
  - weekend tournament list from `detail.tournaments`
  - optional `preselectedTournamentId`
- Dialog contents:
  - tournament selector built from the current weekend tournaments, with flag + tournament name
  - optional YouTube stream input
  - optional Melee ID input
  - the Melee ID field is shown only when the selected tournament does not already have `tournament.meleeId`
- Submission behavior:
  - require at least one of the two optional inputs to be filled
  - if both are filled, submit two separate resources
  - submit sequentially with `mutateAsync` so success/error handling is deterministic
  - on success, replace the form body with a green success state and checkmark, not just a toast
- Reset the form and success state when the dialog closes.

### 2. Add the two launch points

- `StreamsSection.tsx`
  - replace the header `count={resources.length}` badge with a plus-button `action`
  - clicking the button opens the submission dialog without a preselected tournament
- `TournamentCardActionsMenu.tsx`
  - replace the disabled submit item with a working dialog trigger
  - preselect the card tournament in the dialog
  - pass `weekendId` through `TournamentCard.tsx` into the menu; `TournamentCard` already receives `weekendId` upstream, so this is mostly plumbing
- Remove the now-unused `promptForStream` prop path if it no longer drives any UI.

### 3. Embed approved YouTube streams

- Replace the link list in `StreamsSection.tsx` with embedded YouTube players for approved `stream` resources only.
- Create a small reusable YouTube embed component:
  - `youtube-nocookie.com`
  - `loading="lazy"`
  - fixed 16:9 aspect ratio
  - descriptive `title`
  - `allowFullScreen`
- Continue filtering streams toward running/upcoming/unknown tournaments first, then fall back to all approved streams if nothing matches the prepared filter.
- If there are legacy stream rows that are not valid YouTube links, skip embedding them on the live page instead of crashing the section.

### 4. Add a reusable resource review table

- Create `TournamentWeekendResourceTable` as a reusable component, likely under the live-tournaments component folder so both live/admin contexts can share it.
- Main columns:
  - tournament name with flag
  - resource type
  - destination:
    - Melee link for `melee`
    - embedded YouTube preview for `stream`
    - fallback external link for other legacy types
  - submitter name
  - status
- Admin mode adds approve and delete actions.
- Refactor `frontend/src/components/app/admin/TournamentWeekendsPage/ResourceApproval.tsx` into a thin container around this new table instead of keeping two review UIs in parallel.

### 5. Add the admin pending alert on the live page

- Add a new frontend hook, for example `useGetTournamentWeekendResources`, backed by the dedicated `GET` endpoint.
- Add `useDeleteTournamentWeekendResource` beside the existing create/update hooks.
- Extend `frontend/src/api/tournament-weekends/queryKeys.ts` with a resource-list key.
- In `LiveTournamentHome.tsx`, if the viewer is an admin:
  - fetch pending resources for the active weekend
  - show an `Alert variant="info"` when any are waiting
  - include a CTA linking to `/admin?page=tournament-weekends`
- Keep the hook disabled for non-admin users so the live page does not perform unnecessary review-only requests.

## Primary Touchpoints

### Backend

- `server/routes/tournament-weekends.ts`
- `server/routes/tournament-weekends/_id/resources/post.ts`
- `server/routes/tournament-weekends/_id/resources/_resourceId/patch.ts`
- new `server/routes/tournament-weekends/_id/resources/get.ts`
- new `server/routes/tournament-weekends/_id/resources/_resourceId/delete.ts`
- `types/TournamentWeekend.ts`

### Frontend

- `frontend/src/api/tournament-weekends/useCreateTournamentWeekendResource.ts`
- `frontend/src/api/tournament-weekends/useUpdateTournamentWeekendResource.ts`
- new `frontend/src/api/tournament-weekends/useGetTournamentWeekendResources.ts`
- new `frontend/src/api/tournament-weekends/useDeleteTournamentWeekendResource.ts`
- `frontend/src/api/tournament-weekends/queryKeys.ts`
- `frontend/src/components/app/home/LiveTournamentHome.tsx`
- `frontend/src/components/app/home/live-tournaments/sections/StreamsSection.tsx`
- `frontend/src/components/app/home/live-tournaments/components/TournamentCard.tsx`
- `frontend/src/components/app/home/live-tournaments/components/TournamentCardActionsMenu.tsx`
- new submission dialog component
- new `TournamentWeekendResourceTable`
- `frontend/src/components/app/admin/TournamentWeekendsPage/ResourceApproval.tsx`

## QA Checklist

- User can open the submission dialog from the Streams header plus button.
- User can open the same dialog from a tournament card and sees that tournament preselected.
- Tournament selector shows only tournaments from the current weekend and includes country flags.
- Melee ID input is hidden for tournaments that already have `tournament.meleeId`.
- Submitting only a YouTube stream creates one pending `stream` resource.
- Submitting only a Melee ID creates one pending `melee` resource.
- Submitting both creates two separate pending resources.
- Successful submit replaces the dialog body with a green confirmation state.
- Approved YouTube streams render as embeds in `StreamsSection`.
- Admin resource table shows tournament flag/name, destination, type, status, and submitter name.
- Approving a `melee` resource updates `tournament.meleeId`, and the tournament card immediately gains the Melee link after query invalidation.
- Deleting a pending resource removes it from the table and from the pending alert count.
- Admins see a blue alert on the live page when pending resources exist; non-admins do not.
- Legacy non-YouTube stream rows do not break the live page embed section.

## Assumptions

- No DB migration is needed for v1 because `resource_type` is already a free-text column.
- The admin review table will live in the tournament weekend admin detail panel, while the pending alert will live on the public live page for admins only.
- A canonical URL strategy is sufficient to dedupe repeated submissions without adding a new column.
- If product later wants public display of the resource table, the reusable component can support a read-only mode without reworking the backend again.
