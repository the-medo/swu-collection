import type { UnitDefinition } from '../definition.ts';

export const skyhopperCanyonRunner = {
  cardId: 'skyhopper-canyon-runner',
  name: 'Skyhopper Canyon Runner',
  kind: 'unit',
  traits: ['Fringe', 'Vehicle', 'Speeder'],
  aspects: ['Cunning'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
} as const satisfies UnitDefinition;
