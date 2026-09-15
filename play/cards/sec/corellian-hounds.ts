import type { UnitDefinition } from '../definition.ts';

// SEC . Printed text is pinned in the meta effects fixture.
export const corellianHounds = {
  cardId: 'corellian-hounds',
  name: 'Corellian Hounds',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Creature'],
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'ground',
  entersReady: {
    kind: 'units-at-most',
    amount: 0,
    filter: {
      controller: 'enemy',
      arena: 'ground',
    },
  },
} as const satisfies UnitDefinition;
