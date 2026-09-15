import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const deathSquadronStarDestroyer = {
  cardId: 'death-squadron-star-destroyer',
  name: 'Death Squadron Star Destroyer',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Capital Ship'],
  cost: 7,
  power: 5,
  hp: 6,
  arena: 'space',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
