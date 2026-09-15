# Intro Battle: Hoth card coverage

All **51 canonical IBH identities** are implemented. This step adds the remaining
34 units and 10 events in individual files under `play/cards/ibh/`, bringing the
registry to 1,498 definitions. Existing supported cards from older sets are
preserved; this step adds no SOR, SHD, TWI or TS26 implementations.

The 44 official detail responses were checked on 2026-09-13. Their text,
uniqueness and rule clarifications are pinned with source URLs in
`play/testing/fixtures/ibh.json`. Han Solo's official erratum says “defending
unit”; his attack modifier therefore affects a unit defender and never a base.
The local catalog still has no rule text for that erratum, so the newer official
clarification is retained separately in the fixture.

Existing original engine primitives cover this group:

- Printed stats, Sentinel, Raid and Restore use shared combat calculations.
  Conditional abilities require a unit controlled by the acting player, not an
  opponent's matching aspect or a non-unit leader.
- Avenger damages all other units simultaneously in both arenas. I'll Cover For
  You selects two distinct enemy instances, or as many as exist, and applies one
  damage to each. It cannot concentrate both damage on a single unit.
- I've Found Them publicly reveals up to three top cards, requires a revealed
  unit to be drawn when one exists, then discards the remaining revealed cards.
  It uses a real draw for draw triggers/history and never exposes the next
  unrevealed card. No eligible unit/short-deck cases still finish the discard.
- Ozzel's opponent and I Want Proof's owner each choose their own hand discard.
  Hidden choices remain available only to their owner.
- Rieekan and Hoth Lieutenant grant an attack to another ready friendly unit,
  with the printed aspect condition where applicable and a bonus that expires
  after that attack. Optional abilities can be declined.
- You Have Failed Me continues to its ready target only when the friendly unit
  was actually defeated. Remaining HP, cost, power, arena and aspect filters are
  evaluated against current state and the exact selected card instances.

`ibh.test.ts` checks observable play/combat outcomes, targeting exclusions,
optional and empty branches, loss of abilities, hidden projections, public
reveals and duplicate physical targets. Seven new continuation fixtures exercise
revealed-card choice, opponent discard, successful sacrifice, optional/granted
attacks, a physical Shield choice and simultaneous targets. They are tested in
fresh processes and included in the 358-case shared recovery workload.

Current pins: engine `crossfire-0.125.0`, state `107`, cards `crossfire-core-123`,
view protocol `36`. No additional engine vocabulary or state schema was needed.
Only the newest committed executable is retained during prerelease development.
The browser gallery includes IBH reveal, two-target and post-sacrifice positions;
its index also preserves links to the history/chat and match galleries.
