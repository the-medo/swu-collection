import type { UnitDefinition } from '../definition.ts';

// Homeworlds rules insert. Beast is a 3/3 ground Creature token.
export const beast = {
  cardId: 'beast',
  name: 'Beast',
  kind: 'unit',
  aspects: [],
  traits: ['Creature'],
  cost: 0,
  power: 3,
  hp: 3,
  arena: 'ground',
  token: true,
} as const satisfies UnitDefinition;
