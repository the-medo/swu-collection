# Dynamic card releases and compatible replays

Approved scope: immutable JSON card releases, durable installed copies in PostgreSQL,
R2 publication, explicit admin activation, and backwards-compatible minor engine
updates. New matches use the active release; each existing BO3 match, replay, undo,
recovery and statistics calculation retains its original card and behavior pins.

Implementation skills: swubase-online-play, swubase-architecture,
swubase-database-migrations, swubase-backend-endpoints, swubase-card-catalog,
swubase-frontend-api, swubase-frontend-components, swubase-frontend-routing,
swubase-worktree-dev, swubase-documentation, swubase-change-review and
swubase-validation. Update swubase-card-implementator and swubase-online-play
when the release commands and operator workflow are verified.

1. Introduce explicit immutable per-game catalogs and release 1.0.0. Preserve
   pre-refactor replay fixtures and exact historical state/fact verification.
   Export validated data only, with a strict contract retained per minor line.
2. Install bundles in play.card_bundles; select the active version through
   application_configuration. Read the durable selection for new matches and
   load pinned catalogs for recovery and replay. Notify other processes after
   activation commits; correctness must not depend on notification delivery.
3. Add reproducible local export and immutable R2 publication. Add an admin
   release screen to inspect differences, download/activate compatible releases,
   and reactivate installed releases. Protect against concurrent activation and
   version reuse with different content.
4. Verify real database admission, BO3, recovery in fresh processes, old replay
   fixtures, failure cases and admin authorization/UI. Document container/local
   operations and update card-authoring skills. Commit each coherent step.

Compatibility: a newer runtime in the same major may execute an older minor's
recordings, with the original catalog and behavior version. New mechanics must
not change old behavior; changes to state representation require compatible
codecs. Never rewrite recorded hashes or disable integrity checks to make a
replay pass. Engine fixes that affect history require a version-selected
compatibility path or an explicitly incompatible major release.

## Delivery

Implemented on 2026-09-15. Runtime and initial card release are 1.0.0.
The card-bundle schema is applied to the isolated local worktree and now belongs
to the consolidated `0057_crossfire` migration. The release admin UI is
at `/admin?page=crossfire-cards`; the operator and authoring guide is
[card releases](../../../docs/crossfire/card-releases.md).

Verification covers frozen historical transitions and undo hashes, isolated
catalogs, strict downloaded definitions, concurrent publication/activation,
remote-download installation through the admin service, waiting invitations,
BO3/rematch pins, fresh-process database recovery, sanitizer cleanup, real admin
and non-admin browser access, responsive UI, Crossfire typechecking and the
frontend build. The current committed executable archive passes complete-game
replay and fresh-process recovery of every continuation fixture. The existing
conformance cases were exercised as well.

Real R2 publication still requires configuring the release bucket and credentials;
publication/download have been tested with controlled object storage. No Coolify
deployment or live R2 upload was performed. Claude Code review could not complete;
local review caught and corrected catalog-growth invalidation and inconsistent
version pins within a game/match.
