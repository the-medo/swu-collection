import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const groundAssaultAtAt = {
  cardId: 'ground-assault-at-at',
  name: 'Ground Assault AT-AT',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 6,
  power: 5,
  hp: 7,
  arena: 'ground',
} as const satisfies UnitDefinition;
