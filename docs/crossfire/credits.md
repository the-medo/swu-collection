# Credit tokens and payments

The supplied v8 rules §3.7.13 place Credit tokens in the resource zone without
making them resources. Their printed ability optionally defeats a Credit while
paying resources to pay one less. This applies to card plays and ability costs.

`players.tokens` contains public player tokens in their declared zones: The
Force in the base zone and Credits in the resource zone. `players.resources`
contains only real resources. Credits do not count toward deployment thresholds,
resource-count conditions or ready-resource totals. Checkpoints reject Credits
inserted into the resource list. Credits are face up to every viewer; adjacent
face-down resources remain private. Defeated Credits leave play rather than
entering discard. The Force's singleton rule remains independent.

When a chosen action has a positive resource payment and the player has Credits,
`credit-payment` suspends before paying any cost. It retains the exact action or
effect frame, original intent and required amount. The player selects a bounded
subset of their Credits. Its minimum is the payment shortfall after ready
resources; its maximum is the smaller of available Credits and the payment.
Zero is legal when resources alone cover the amount. A card committed for play
is publicly revealed at this payment stage; unrelated hand identities remain
private. No combinations of token subsets are enumerated as individual actions.

Acceptance validates exact current token handles, defeats the selected tokens,
then resumes that payment with the reduction. Other costs, including Force and
exhaustion, still apply atomically. The choice does not end the action or consume
a subsequent card's discount. Nested play keeps its existing continuation,
including Sneak Attack's delayed defeat, searched-card handling and Plot resource
replacement. Free plays require no resource payment and keep Credits. Recovery
recomputes the original cost and legal intent before accepting a checkpoint.

Dedicated implementations cover Credit, Arvel Skeen, Taramyn Barcona and Defiant
Scrapper. Champion's KT9 Podracer supplies a simple creation ability and the
browser acceptance deck. Arvel and Taramyn can defeat either player's Credit;
Scrapper permits only an enemy Credit. Effects follow only after that exact
token is defeated. These definitions and source text are pinned in
[the fixture](../../play/testing/fixtures/meta-credits.json).

[Credit scenarios](../../play/testing/meta-credits.test.ts) verify optional and
required spending, compound costs, exact tokens, public/private projections,
creation, card outcomes and fresh-process recovery. The authenticated `credits`
browser scenario reloads a payment and spends through rendered controls while
completing a game. The [winner-game gate](../../play/testing/meta-winner-games.test.ts)
uses complete pinned winner lists whose mainboards, leaders, bases and sideboards
all have registered implementations. It cycles those main decks against one
another (mirroring the first until another is supported), checks every pending
checkpoint, and replays the result. Its decision policy is a progression smoke
test, not card conformance or competitive deck-validation evidence.

## Ability loss and control

Credit payment checks the token's effective payment ability. Conveyex Security
Captain removes that ability from enemy Credits without removing the tokens or
changing resource counts. Lieutenant Gorn transfers an exact Credit into its
new controller's public token list; ownership remains with the creator. Spending
or defeating it later removes it from the controller's list and returns control
to its owner out of play. Checkpoints validate this resource-zone token exception
separately from ordinary resources.

Compound card payments first retain the selected cards in an `ability-payment`
continuation, then offer Credits for their resource component. The payer's
selected sacrifice cannot also be selected as a Credit payment. Checkpoints
validate both the retained card selection and the outstanding Credit choice.
Nested card plays retain the number of Credits actually spent, allowing Jabba's
unit action to grant Ambush only for that play.
