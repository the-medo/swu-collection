import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const hothTrooper = {
  cardId: 'hoth-trooper',
  name: 'Hoth Trooper',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;
