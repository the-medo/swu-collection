# Crossfire player and deck statistics

Finished Crossfire games feed the existing `public.game_result` table and the
account/team statistics pages. Players need only their SWUBASE account. No
separate account connection or database is required.

## Publication and recovery

Migration `0057_crossfire` includes `play.games.statistics_at` and a
partial index for unexported finalized games. Run the normal database migrations
before starting the updated services. The existing game-worker finalizer checks
pending games every 30 seconds, at most four per child process.

The finalizer first verifies and archives the completed game. It then reconstructs
that verified history for statistics. In one transaction it inserts one result
per surviving participant account, applies each account's existing team-deck
auto-add preference, refreshes earlier results in the same match, and writes the
export receipt. An export failure leaves the archive and a pending receipt for
retry. It cannot leave just one player's result. Racing finalizers serialize on
the match and sealed game; `(user_id, game_id)` also prevents duplicate results.
Existing finalized histories with the current executable are picked up as well.
Older incompatible development histories cannot be interpreted by the current
engine and remain retained for diagnosis.

The game worker retains its private journal/archive. Statistics contain summaries,
not checkpoints or complete game logs. The finalizer's database role therefore
needs access to `public.game_result`, `public.team_deck`, participant accounts,
team membership and deck metadata in addition to its existing `play` access.
The provided development/container setup already uses the shared database role.

## Result identity

- `gameSource` is `crossfire`.
- `gameId` is `crossfire:<game ID>`, unique per game.
- `matchId` is `crossfire:<root lobby ID>`, shared by both players and every game
  of one BO3; `gameNumber` records their order.
- `deckId` comes from the participant's frozen deck snapshot. Leader, base and
  source format also come from that snapshot, so later deck edits cannot rewrite
  the played matchup. The current deck name is captured on first publication.
- Sideboarding keeps the match/deck IDs and original leader/base. A rematch
  creates a new root match even with the same decks. Selecting another deck or
  starting another invitation creates a separate match.

The result includes initial initiative, mulligan choice, game winner/draw, final
round, start/end timestamps and a replay lobby reference. `createdAt` is the game
end time; incremental synchronization uses `updatedAt` in UTC. Deleted decks leave
results with a null deck link; deleting an account cascades its statistics rows,
without deleting the private game archive. Retrying an export does not overwrite
user notes, manual edits or exclusions.

`otherData.crossfire.match` stores explicit best-of, completion status, actual
score, outcome and completion reason. An unfinished BO3 is shown as in progress
and does not count as a match win/loss or lower match winrate. Its completed games
already contribute their own game/card statistics. A between-games forfeit
updates existing rows immediately; a live forfeit updates them when the terminal
game is exported. The opponent wins the match even if behind in the game score;
no artificial game results are added. Abandoned matches have no match outcome.

## Metrics

`cardMetrics` uses canonical card IDs and the shared fields `drawn`, `played`,
`activated`, `discarded`, and `resourced`. Initial deck cards have entries even
when never drawn, preserving the card table's inclusion denominator. Private
card identities/counts are stored only in the acting/owning account's result.
Opponent effects discarding a card count for that card's owner, not the effect
source. Public draw/resource count facts are not counted again alongside private
identity facts. `activated` records explicit action-ability use; attacks are
recorded separately in totals and round metrics.

`roundMetrics` contains action, attack, play, activation, draw, discard and
resource counts, plus resources spent on card plays. Setup uses round zero.
`otherData.crossfire.totals` contains the same counters for the whole game.
Payment/target selections and nested free plays belong to one root action, while
each played card has its own play count. Agreed undo excludes the abandoned
continuation. Cancelled payment facts stay in the replay log but are excluded
from statistics. Invalid commands, retries, chat and reconnects add no actions.

A resumed bookmark game has a new match identity and `resumed: true`. Only facts
and actions after its initial position are counted; its source game's earlier
metrics are not added a second time.

## Delivery and privacy

A committed export emits small PostgreSQL `game_results` notifications addressed
to an account or team scope. Each API process listens and invalidates its relevant
statistics WebSockets. The browser refetches through the authenticated result API,
updating both TanStack Query and the existing scoped Dexie cache. Reconnection
also refetches after possible notification gaps. Team reads require membership
and a deck shared specifically with that team. Notifications contain no card
metrics or game state; PostgreSQL notification loss cannot erase persisted rows.

Contributor sanitization still removes all `play` data. Statistics are subject
to the existing explicit match-sharing opt-in; retained rows have game/match IDs,
notes and `otherData` cleared. No cross-schema foreign key allows private game
storage to cascade into unrelated domains.

## Validation

- `bun test play/testing/statistics.test.ts` tests real engine histories, setup,
  nested plays, undo, cancellation, attacks, activations and forced discard.
- With the explicit local `CROSSFIRE_TEST_DATABASE_URL`, run
  `bun test play/integration/statistics.test.ts` for atomic results, retries,
  BO3/sideboarding/rematch identity, deck snapshots and forfeits.
- `bun test frontend/src/components/app/statistics/lib/summarizeMatch.test.ts`
  covers authoritative match grouping/outcomes and winrate denominators.
- `play/browser/statistics-smoke.ts` uses the running local worktree and two
  synthetic accounts without linked integrations. It verifies real finalizer
  processes, API/WebSocket updates, both perspectives, deck statistics, refresh,
  team scopes and anonymous denial. It deletes its fixtures and calls no external
  notification endpoint.
