import type { UnitDefinition } from '../definition.ts';

export const swoopRacer = {
  cardId: 'swoop-racer',
  traits: ['Fringe'],
  name: 'Swoop Racer',
  kind: 'unit',
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  aspects: ['Cunning'],
} as const satisfies UnitDefinition;
