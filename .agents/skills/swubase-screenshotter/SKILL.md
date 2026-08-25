---
name: swubase-screenshotter
description: Change SWUBASE Playwright screenshot targets, capture readiness, R2 images/manifests, persisted screenshot state, CLI/admin triggers, or after-import generation.
---

# SWUBASE screenshotter

Use this skill for `server/screenshotter/`, `types/Screenshotter.ts`, screenshot
DOM targets, the `screenshotter` table, or screenshot consumers such as Discord.

## Adding or changing a target

Update the complete target chain together:

1. Shared target constant/type and any default order in
   `types/Screenshotter.ts`.
2. Capture definition and target implementation under
   `server/screenshotter/targets/`.
3. The frontend route/search state and stable `data-screenshot-target` marker
   that exposes exactly the intended region.
4. CLI/admin selection and any Discord label/order that consumes the target.

The tournament scope key is stable (`tournament:<id>`) and persistence is unique
by `(scope_key, target)`. Validate that the tournament exists and is imported
before capture. Wait for the target marker, fonts, images, skeleton removal, and
chart/render completion required by that target; do not replace readiness with
an arbitrary sleep.

Always close Playwright page/context/browser resources in `finally`. Capture
targets independently so one failure is represented in the manifest without
hiding successful images. Upload successful images, publish the manifest, then
persist usable entries. Failed targets may update existing status/error state
but must not create a row that looks like a usable screenshot.

`--skip-upload` is the safe local mode: it avoids R2 upload and database
persistence while still allowing output files. Outside local development,
`SCREENSHOTTER_APP_BASE_URL` must be explicit. After-import execution is opt-in;
its failure is reported without undoing the core tournament import.

Load `swubase-discord-notifications` when result messages consume screenshots,
`swubase-live-tournaments` for after-import behavior, and
`swubase-database-migrations` for persistence changes. Load the frontend
component/routing skills when a target changes DOM markers, controls, or URL
state.

## Validation

Install Chromium when needed with `bun run screenshotter:install`, start the
worktree frontend/backend with an imported tournament, then run:

```bash
tournament_id='replace-with-tournament-uuid'
bun run screenshotter:tournament -- --tournament-id "$tournament_id" \
  --skip-upload --output-dir "/tmp/swubase-screenshots/$tournament_id"
```

Inspect every requested image and `manifest.json`, then remove the temporary
directory when it is no longer needed. Use real R2 only when an explicit
development bucket/test is intended.
