# ASH card coverage

Crossfire implements all **267 canonical identities with an ASH printing** in
the tracked official catalog. This adds 120 card definitions to the previous
147 supported ASH identities, bringing the complete registry to 879 definitions.
Reprints reuse their canonical implementation; each distinct card has its own
file. This is coverage within two-player core-practice, not multiplayer support
or a claim that every set is complete.

The registry and `play:coverage` output remain the implementation manifest.
`play/testing/ash-final.test.ts` checks that no ASH identity is missing. Printed
statistics and text are checked by `catalog.test.ts`; behavior is exercised in
`ash-foundations.test.ts`, `ash-effects.test.ts`, `ash-advanced.test.ts`,
`ash-phase.test.ts` and `ash-final.test.ts`. Their matching JSON fixtures pin the
official card-detail sources and available rulings. The rules baseline remains
the supplied SWU comprehensive rules v8.0.

## Shared mechanics

- Continuous abilities support attacker/defender conditions, per-host play
  discounts, attribute filters, and attack triggers granted to affected units.
  Red Leader opens the opposite arena; Sentinel still restricts the attacker's
  own arena. Support carries the borrowed ability's original source.
- Search effects can filter using current friendly traits or numeric costs,
  play a selected unit ready, and retain exact bindings for later effects.
  Exhausting a selected group commits all exhaustion together and counts only
  units actually exhausted.
- Phase history records actual unit/base damage, attacked bases, defeated
  upgrades, played upgrade hosts and the leader role of departing units.
  Damage prevention does not create damage history. Runtime leader status is
  captured before departure, including status granted by The Darksaber.
- `readyInPlay` captures a readying transition. Regroup readies all eligible
  cards before resolving readying triggers, so The Conflict Within can use
  the newly readied resources. Declining or being unable to pay an optional
  payment can enqueue its explicit `otherwise` effects.
- `choose-number` accepts a nonnegative safe whole number, including zero,
  through the validated command contract. The choice enters a public fact and
  a serializable numeric binding. Sense Through the Force chooses before its
  private search and compares the selected card's printed cost afterward.
  It can give the three Advantage tokens to either player's Force unit.
- `attack-with-unit.redirectExcess` grants an attack-scoped permission with the
  original event source. Wipe Them Out determines excess after the primary
  damage replacements, then offers a unit in the original defender's arena.
  This arena interpretation follows the excess damage's original recipient;
  the official card ruling explicitly permits choosing the base instead when
  the attacker has Overwhelm. Declining without Overwhelm leaves the full damage
  on the defender. A primary Shield prevents excess; the chosen destination
  resolves its own replacements before the same simultaneous damage event
  commits. Redirected damage remains combat damage from the exact attacker.

Pending number choices, searches, randomized remainders, readiness payments,
allocations and excess-damage/Shield choices are included in the shared
continuation corpus and fresh-process checkpoint recovery checks.

The current pins are engine `crossfire-0.100.0`, state `91`, cards
`crossfire-core-99`, and view protocol `33`. As elsewhere during unreleased
Crossfire development, archive only the newest committed executable.

## Contributor checks

Load `swubase-card-implementator`, `swubase-online-play`,
`swubase-validation` and `swubase-change-review` when changing these mechanics;
load the frontend and WebSocket skills when changing their browser contract.

```bash
bun run play:check
bun run play:coverage
bun run --cwd frontend build
# After committing the changed engine:
bun run play:archive
bun run play:archive:verify
```

The local browser gallery includes the number input, private search,
board-targeted excess damage and resulting combat. Its command and local-only
fixture safeguards are described in [the browser guide](frontend.md).
