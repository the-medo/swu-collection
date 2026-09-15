import type { UnitDefinition } from '../definition.ts';

// ASH 049. Printed text is pinned in meta-board fixture.
export const shinHatiGoingSomewhere = {
  cardId: 'shin-hati--going-somewhere-',
  name: 'Shin Hati, Going Somewhere?',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Force'],
  unique: true,
  cost: 5,
  power: 6,
  hp: 6,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-most',
        amount: 0,
        filter: {
          controller: 'friendly',
          arena: 'ground',
          nonLeader: true,
          otherThan: 'source',
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
