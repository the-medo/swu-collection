# Feature Screenshotter Plan

## Summary

Create a server-side screenshotter feature under `server/screenshotter` that uses Playwright to open app pages, capture named visual assets, and upload them to the existing R2 bucket under `screenshots/...`.

The first target family should be tournament screenshots. It should target one imported tournament at a time and produce:

1. Tournament bracket screenshot from `/tournaments/:tournamentId/details`, cropped to the bracket plus top 8 placements area.
2. Full-tournament leaders-and-base meta screenshot from `/tournaments/:tournamentId/meta?maMetaInfo=leadersAndBase`.
3. Top 8 leaders-and-base meta screenshot from `/tournaments/:tournamentId/meta?maMetaPart=top8&maMetaInfo=leadersAndBase`.
4. Winning deck image generated through the existing deck image dialog opened from the bracket page.

The implementation should be reliable enough to run from a script without manual browser interaction. An admin endpoint can exist as a convenience trigger, but the primary flow should be script-first so it can run automatically after tournament import finishes.

The screenshotter should not be modeled as tournament-only. Future target families may include meta overview pages, tournament groups, format dashboards, or other app surfaces.

## Current Repo Baseline

- The root package does not currently include `playwright`; this feature needs a new root dependency and a browser install step for any environment that runs it.
- R2 uploads already use `@aws-sdk/client-s3` in several places, including:
  - `server/routes/tournaments/_id/export-to-blob/post.ts`
  - `server/routes/teams/_id/logo/post.ts`
  - `server/lib/decks/generateDeckThumbnail.ts`
  - `server/lib/tournaments/generateTournamentThumbnail.ts`
- R2 config is currently duplicated in those files:
  - bucket: `swu-images`
  - `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - public URL shape: `https://images.swubase.com/{key}`
- Long-running server actions already exist and are protected by admin permissions:
  - `POST /api/tournament/thumbnails`
  - `POST /api/deck/thumbnails`
  - `POST /api/tournament/:id/export-to-blob`
- The Hono app already configures explicit route timeouts for slow operations in `server/app.ts`.
- Tournament import already has script/cron style entry points, including `server/crons/process-tournament-import.ts`, which is a natural place to trigger screenshot generation after an import completes.
- Tournament detail pages are public app routes rendered by the frontend:
  - `frontend/src/routes/tournaments/$tournamentId/details.tsx`
  - `frontend/src/routes/tournaments/$tournamentId/meta.tsx`
- The bracket page renders `DetailAndBracketTab`, which includes `TournamentTopBracket`.
- `TournamentTopBracket` already renders the useful combined target area:
  - bracket rounds on the left
  - top placements on the right
  - deck selection through bracket/placement clicks
  - `DeckViewer` when a deck is selected
- The meta page renders `TournamentMetaAnalyzer`, whose top-level content includes:
  - view mode selector
  - meta part selector
  - meta info selector
  - total deck count and info alert
  - chart/table output
- URL search params already control the requested meta states:
  - `maMetaPart`
  - `maMetaInfo`
  - `maViewMode`
- The deck image flow already exists:
  - `DeckViewer` renders `DeckContents`
  - non-compact `DeckContents` renders `DeckImageButton`
  - `DeckImageButton` opens a dialog
  - `DeckImage` renders a canvas, then an exported `<img alt="Deck image">`
- `DeckImage` preloads card images with `crossOrigin = 'anonymous'`, which is important because the final deck image is canvas-derived.

## Key Decisions

- Add a small reusable R2 helper instead of copying another S3 client into `server/screenshotter`.
- Add stable frontend screenshot markers with `data-screenshot-target` attributes. Playwright should target these markers rather than relying on Tailwind classes, button text, or document structure.
- Use element screenshots for bracket/meta captures. This avoids uploading full-page screenshots with nav/sidebar/footer noise.
- Use the generated deck image `<img>` itself for the winning deck upload, not a screenshot of the whole dialog chrome.
- Treat the script as the primary execution path. The API endpoint should call the same service, but should not own the orchestration logic.
- Keep the screenshotter browser lifecycle explicit:
  - launch browser once per run
  - create a fresh context per tournament run
  - reuse one page inside that context for the four captures
  - always close browser/context in `finally`
- Read the app base URL from env. Use `http://localhost:5173` for local testing and the real website URL in production.
- Upload deterministic object keys and overwrite old captures. No timestamped versions or `latest.json` indirection for v1.
- Return a manifest from the run and upload the same manifest to R2 for downstream consumers.
- Persist screenshot metadata in a generic database table named `screenshotter` so the app can query current screenshot URLs without scraping R2.
- Use default anonymous/frontend user settings for deck image generation in v1. Do not add forced screenshot-specific deck image settings yet.

## R2 Output

Recommended keys for the first tournament target family:

```txt
screenshots/tournaments/{tournamentId}/bracket.png
screenshots/tournaments/{tournamentId}/meta-leaders-and-base-all.png
screenshots/tournaments/{tournamentId}/meta-leaders-and-base-top8.png
screenshots/tournaments/{tournamentId}/winning-deck.png
screenshots/tournaments/{tournamentId}/manifest.json
```

Each uploaded screenshot result and database row should include:

- logical target id
- source URL
- R2 key
- public URL
- content type
- byte size
- viewport
- captured dimensions when available
- timestamp

Deterministic uploads should overwrite these keys on each successful run.

Future target families should follow the same `screenshots/{scope}/{scopeId-or-key}/{target}.png` style, for example:

```txt
screenshots/tournament-groups/{tournamentGroupId}/meta-overview.png
screenshots/meta/{metaId}/overview-leaders-and-base.png
```

## Database Plan

Add a generic table for persisted screenshot metadata named `screenshotter`.

This table should be able to store the current screenshots for tournaments now and future scopes later.

Suggested columns:

```txt
id uuid primary key
scope_type varchar(80) not null
scope_id text
scope_key text not null
target varchar(120) not null
r2_key text not null
url text not null
content_type varchar(100) not null
byte_size integer
width integer
height integer
source_url text
status varchar(20) not null default 'success'
error text
generated_at timestamp/string not null
created_at timestamp/string not null
updated_at timestamp/string not null
```

Scope examples:

```txt
scope_type = 'tournament'
scope_id = tournament id
scope_key = tournament:{tournamentId}

scope_type = 'tournament-group'
scope_id = tournament group id
scope_key = tournament-group:{tournamentGroupId}

scope_type = 'meta-overview'
scope_id = nullable meta id or format id, depending on target
scope_key = meta-overview:{metaId-or-format-key}
```

Suggested constraints/indexes:

- unique `(scope_key, target)` so deterministic keys map to one current record per target
- index on `(scope_type, scope_id)`
- index on `scope_key`

Persistence behavior:

- On successful upload, upsert the row for `(scope_key, target)` with the latest URL, dimensions, byte size, and `status='success'`.
- On target failure, either:
  - update the row with `status='failed'` and `error`, preserving the previous successful URL fields, or
  - store failures only in the manifest.
- Preferred v1 behavior: preserve previous successful URL fields and update `status/error/generated_at`, so a transient failure does not erase the last usable screenshot.
- Store the uploaded manifest in R2 as operational detail, while the DB table is the app-facing source for current screenshot URLs.

## Frontend Stability Plan

Add minimal `data-screenshot-target` attributes to existing UI. These should not change layout or visible UI.

### Bracket target

Add `data-screenshot-target="tournament-bracket"` to the root visual card in `TournamentTopBracket`.

Target behavior:

- The screenshot includes `BracketRounds` and `TournamentPlacements`.
- It should not include the tournament info table above the bracket.
- If the tournament has no bracket data, the screenshotter should fail that target with a clear message instead of uploading an empty placeholder.

Likely file:

- `frontend/src/components/app/tournaments/TournamentTopBracket/TournamentTopBracket.tsx`

### Meta target

Add `data-screenshot-target="tournament-meta-analysis"` to the top-level wrapper in `TournamentMetaAnalyzer`.

Target behavior:

- The screenshot includes the controls and charts/table region.
- The screenshotter should force chart mode for the two requested captures by including `maViewMode=chart`.
- The screenshotter should wait until the chart region has rendered non-empty SVG/canvas content before capture.

Likely file:

- `frontend/src/components/app/tournaments/TournamentMeta/TournamentMetaAnalyzer.tsx`

### Deck selection target

Add stable markers around the clickable top placement/deck rows.

Recommended:

- `data-screenshot-target="top-placement-deck"`
- `data-placement={placement}`
- `data-deck-id={deckId}`

The screenshotter can then click the row with `data-placement="1"` when available, falling back to the first top placement row.

Likely file:

- `frontend/src/components/app/tournaments/TournamentTopBracket/components/TournamentPlacements.tsx`

### Deck image target

Add stable markers for the image button/dialog output:

- `data-screenshot-action="open-deck-image"` on the `DeckImageButton` trigger
- `data-screenshot-target="deck-image-output"` on the final exported `<img alt="Deck image">`

Target behavior:

- Click first winning/top deck from the bracket page.
- Wait for `DeckViewer`/`DeckContents`.
- Click the image button.
- Wait for `deck-image-output`.
- Fetch the `<img>` source as a blob in the browser context or screenshot the image element directly.

Likely files:

- `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImageButton.tsx`
- `frontend/src/components/app/decks/DeckContents/DeckImage/DeckImage.tsx`

## Backend Structure

Create a new folder:

```txt
server/screenshotter/
  index.ts
  types.ts
  config.ts
  r2.ts
  playwright.ts
  captureScreenshots.ts
  persistScreenshots.ts
  runScreenshotter.ts
  runTournamentScreenshots.ts
  targets/
    tournament/
      bracket.ts
      meta.ts
      winningDeck.ts
```

### `config.ts`

Centralize runtime configuration:

- `SCREENSHOTTER_APP_BASE_URL`, default `http://localhost:5173`
- `SCREENSHOTTER_VIEWPORT_WIDTH`, default `1440`
- `SCREENSHOTTER_VIEWPORT_HEIGHT`, default `1200`
- `SCREENSHOTTER_DEVICE_SCALE_FACTOR`, default `1`
- `SCREENSHOTTER_TIMEOUT_MS`, default around `60000`
- R2 bucket/config via the existing `R2_*` env vars

Required URL behavior:

- `SCREENSHOTTER_APP_BASE_URL` should be required in production.
- Local development can default to `http://localhost:5173`.
- The configured URL should point at the frontend app, not necessarily the API server.
- Do not let callers pass arbitrary external URLs through the public API. The server should build URLs from the configured base URL and the validated tournament id.

### `r2.ts`

Add reusable helpers:

```ts
uploadBufferToR2({
  key,
  body,
  contentType,
  cacheControl,
}): Promise<{ key: string; url: string; size: number }>
```

For screenshots:

- content type: `image/png`
- cache control: `public, max-age=31536000, immutable` if overwriting is acceptable with CDN invalidation strategy, otherwise use a shorter `max-age` for deterministic keys

For the manifest:

- content type: `application/json`
- cache control can be short, for example `public, max-age=60`

After this feature, consider replacing the duplicated R2 setup in thumbnail/export routes with this helper in a separate cleanup.

### `playwright.ts`

Own browser/page setup:

- import from `playwright`
- launch Chromium headless
- set viewport/device scale factor
- set locale/timezone if needed for deterministic rendering
- block or log console errors
- expose a helper to wait for app readiness:
  - DOM content loaded
  - network idle where useful
  - target selector visible
  - fonts loaded through `document.fonts.ready`
  - images inside target have completed

Avoid global browser reuse in v1 unless repeated screenshot runs become common. A simple launch-per-run model is easier to reason about.

### `captureScreenshots.ts`

Main orchestration API:

```ts
captureScreenshots({
  scope,
  targets,
  force,
}): Promise<ScreenshotterManifest>
```

Recommended tournament target ids:

```ts
type TournamentScreenshotTarget =
  | 'bracket'
  | 'meta-leaders-and-base-all'
  | 'meta-leaders-and-base-top8'
  | 'winning-deck';
```

The orchestrator should:

1. Resolve and validate the requested scope before opening the browser.
   - for tournament screenshots, validate the tournament exists and is imported
2. Launch Playwright.
3. Capture each requested target in sequence.
4. Upload each successful capture.
5. Continue to the next target when one target fails, unless the browser/page is unrecoverable.
6. Upload a manifest containing successes and failures.
7. Return the manifest to the caller.

Continuing after target-level failures is useful because meta screenshots can still be produced even when the deck image flow fails.

### `persistScreenshots.ts`

Own database writes for screenshot records.

Responsibilities:

- Convert manifest results into `screenshotter` upserts.
- Preserve previous successful URL/key fields when a target fails.
- Keep persistence separate from Playwright so the capture code remains testable.

### `runScreenshotter.ts`

Add a generic script entry point that can run any supported scope/target family.

Example invocation:

```txt
bun server/screenshotter/runScreenshotter.ts --scope-type tournament --scope-id {uuid}
```

Future examples:

```txt
bun server/screenshotter/runScreenshotter.ts --scope-type tournament-group --scope-id {uuid} --targets meta-overview
bun server/screenshotter/runScreenshotter.ts --scope-type meta-overview --scope-key meta-overview:set-4-premier --targets overview-leaders-and-base
```

Optional flags:

```txt
--targets bracket,meta-leaders-and-base-all,meta-leaders-and-base-top8,winning-deck
--skip-upload
--output-dir .tmp/screenshots/{scopeKey}
--json
```

Default generic script behavior:

1. Parse and validate scope arguments.
2. Resolve default targets for the requested scope type when `--targets` is omitted.
3. Upload screenshots to R2 unless `--skip-upload` is used.
4. Upsert the `screenshotter` rows unless `--skip-upload` is used.
5. Print a concise summary to stdout.
6. Exit with:
   - `0` if all requested targets succeed
   - `1` if at least one target fails
   - `2` for validation/config errors

### `runTournamentScreenshots.ts`

Add a small tournament-specific wrapper around `runScreenshotter.ts` for the import workflow and easy manual use.

Recommended invocation:

```txt
bun server/screenshotter/runTournamentScreenshots.ts --tournament-id {uuid}
```

Optional flags mirror the generic script:

```txt
--targets bracket,meta-leaders-and-base-all,meta-leaders-and-base-top8,winning-deck
--skip-upload
--output-dir .tmp/screenshots/{tournamentId}
--json
```

Default tournament script behavior:

1. Parse and validate CLI arguments.
2. Build `scope_type='tournament'`, `scope_id={tournamentId}`, and `scope_key=tournament:{tournamentId}`.
3. Delegate to the generic runner/service with the tournament default targets.

The script should be safe to call immediately after a tournament import completes. It should use the configured frontend URL, so production can screenshot the real website while local testing can target localhost.

## Post-Import Integration Plan

After the core screenshotter works, wire it into the import workflow.

Recommended approach:

- Keep `captureScreenshots` as the shared service.
- Call it from the tournament import completion path after the imported tournament data has committed.
- Do not run screenshot generation inside the same database transaction as import.
- If import processing is queue/cron based, trigger screenshot generation after a successful import job and log failures without rolling back import success.
- If the import function returns the imported `tournamentId`, pass that id directly to the screenshotter.
- Gate automatic screenshot generation with an env flag, for example `SCREENSHOTTER_RUN_AFTER_IMPORT=true`, so local/dev environments can opt in.

Suggested failure policy:

- Import success should not depend on screenshot success.
- Screenshot failures should be logged and captured in the manifest/DB status.
- If every target fails, the import job can still finish successfully but should emit a warning/error log for Sentry visibility.

## Capture Details

### Bracket

Route:

```txt
{baseUrl}/tournaments/{tournamentId}/details
```

Steps:

1. Navigate to the route.
2. Wait for `[data-screenshot-target="tournament-bracket"]`.
3. Wait for loading skeletons inside the target to disappear.
4. Wait for images inside the target to complete.
5. Screenshot the element.
6. Upload to `screenshots/tournaments/{tournamentId}/bracket.png`.

Recommended Playwright action:

```ts
await page.locator('[data-screenshot-target="tournament-bracket"]').screenshot({ type: 'png' });
```

### Full Tournament Meta

Route:

```txt
{baseUrl}/tournaments/{tournamentId}/meta?maMetaInfo=leadersAndBase&maViewMode=chart
```

Steps:

1. Navigate to the route.
2. Wait for `[data-screenshot-target="tournament-meta-analysis"]`.
3. Wait for chart SVG/canvas output inside the target.
4. Wait for fonts/images.
5. Screenshot the target.
6. Upload to `screenshots/tournaments/{tournamentId}/meta-leaders-and-base-all.png`.

### Top 8 Meta

Route:

```txt
{baseUrl}/tournaments/{tournamentId}/meta?maMetaPart=top8&maMetaInfo=leadersAndBase&maViewMode=chart
```

Steps are the same as full tournament meta.

Upload to:

```txt
screenshots/tournaments/{tournamentId}/meta-leaders-and-base-top8.png
```

### Winning Deck Image

Route:

```txt
{baseUrl}/tournaments/{tournamentId}/details
```

Steps:

1. Navigate to the bracket page.
2. Wait for `[data-screenshot-target="tournament-bracket"]`.
3. Click `[data-screenshot-target="top-placement-deck"][data-placement="1"]` if present.
4. Fall back to the first `[data-screenshot-target="top-placement-deck"]` if placement 1 is missing.
5. Wait for `DeckContents` to render.
6. Click `[data-screenshot-action="open-deck-image"]`.
7. Wait for `[data-screenshot-target="deck-image-output"]`.
8. Read the final image bytes:
   - preferred: evaluate `fetch(img.src).arrayBuffer()` if the `src` is a blob URL
   - fallback: screenshot the image element
9. Upload to `screenshots/tournaments/{tournamentId}/winning-deck.png`.

The preferred blob-read path preserves the exact generated deck image without dialog background, fixed controls, or viewport clipping.

## API Plan

Add an admin-only route to trigger the screenshotter manually. This is secondary to the script-first workflow.

Recommended route for the first tournament target family:

```txt
POST /api/tournament/:id/screenshots
```

Why this route:

- The existing tournament-specific operations already live under `/api/tournament/:id/...`.
- The request is naturally scoped to one tournament.
- It keeps the first manual trigger simple while the generic implementation stays in `server/screenshotter`.
- Later non-tournament target families can add a separate admin route, for example `POST /api/admin/screenshotter/run`, without changing the DB table or core capture service.

Request shape:

```ts
{
  targets?: TournamentScreenshotTarget[];
  force?: boolean;
}
```

Response shape:

```ts
{
  message: string;
  data: ScreenshotterManifest;
}
```

Authorization:

- Require logged-in user.
- Require `admin: ['access']`, matching thumbnail generation routes.

Route timeout:

- Add a timeout in `server/app.ts`, probably `180000` to start.
- If deck image generation is slow on production, increase to `300000`.

Optional later improvement:

- Add a background job/queue if this becomes a user-facing bulk action. For v1, a synchronous admin route is simpler and matches existing thumbnail endpoints.

## Types

Add shared or server-local types.

Because the DB table may eventually be displayed in the frontend, put shared response/record types in `types/Screenshotter.ts`, while keeping Playwright-only implementation types in `server/screenshotter/types.ts`.

Suggested manifest:

```ts
export type ScreenshotterScope = {
  type: 'tournament' | 'tournament-group' | 'meta-overview' | string;
  id?: string | null;
  key: string;
};

export type ScreenshotterManifest = {
  scope: ScreenshotterScope;
  generatedAt: string;
  appBaseUrl: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  results: ScreenshotterResult[];
};

export type ScreenshotterResult = {
  target: string;
  sourceUrl: string;
  ok: boolean;
  key?: string;
  url?: string;
  contentType?: string;
  byteSize?: number;
  width?: number;
  height?: number;
  error?: string;
};
```

Tournament-specific request helpers can still narrow `target` to `TournamentScreenshotTarget`, but persistence should store it as a generic string.

## Dependency And Runtime Plan

Add root dependency:

```txt
playwright
```

Install browser binary where the server runs:

```txt
bunx playwright install chromium
```

Deployment note:

- If production is containerized, add the Chromium install to the image build.
- If production has strict Linux library availability, use the official Playwright dependency install guidance or switch to a known-compatible base image.
- Keep the implementation isolated so moving screenshot generation to a worker process later does not touch frontend selectors or capture target logic.

## Verification Plan

### Local manual verification

1. Start the frontend dev server on `http://localhost:5173`.
2. Start the backend server if the frontend dev app needs local API access.
3. Pick an imported tournament with:
   - bracket data
   - top 8 placements
   - at least one decklist
   - enough deck image assets to generate the deck image
4. Run the script for that tournament:

```txt
bun server/screenshotter/runTournamentScreenshots.ts --tournament-id {tournamentId}
```

5. Confirm the script summary includes four successful screenshot URLs and a manifest URL.
6. Open each uploaded URL and verify:
   - bracket screenshot is cropped to bracket plus placements
   - full meta screenshot shows leaders-and-base with all decks
   - top 8 meta screenshot shows leaders-and-base with top 8 selected
   - winning deck image is the generated deck image only, not the dialog chrome
   - `screenshotter` rows exist or update for each target with `scope_key = tournament:{tournamentId}`
   - rerunning the screenshotter overwrites the same R2 keys and updates the same DB rows
7. Optionally call the admin endpoint for the same tournament to verify the manual trigger uses the same service.

### Automated verification

Add unit-style tests around pure helpers where practical:

- R2 key generation
- target URL building
- target list validation
- manifest shape for successes/failures

For Playwright itself, prefer an integration smoke script over brittle unit tests:

```txt
bun server/screenshotter/runTournamentScreenshots.ts --tournament-id {tournamentId} --skip-upload --output-dir .tmp/screenshots/{tournamentId}
```

The smoke script can run without uploading when `SCREENSHOTTER_DRY_RUN=true`, writing images to a local temp folder for quick inspection.

## Failure Handling

Report each target independently in the manifest.

Expected failure cases:

- frontend app not reachable
- tournament does not exist
- tournament is not imported
- no bracket/top placements are available
- no clickable deck is available
- deck image generation times out
- R2 credentials are missing
- upload fails
- DB persistence fails after upload

Recommended behavior:

- validation failures before browser launch return a normal API error
- per-target failures are captured in the manifest with `ok: false`
- route returns `200` if at least one target succeeds
- route returns `500` if every target fails due to capture/upload errors
- script exits non-zero if any requested target fails, but post-import callers may catch/log this so import completion is not rolled back

## Implementation Order

1. Add Playwright dependency and document the Chromium install requirement.
2. Add frontend `data-screenshot-*` markers for bracket, meta, top placement rows, image button, and deck image output.
3. Add the generic `screenshotter` schema/table and generated migration.
4. Add `server/screenshotter` config, shared/server types, R2 helper, DB persistence helper, and Playwright helpers.
5. Implement bracket capture.
6. Implement both meta captures.
7. Implement winning deck image capture.
8. Add `server/screenshotter/runScreenshotter.ts` as the generic script entry point.
9. Add `server/screenshotter/runTournamentScreenshots.ts` as the post-import convenience wrapper.
10. Add the admin route `POST /api/tournament/:id/screenshots` and wire it into `server/routes/tournament.ts`.
11. Add route timeout in `server/app.ts`.
12. Add post-import integration behind `SCREENSHOTTER_RUN_AFTER_IMPORT=true`.
13. Run local end-to-end verification against a real imported tournament and adjust waits/selectors.

## Settled Decisions

- Screenshot keys overwrite old captures.
- Manual API trigger remains admin-only.
- The script is the primary execution path and should be callable after tournament import finishes.
- Screenshot metadata should be persisted in the generic `screenshotter` DB table, not a tournament-only table.
- `SCREENSHOTTER_APP_BASE_URL` controls the target app URL: localhost for local testing, real website in production.
- Deck image generation uses default anonymous/frontend settings for v1.
