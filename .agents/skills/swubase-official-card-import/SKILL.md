---
name: swubase-official-card-import
description: Fetch, stage, merge, validate, and publish new or corrected official SWU cards, variants, playable sets, images, and derived default-variant data.
---

# SWUBASE official card import

Use this skill only for deliberate official-catalog ingestion. Always load
`swubase-card-catalog` first. This workflow reads a live upstream API, writes
ignored staging files and tracked catalog data, can upload public R2 objects,
and can mutate PostgreSQL derived data.

New official cards are generated into tracked static JSON, not inserted into a
PostgreSQL card table. Database work in this workflow is only for dependent
projections/references.

An official-card or set import includes publishing its reviewed card images to
R2 and verifying that the public image URLs work. The import request authorizes
that upload; do not ask for separate confirmation. Skip publication only when
the user explicitly requests a dry run, staging-only work, or no uploads. If
credentials or upload failures block publication, report the import as
incomplete rather than silently handing off a catalog with missing images.

## Before fetching

For a new playable set, add and review its `SwuSet` value in `types/enums.ts`
and complete metadata/rotation membership in `lib/swu-resources/set-info.ts`.
Check `types/Format.ts` and `lib/swu-resources/card-pool-info.ts`; update limited
support, latest-set UI defaults, logos, or statistics presets only when the new
set should actually affect them. Verify the upstream expansion ID and expected
card count rather than relying on a parser default.

Identity generation is sensitive to upstream metadata:
`lib/swu-resources/lib/processCard.ts` derives `cardId` from title/subtitle via
`transformToId.ts`; `variantFilename.ts` derives `variantId` from the card slug,
card number, and `fullSetName`; `processVariantWithoutImages.ts` uses
`setInfo.cardCount` to classify base printings/names; and `processCard.ts` moves
core `card.set` to the newest recognized printing by `setInfo.sortValue`.
Review title, number, full-set name, count, and sort changes as persisted-ID or
format-behavior changes.

If `lib/swu-resources/output/` exists, inspect it first. It is ignored,
persistent staging; the merger and image uploader consume every applicable file
there. Do not delete or mix another developer's staged output. Establish the
exact known set of staged card JSON and images before continuing.

## Ingestion sequence

1. Run `lib/swu-resources/raw-data-parser.ts` only with explicit `--key=value`
   arguments, including `--expansions=...`. Use `--skipExisting=false` when
   refreshing upstream corrections; its default `true` skips cards with an
   existing completed file under `output/cards` but retries cards that only
   have an intermediate `output/parsed` file from an interrupted or failed
   attempt. Numeric upstream expansion IDs are accepted even when they do not
   have a `setInfo` row. This is expected for auxiliary promo expansions, but
   inspect the resulting variant set code and ensure every generated card's
   core `card.set` resolves to a known playable set through one of its
   printings. A successful expansion-list response alone does not prove that
   identity mapping is safe.
2. Inspect `lib/swu-resources/output/parsed`,
   `lib/swu-resources/output/cards`, PNGs, WebPs, logs, counts, and
   representative cards. Check IDs, variants, printings, orientation, and
   missing images. Do not trust the process exit code.
3. For every changed existing card, inspect both old and staged `cardUid`
   shapes. The merger assumes arrays; a legacy scalar old value can be spread
   into individual characters. Normalize the targeted input or fix/validate
   the merger before continuing.
4. Official API list, printings, and variant-detail requests retry three times
   after the initial failure, waiting five seconds between attempts. Exhausted
   per-card failures are listed in red at the end, written to
   `output/logs/failed-cards.json`, and produce a non-zero exit status. A later
   success for the same logical `cardId` clears its earlier failure, which is
   relevant when several requested expansions contain that card. Treat any
   remaining report as an incomplete staging run; rerun with
   `--skipExisting=false` after addressing it.
5. Review the staged WebP set and run
   `bun lib/swu-resources/upload-images.ts` before merging, unless the user
   explicitly excluded publication. The uploader writes every file in
   `output/images/webp` to bucket `swu-images` under `cards/`, overwrites
   existing same-key objects, and has no dry run. Confirm that the directory
   contains only the reviewed images for this import. Use the configured
   `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` in the upload
   process without printing them or copying them into tracked files or a
   worktree's persistent environment. Confirm that the success count matches
   the reviewed file count and that no uploads failed. Verify representative
   new front/back images at `https://images.swubase.com/cards/<filename>` and
   in the app without local image interception.
6. Only after reviewing every staged card file and completing image publication
   (unless explicitly excluded), run
   `bun lib/swu-resources/card-merger.ts`. It rewrites the tracked
   `server/db/json/card-list.json`, merges all staged cards, unions old/new
   `cardUid` values, and deliberately restores old variants missing upstream.
7. Review the catalog delta by changed card and variant IDs rather than only a
   raw multi-megabyte JSON diff. Unexpected additions, retained stale variants,
   renames, or number changes need an explicit decision.
8. `bun lib/swu-resources/variant-checker.ts --set=ash` is read-only, but replace
   the example set and remember the script currently checks only the hard-coded
   `Hyperspace Foil` variant. It is a diagnostic, not complete validation.

Finish the import with image publication, local merge, semantic review, and
validation. Production deployment and database changes remain separate actions.

## Optional application/database rollout — explicit authorization required

1. Deploy/restart production only when requested so the static import and
   startup-time official version change.
2. After adding cards or changing default variants, run
   `bun server/crons/update-card-standard-variants.ts` only when an intended
   database update was requested. It upserts projections but does not remove
   obsolete rows.
3. The Admin Variant Checker reports current `collection_card` and
   `card_variant_price` references only; it is not proof that history, standard
   variants, user/browser overrides, or future reference tables are clean. An
   ID deletion/replacement requires a broader reference audit and explicit
   cleanup.
4. If an official card overlaps a preview, run
   `bun server/lib/cards/previewCardMigration.ts` report-only first. Use
   `--apply` only with separate authorization for the intended database.

## Critical hazards

- `processArguments()` accepts only `--key=value`. The advertised flag-only
  `--help` and `-h` are ignored, so running the parser with `--help` starts the
  hard-coded default expansion import. Never use that command for discovery.
- The parser default is currently expansion 108. Always pass the intended
  expansion explicitly.
- The merger and uploader exit non-zero on failure, but still inspect their
  output and counts. The variant checker can log important failures without
  reliably returning a failing exit code.
- The merger does not remove absent upstream cards and restores absent old
  variants. Deletion or replacement therefore needs explicit migration work.
- The official JSON is cast rather than runtime-validated. In particular,
  legacy scalar/missing `cardUid` values can violate the merger's array
  assumption; do not rely on TypeScript to catch catalog corruption.
- Image upload and the standard-variant cron are external mutations, not
  validation commands. A local PostgreSQL container does not isolate R2 or
  Sentry traffic.

Load `swubase-preview-cards` for preview reconciliation,
`swubase-karabast-integration` for UID mappings, and `swubase-cron-jobs` when
changing the default-variant job itself.

## Validation

Finish with `git diff --check`, inspect ignored/generated state as well as Git
status, and validate the exact changed catalog entries using the card-catalog
skill. Run the frontend build, preview payload tests, and Karabast resolver
tests when relevant. Smoke card search, deck input, collection set/number input,
card detail, and export for representative new cards. Never upload images or
run a production-connected cron merely to prove a code change builds.
