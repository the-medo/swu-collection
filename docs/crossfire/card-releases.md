# Card releases and replay compatibility

Crossfire loads immutable JSON card catalogs independently of its executable.
The initial runtime and card release are both 1.0.0. Individual implementations
remain TypeScript files under `play/cards/<set>/`; publishing exports their
resulting data, never executable source. All 1,498 initial definitions are covered
by the strict data contract. SWUBASE's official catalog still owns official
identities, images and deck metadata; importing a new set follows the existing
catalog workflow. Card releases update the gameplay implementations.

## Versions and historical behavior

`play/engine/release.ts` identifies runtime behavior; `play/package.json` follows
that runtime version. `play/cards/release.json` contains the independently
published card `version` and `requiredEngine`.

- A card addition or definition fix using existing mechanics increments the card
  patch, for example `version: 1.0.1`, `requiredEngine: 1.0.0`. No redeploy is needed.
- New compatible engine capabilities increment the runtime minor, for example
  1.1.0. Card releases using those features require that minor and a redeployed
  compatible API and game worker.
- An engine bug fix requires a new runtime build/deployment even without new
  mechanics. Preserve old behavior for historical games using their recorded
  engine version; a runtime patch may identify this fix independently of cards.
- A breaking change increments the runtime major. Supporting older majors needs
  an explicit compatibility implementation or separate retained replay runtime.

A newer engine can read older minor releases in the same major. It cannot load
cards needing a newer minor. This is a compatibility obligation, not permission
to suppress verification failures. State format 109 currently remains supported;
future changes to state/commands require compatible codecs or adapters.

Every invitation freezes its engine and card pin. Joining an invitation and later
BO3 games retain those versions. New invitations and new rematches select the
active bundle. Replay, undo, recovery, saved-position practice and statistics use
the original data. Card corrections do not rewrite previous games.

`state.versions.cards` contains `version@sha256`. The engine and projector pass
that context explicitly through card lookups; there is no mutable global current
catalog. Catalog data is frozen and shared in process memory, so it is not read
from PostgreSQL for each action. A cold process loads the required bundle before
recovering a state. The previous development tuple (engine crossfire-0.129.0,
cards crossfire-core-125) has an explicit alias to the exact 1.0.0 catalog checksum.
Earlier experimental engines remain unsupported.

## Storage and activation

Migration `0057_crossfire` creates `play.card_bundles`: version, checksum, required engine,
R2 key, full catalog JSONB, source commit and installation time. These are complete
releases rather than individual mutable card rows. They contain public card data,
not players' game states.

`application_configuration.crossfire_card_bundle_version` selects the active
release. Startup installs the compiled catalog if needed and initializes a missing
selection. It never replaces an existing active release on restart. Published
versions cannot acquire different contents. There is no bundle deletion UI;
retain historical bundles referenced by games, invitations and replays.

The administrator uses `/admin?page=crossfire-cards`. The API endpoints are:

- `GET /api/admin/crossfire-cards`: installed and published release metadata.
- `POST /api/admin/crossfire-cards/preview`: validate a selected release and compare
  its added, changed and removed cards against the current release.
- `POST /api/admin/crossfire-cards/activate`: activate the reviewed version and
  checksum, with the expected previous active version to detect concurrent edits.

All three require server-side admin permission. The API downloads only fixed keys
from configured storage, checks metadata/checksum and the complete card contract,
and commits installation plus the active pointer together. Failure leaves the
active pointer unchanged. Reactivating an installed compatible release does not
require R2.

PostgreSQL delivers `crossfire_card_bundles` notifications after commit. API/game
workers preload the indicated catalog; new admission also reads the durable active
pointer, and recovery loads the exact requested pin. Correctness does not depend
on receiving a notification. The replay worker and statistics finalizer read from
the same database and need no R2 credentials. Deploy API and game workers with
compatible runtime capabilities before activating bundles that require new ones.

## Authoring and publication

For card-only changes:

1. Update the card's implementation and meaningful rule/conformance tests.
2. Increment `play/cards/release.json.version`'s patch. Keep `requiredEngine`
   unchanged when the card uses the same capabilities.
3. Run `bun run play:check`, including fixed historical replay fixtures. Commit.
4. Run `bun run play:cards:export` to inspect the complete local JSON artifact.
5. With release storage configured, run `bun run play:cards:publish`.
6. Review/activate the release in the admin screen. Uploading does not activate it.

The publisher requires committed sources, checks the generated data contract, and
records the commit and runtime-source fingerprint. Reusing a runtime version with
changed runtime sources is rejected against published metadata. This conservative
check cannot substitute for rule tests or determining whether a change is breaking.

R2 objects live under `crossfire/card-bundles/`: immutable compressed catalogs by
version/checksum, immutable release metadata, and a conditionally updated discovery
index. Publication writes the discovery index last and retries concurrent index
updates without discarding another release.

Environment for the publishing process and API download service:

```dotenv
CROSSFIRE_CARD_BUNDLE_BUCKET=<chosen-bucket>
R2_ENDPOINT=<S3 endpoint>
R2_ACCESS_KEY_ID=<access key>
R2_SECRET_ACCESS_KEY=<secret>
```

The publisher needs read/write access to this prefix. The API only needs read
access. Do not put credentials in Git, downloaded artifacts or application
configuration. In Coolify, supply these through the API service environment;
workers only need the existing PostgreSQL connection. R2 is not required to restart
with installed releases or replay games.

Local development can use `.env` plus the generated `.env.worktree`:

```bash
bun run play:cards:export
bun run play:cards:install .swubase/crossfire-releases/1.0.0.json
```

The install command refuses non-local/non-worktree database targets and uses the
same validation/activation transaction. It does not upload anything. Sanitized
contributor dumps remove installed bundles and their active pointer; a destination
seeds its own compiled catalog.

## Compatibility checks for engine contributors

Card data contracts are retained in `play/cards/contracts/<major>.<minor>.json`.
The current one is generated from `definition.ts` by
`bun run play:cards:schema`. A new minor adds its contract to the validator's
contract map; retain older contracts. A card claiming to require an older minor
must validate against that older contract, even on a newer engine.

`play/testing/fixtures/replay-compatibility/` contains recordings captured before
this refactor and at release 1.0.0. Do not regenerate expected historical hashes
with a changed engine. The fixtures verify each recorded transition, facts and an
undo journal; add representative recordings when a new mechanic is released.
Existing recorded random values, decision IDs, trigger order and behavior versions
must reproduce exactly. Add version-selected behavior paths for fixes that would
otherwise change history.

Validation includes `card-catalog.test.ts`, `card-releases.test.ts`, the existing
conformance suite, and the opt-in `play/integration/card-bundles.test.ts`. The
integration test activates a temporary release, verifies invitation/BO3/rematch
pinning, and reconstructs games in fresh processes. The browser smoke at
`play/browser/card-releases-smoke.ts` checks real admin/member/anonymous access,
preview, activation and narrow layout against the selected local worktree.
