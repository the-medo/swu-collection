# Crossfire matches and sideboarding

The invitation can propose a single game or best of three. Joining explicitly
accepts both that setting and the visibility policy. Best of three ends when a
player wins two games; draws do not add a win. Each game has a fresh authoritative
state, random shuffles, connection tickets, chat and independent replay history.

The first game's randomly selected player chooses initiative. In later games the
previous loser chooses; after a draw, the previous chooser chooses again. This
follows the official Comprehensive Event Guide §4.1, setup step 6:
https://cdn.starwarsunlimited.com//Star_Wars_Unlimited_Comprehensive_Event_Guide_a34d99b91d.pdf
The engine accepts an optional validated `initiativeChooser` at initialization;
the resulting ordinary initiative decision remains serializable and replayable.

Match coordination belongs to the main API, outside the engine/worker queue.
Migration `0057_crossfire` includes `best_of` in `play.lobbies` and three tables
in the existing PostgreSQL database:

- `play.matches`: the first lobby identifies the match, plus an optional accepted
  rematch lobby. One rematch is retained per finished match; further rematches can
  be requested from the new match.
- `play.match_games`: ordered lobby references and each game's initiative chooser.
  Scores are derived from durable game summaries, so re-reading a result cannot
  count a win twice. No engine checkpoint is duplicated here.
- `play.match_readiness`: private submitted deck snapshots and approving session
  references for each player, source game and next-game/rematch operation.

The match endpoint authenticates the current session and verifies membership
before returning any data. It returns only that player's frozen pool/deck;
other-player selections, deck IDs, session IDs and checkpoint data are omitted.
Submissions accept up to 120 main-deck rows within a 32 KiB streamed-body limit;
other admission requests retain their 8 KiB limit. The UI polls this bounded
metadata separately from the game WebSocket. It does
not warm or prolong replay caches. Spectators receive no match endpoint data.

Between games, the player may exchange cards within the original submitted pool.
The leader/base stay fixed; new cards, duplicate rows and unsupported active cards
are rejected. The main deck must contain at least its starting card count and at
most 120 cards, and satisfy the engine/base minimum. Thus the inactive pool cannot
grow beyond its submitted size. Limited decks use their frozen reserve, normal
decks their sideboard. Unsupported inactive cards can remain inactive.

These are explicitly practice matches using the existing unrestricted deck
admission. This change does not certify Premier legality, enforce rotation/copy
limits, introduce round clocks or permit Limited leader/base changes. It keeps
existing practice decks valid. The sideboarding UI describes the fixed pool and
minimum instead of presenting itself as a tournament validator.

Both players must submit ready before the next game starts. The API serializes
submissions on the match row, revalidates and locks both approving sessions, then
inserts the next game, lobby, participants and match link in one transaction.
The source must be finalized successfully. Restarting needs no in-memory match
coordinator. Identical retries return the already created destination; stale or
changed retries cannot alter it. Expired/revoked sessions stop counting as ready.
A player may withdraw readiness while the opponent has not completed the launch.

After the match, both players can agree to a same-deck rematch. This restores the
original first-game decks, preserves best-of/visibility settings and starts a new
match at 0–0. Source deck edits in SWUBASE cannot change an accepted rematch.

The live board automatically opens a result dialog when the game ends, including
when a player reloads a finished game. Single games offer mutual rematch consent;
best-of-three games show the score and private sideboard until a player reaches
two wins, then offer a new match at 0–0. Opening the dialog never submits readiness
or rematch consent. The player can dismiss it to inspect the board and reopen it
from the toolbar; polling does not reopen a dismissed result. A later game's
dialog starts independently. While a single game is active its rematch control is
hidden; an active best-of-three game retains a compact score control.

The tables follow the existing schema-wide contributor sanitizer and `play.*`
dump exclusion. Deleting a game/lobby cascades its coordination rows; ordinary
journal compaction preserves them. No additional container or database is needed.

Validation: `play/integration/matches.test.ts` covers scoring, initiative,
sideboard validation/disclosure, consent, session expiry, concurrent starts,
retries and durable reload. The shared continuation suite includes the explicit
initiative decision. Run `play/browser/matches-smoke.ts` with the explicit local
`CROSSFIRE_TEST_DATABASE_URL` and normal worktree env files for the real two-player
flow and the local `matches.html` screenshot gallery.
