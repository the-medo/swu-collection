import type { UnitDefinition } from '../definition.ts';

export const outerRimConstable = {
  cardId: 'outer-rim-constable',
  traits: ['Fringe', 'Official'],
  name: 'Outer Rim Constable',
  kind: 'unit',
  aspects: ['Aggression'],
  cost: 2,
  power: 3,
  hp: 1,
  arena: 'ground',
  triggers: [
    { id: 'when-played', timing: 'played', effects: [{ kind: 'defeat-upgrade', optional: true }] },
  ],
} as const satisfies UnitDefinition;
