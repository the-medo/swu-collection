import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const trenchDefender = {
  cardId: 'trench-defender',
  name: 'Trench Defender',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
