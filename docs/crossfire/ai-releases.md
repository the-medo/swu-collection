# Crossfire AI releases and human-game learning

The production control page is **Administration → Crossfire AI** (`/admin?page=crossfire-ai`).
It lists installed immutable leader releases and releases from private R2, their
evaluations and activation history. Admins can also upload a packaged `release.json`
and its matching `model.pt` directly. Imports validate and load both before storing
them; they do not activate a model. If private R2 is configured, an import publishes
the immutable objects there as well. Without R2, installed bytes remain in PostgreSQL. Reviewing a release verifies its SHA-256, model contract and qualified
decks, then loads it into the private inference service. Activation uses a
compare-and-swap transaction: a stale admin page cannot overwrite another activation.
Rollback is another reviewed activation of a retained release.

Each leader and exact engine/card/rules/state/format target has its own active
selection. Releasing Krennic does not move Vader's selection. Initially, a leader
release references a complete specialist checkpoint; its shared encoder, strategy
experts, matchup adapter and action scorer are frozen with that release. Shared
weights are not updated underneath other leaders. R2 deduplicates identical model
bytes by their content hash. PostgreSQL retains installed model bytes and manifests
so an R2 outage does not prevent loading an installed release.

`CrossfireAiReleases.pin()` returns an immutable model reference for admission.
`choose()` uses that reference, validates the deck route and reloads the same
release if the inference process restarted or evicted it. Human-vs-AI admission
persists that pin in `play.ai_games`, including the exact deck route and game target.
The release contains the evaluated immutable deck snapshot: later deck edits and
model activations do not change an existing game. Older releases without deck
snapshots remain in the registry but do not appear as playable opponents.

## Playing a released model

In **Crossfire**, select your deck, choose **Play trained AI**, select the opposing
deck and press **Play against AI**. Only active releases qualified for the current
engine/card target appear. AI games are private, single games with the human in p1
and a server-owned p2 participant (no synthetic user account). Each user can keep
up to three AI games running. Repeated admission requests reuse their request ID.

The game worker chooses actions with the released model through the training
encoder and legal action builder, using only p2's private player projection.
Each completed choice is revalidated and committed through the durable game host.
Inference happens outside the per-game command queue. At most four bot games infer
at once; a disconnect pauses the bot and reconnect resumes from the saved game.
Inference failures retry with a visible status. The game keeps its original release
after worker/inference restarts. Human-opponent undo and rematch approvals are not
available for bot games; start another game from Crossfire.

History labels AI opponents and can filter **People / AI opponents / All games**.
The statistics writer excludes games marked `play.games.mode = 'ai'` before any
account, deck or team result publication, including manual retries. AI games cannot
enter the two-human opt-in training export workflow.

The finalizer keeps each account's latest **five completed AI replays** by default.
Older summaries/results and model provenance stay in history with “Replay expired”.
Expiry removes journal/checkpoint/archive payloads and bookmarks and denies both new
and previously issued replay tickets. This quota does not affect human replays.
Set `CROSSFIRE_AI_REPLAY_LIMIT` consistently on the API and worker to a nonnegative
integer or `all`. `play.ai_replay_limits` supports an operator-managed per-user
override: a nonnegative integer is that account's allowance, SQL NULL is unlimited,
and no row uses the environment default. Reduced limits apply during finalization
and periodic cleanup; increasing a limit cannot restore already expired replays.

## Runtime configuration

Apply the normal Drizzle migrations through 0062. Configure these explicitly:

- For R2 release publication and human-data export, API and game worker: `CROSSFIRE_AI_BUCKET`, `R2_ENDPOINT`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. The bucket must be private.
  There is no fallback to the card-release or public-images bucket.
- API and game worker: `CROSSFIRE_AI_INFERENCE_URL` and `CROSSFIRE_AI_INFERENCE_TOKEN`
  (at least 32 characters). The inference URL is a private service address.
- Inference service: the same token. Run `bun run play:ai:serve --cpus 3`, or
  adapt `play/ai/compose.inference.yml` to the deployment's private network.
  It exposes no host port, runs as an unprivileged user and never trains models.
- Training server: read access to the private bucket for imports; publication
  additionally requires write access to `crossfire/ai/models` and `releases`.
  Supply the environment explicitly; Python commands do not load `.env` files.

The inference container uses the same pinned CPU requirements as the trainer.
Its cache holds at most 16 releases. Up to four HTTP requests can run concurrently,
with at most one cold model load; resident loads and ordinary choices continue
during a cold load. Cold loads wait at most 20 seconds for the loader, and the
HTTP client retries a busy response once. Inputs, model sizes, tensor archive expansion,
response sizes, HTTP waits and simulator concurrency are bounded. It uses greedy
frozen inference, never an optimizer. Configure API/worker/inference separately;
activating subsequent model releases does not require an application deployment.

## Train one leader without changing the source run

The following commands are examples, not a request to start continuous training:

```bash
bun run play:ai:fork \
  --run .swubase/crossfire-ai/specialists-run-01 \
  --output .swubase/crossfire-ai/specialists-11111111-1111-4111-8111-111111111111 --label "Krennic release training"

bun run play:ai:specialists:train --resume \
  --output .swubase/crossfire-ai/specialists-11111111-1111-4111-8111-111111111111 \
  --leader krennic --cpus 9 --workers 9
```

Fork only a stopped/ready run. Omit `--output` to generate a fresh run ID automatically.
Forks appear in the training dashboard’s run selector without replacing the active add-deck run. Use its original seed when resuming (the default
is `20260921`). Select the leader at a batch boundary. The focused schedule plays
each of that leader's lists against every roster list, including mirrors, in
1,000-completed-game blocks with balanced seats. Only the chosen leader's turns
generate learning rows; its opponents rotate between frozen recent snapshots and the historical anchor. Training changes
the copied shared dependencies as needed, leaving the source run intact.
Resume keeps the same leader scope. Stop with SIGINT/SIGTERM to publish the last
completed update and a recoverable checkpoint.

Training remains uncapped by default. The existing resource guard applies to
forks, training, release packaging and dataset imports: at most nine logical CPUs,
100,000,000,000 allocated artifact bytes including the environment and earlier
runs, reserved space before each write, and independent five-minute disk checks
during training/import. Importing or forking cannot run alongside another process
holding that artifact budget lock.

## Evaluate, package and publish

```bash
bun run play:ai:release \
  --run .swubase/crossfire-ai/specialists-11111111-1111-4111-8111-111111111111 \
  --output .swubase/crossfire-ai/releases/krennic-01 \
  --leader krennic --label 'Krennic 01' --cpus 9 --workers 9

# Explicit R2 write; does not activate the release.
bun run play:ai:release:publish .swubase/crossfire-ai/releases/krennic-01
```

Packaging evaluates the actual frozen weights against the run's frozen anchor,
with paired seats and recorded seeds. Every result is replay verified. The default
is ten seed pairs per opponent and list. Activation requires trained weights,
at least 40 completed evaluation games per advertised list, no cutoffs and a
matching model hash/interface. These are minimum compatibility/evidence gates,
not a claim of tournament strength: inspect matchup results before activation.
The manifest records both evaluated model and opponent hashes plus immutable
snapshots of its advertised decks. Stop a training run with SIGTERM/SIGINT before
packaging because packaging owns the same artifact-budget lock, then resume it.
For continuous eight-deck runs, add `--deck krennic`: this selects that deck's own
published specialist checkpoint and initial reference, not whichever learner was
active most recently. `--deck` defaults to the leader key on rotation runs. Each
leader can be packaged and activated independently. Upload the two resulting files
in the admin page if the training server has no R2 write credentials.

To certify multiple targets, pass `--targets targets.json` containing an array
of `{ "versions": { "state": 109, "engine": "…", "cards": "version@sha256",
"rules": "swu-8.0", "format": "core-practice" }, "catalog": "optional/local/catalog.json" }`.
Each target must be supported by this runtime, have its exact card bundle installed
in the evaluator and meet that bundle's minimum engine version. It is simulated
and replay checked separately. The encoding, action adapter and specialist routing
must match the frozen model interface. Different feature dimensions or action
semantics require an explicit adapter migration/retraining, not an edited version
number. Naming choices use the target's own public title catalog.

Open the admin page, review the published release and activate it. Installed
history remains available for rollback. A hash conflict, incompatible target,
failed load or stale active-selection check leaves the current selection intact.

## Human games: consent → private export → supervised learning

In **Crossfire → Your games → AI training**, each human independently permits
that game. Default is off. Both must agree under policy version 1; replay/spectator
disclosure does not grant training permission. Only finalized games are exported.
Participants can withdraw permission; previously withdrawn exports remain excluded.
Withdrawal stops future use after the exporter/importer refreshes it, and cannot
undo learning already incorporated into weights.

The game worker runs a separate bounded export process when the AI bucket is
configured. It verifies the authoritative history, then exports each player's own
deck, projected observations and choices, and the terminal result. It excludes
account/session/deck-source identities, chat, the real game ID, hidden opponent
state and random tapes. Fresh export IDs and private projection handles separate
the data from live API identifiers. Frames retain only newly visible events.
Original replay and branch data remain private to the game service.

Dataset indices use 256 conditional-write shards. Model/data objects are immutable;
index updates occur after data upload. Export receipts are persisted before upload,
so retries or deletion can find partial publications. R2 I/O holds no consent transaction;
withdrawal remains responsive during a slow upload. Consent is checked again after publication,
and withdrawal wins if it changed during that request. Withdrawal, account/source
deletion and 90-day expiry publish a tombstone before deleting the object. Index
tombstones remain so stale cached data cannot be reused. The worker checks at
most four jobs per invocation, prioritizing withdrawal, pending exports and retryable
failures before routine rechecks. Revoke/expiry cleanup is asynchronous; its sweep
latency grows with the corpus size. Explicit withdrawal immediately marks the job
revoked for priority cleanup, and importers independently enforce the expiry time.
History quarantine and storage failures remain distinguishable in the admin totals
and never delay game results. Transient database errors remain retryable. Automatic export
attempts are bounded; failed jobs require inspection before an operator resets them.

Current export intentionally quarantines undo histories. The importer preflights
all commands and skips games with unsupported versions, no matching registered
deck, or choices the current action adapter cannot represent. A matching own list
can be learned even when the opponent list is not registered. These exclusions
are reported; raw game results alone are insufficient for action learning.

```bash
# Refresh private cached games without starting training.
bun run play:ai:data:sync --output .swubase/crossfire-ai/human-games --cpus 9

# On an independently forked run: refresh consent, learn, then resume self-play.
bun run play:ai:specialists:train --resume \
  --output .swubase/crossfire-ai/specialists-11111111-1111-4111-8111-111111111111 --leader krennic \
  --human-data .swubase/crossfire-ai/human-games --cpus 9 --workers 9
```

The importer verifies compressed size/hash and decompression bounds, deduplicates
export IDs and removes revoked/expired cached files. Consent is refreshed before
each game is consumed. Whole match groups, including both seats, split deterministically
90/10 into training/validation. Supervised action likelihood and terminal values
are used for human examples; no fake PPO action probabilities are invented.
Checksummed provenance prevents silently consuming the same training game again
after resume. Validation games never enter the optimizer. `human-learning.json`
records counts, skipped games and validation action agreement; self-play then
continues. Production changes only after a separate evaluation and admin activation.

All new tables live in private `play.*`; the existing sanitized-development dump
exclusion covers them. Do not make the AI bucket public or place private datasets
in contributor dumps, browser responses or committed files.
