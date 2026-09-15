import type { UnitDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const surfaceAssaultBomber = {
  cardId: 'surface-assault-bomber',
  name: 'Surface Assault Bomber',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  raid: 1,
} as const satisfies UnitDefinition;
