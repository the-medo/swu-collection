import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const rampagingWampa = {
  cardId: 'rampaging-wampa',
  name: 'Rampaging Wampa',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 5,
  power: 6,
  hp: 3,
  arena: 'ground',
} as const satisfies UnitDefinition;
