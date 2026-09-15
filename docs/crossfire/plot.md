# Plot declarations and resource play

Plot follows the supplied v8 rules §§7.5.19 and 7.6.3a. The eight card definitions
and relevant catalog rulings are pinned in
[meta-plot.json](../../play/testing/fixtures/meta-plot.json).

After a leader deploys, `plot-reveal` captures the exact eligible resource cards.
The player privately selects every card they plan to play. Only those selected
cards are shown publicly; showing a hidden-zone trigger is a `shown` fact, not a
`revealed` fact for reveal-triggered abilities. Declaring no cards reveals nothing.
The checkpoint verifies the declaration against the eligible resources.

Selected Plot triggers join the existing deployment trigger batch. The player can
order those plays alongside the leader's own deployment abilities. Each play and
its nested triggers finish before the next older trigger resolves. A replacement
resource with Plot was not present when the leader deployed and cannot join that
batch. A shown play can still be declined or fail because it cannot be paid for.

`plot-play` uses the shared card-play path with explicit resource replacement.
Ready resources, including the chosen card itself, can pay the cost. Default
payment uses the Plot source first when it is ready. A separately authorized
`play` intent with `plotPayment: 'other-resources'` excludes that source. The
cost does not increase; replacing the still-ready source can leave one additional
resource exhausted. The alternative is offered only when it can be paid and
there is another ready resource. Credits and unit payments respect that exclusion,
and Exploit rechecks payment after its costs. Zero-resource plays and already
exhausted Plot sources have no redundant alternative. The chosen
card leaves the resource zone and the top deck card becomes an exhausted resource
before entry triggers and maintenance resolve. Empty decks provide no replacement
and do not cause draw damage. Units, events and upgrades retain their normal
roles and costs; Plot does not itself ready a unit or waive attachment eligibility.

The batch also adds leader-unit filtering for Naboo Royal Starship and temporary
abilities on created tokens for Chancellor Palpatine. His two new Spies gain
Sentinel for the phase; existing Spies do not receive that effect.

Eleven scenarios cover declaration privacy, exact source selection, ordering with
Support, replacement exclusion, payments, empty decks, ordinary hand play,
attachments, event damage and fresh-process recovery. The authenticated browser
fixture accepts `CROSSFIRE_BROWSER_SCENARIO=plot`; it resources cards each round,
waits for an available deployment, selects the Plot declaration through rendered
checkboxes, reloads that decision and plays an upgrade from resources.

## Browser flow

The Plot declaration remains a private resource selection. Its public `shown`
fact carries `mode: 'plot'` and contains only the declared card references. The
opponent receives a local image notice from that event; dismissing it sends no
command and never blocks the plotting player. The client tracks public event
ordinals to avoid repeated notices on resync/reconnect; initial snapshots do not
replay historical notices. Saved event references supply the artwork even if the
card has since left resources.

Each Plot play has a card image, prominent Play button, Skip, and an optional
“Pay with other resources” switch. The switch selects a server-supplied option.
Upgrade/Pilot plays then target their host on the board, retaining the chosen
payment mode. Cost and payment metadata are projected only to the deciding
player. Neither hidden resource identity nor deck order reaches the opponent.

The payment tests cover One in a Million’s 4/4 versus 3/3 target with five ready
resources, a four-cost play exhausting all five resources, Credits, unavailable
alternatives, source ordering, and fresh-process recovery.
