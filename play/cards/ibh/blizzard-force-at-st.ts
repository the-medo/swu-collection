import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const blizzardForceAtSt = {
  cardId: 'blizzard-force-at-st',
  name: 'Blizzard Force AT-ST',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
} as const satisfies UnitDefinition;
