# Modified play, costs and searched cards

The batch text and catalog rulings are pinned in
[meta-play-costs.json](../../play/testing/fixtures/meta-play-costs.json).
Neel uses the official printed-power erratum in that fixture. Search handling
follows the supplied v8 rules §§8.26.7–8: a chosen card remains in the deck zone,
but is no longer part of the deck until another instruction moves it. An
unplayable chosen card returns to the bottom.

## One play path

Normal hand play and `play-card` effects share payment, entry, event resolution,
attachment, trigger collection and maintenance. Effects specify an allowed zone,
optional exact-copy binding, card filter, discount or free play. Unit-only plays
exclude alternate Piloting. Mandatory modified actions involving hidden hand
information still allow the rules' failure option. A bound discard play requires
the card in that player's discard pile; ownership is not transferred implicitly.

Continuations distinguish effects immediately following a play from the subsequent
trigger window. Salvage deals its damage before the played unit's Shielded trigger
resolves. Old Daka defeats the chosen Night, then offers a free play of that same
physical card from the controller's discard pile, creating a new incarnation.

## Searches

The existing private search randomizes the unchosen remainder. A search with
`play` then shows its chosen card publicly and records it in `searching`, separate
from the owner's ordered deck. The play decision exposes that selected card to
its chooser; it never exposes the unchosen search cards to another viewer.
A cleanup frame returns an unplayable card to the bottom. Checkpoint validation
requires every pending searched card to have the corresponding continuation.
This version supports one chosen card for search-and-play; multi-card searches
with combined cost budgets require further work.

## Reductions and entry changes

Printed `playReductions` are evaluated from current in-play abilities. Round play
history records controller, runtime unit play and whether the played unit had a
When Defeated ability, so Krennic cannot reset eligibility by entering late or
changing copies. Piett's leader action and unit reduction occupy separate faces.
Mastery's discount is evaluated for each proposed attachment host.

`next-play` saves a phase-scoped modifier with its source and card filter. Matching
modifiers stack and are consumed together by the next matching play, even if it
is free. Unmatched plays and Piloting do not consume unit-only modifiers. The
effect survives source departure and expires at the phase boundary. Neel checks
printed power and changes readiness on entry, without a later ready effect.

## Base setup

Colossus draws five cards in both the opening hand and mulligan; normal regroup
draws remain two. Data Vault raises the selected format's minimum by ten in both
engine setup and SWUBASE admission. The current practice minimum therefore becomes
sixteen. This does not introduce competitive-format legality or sideboarding.

## Validation

Fifteen outcome scenarios cover all eleven definitions, stacked and expired
modifiers, Pilot exclusions, prior round plays, exact-copy discard replay,
search failure, hidden-information comparisons and fresh-process continuation.
Catalog conformance pins Neel's erratum. Frontend build, connection tests and
focused lint cover the existing choice interface; play labels now recognize
selected search cards as well as cards displayed in ordinary zones.

## Nabat Village setup

Nabat Village uses explicit starting-hand and mulligan properties: draw nine
starting cards, and offer only Keep Hand to its controller. Its opponent retains
the normal starting hand and mulligan. The first action-phase trigger occurs
after both players have resourced two cards and before either takes an action.
It chooses three distinct hand cards, then orders those cards for the deck bottom.
The base has 27 HP and a Cunning aspect. The round condition prevents later
start-of-action-phase triggers from repeating this setup effect.

`bottom-hand` starts the existing private ordering flow in its `hand-bottom`
mode. The exact selected cards remain in hand until the entire order is fixed;
they then move to the bottom together, with the first chosen card above the next.
The server validates hand ownership, exact references, uniqueness and order.
Neither the selection nor its order is projected to the opponent or spectator.
Deck entry changes visibility counters, preventing old hand handles from following
cards into the hidden deck. A public fact reports only the base source and count.

The opt-in browser preset covers the nine-card hand, mandatory three-card choice,
reload during selection and ordering, spectator visibility and a complete game:

```bash
CROSSFIRE_TEST_DATABASE_URL=<running-worktree-url> CROSSFIRE_BROWSER_SCENARIO=nabat bun run play:browser:test
```
