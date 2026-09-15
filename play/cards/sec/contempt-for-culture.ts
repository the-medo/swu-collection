import type { EventDefinition } from '../definition.ts';

// SEC 246. Printed text is pinned in the meta token fixture.
export const contemptForCulture = {
  cardId: 'contempt-for-culture',
  name: 'Contempt for Culture',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Innate'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        withoutTrait: 'Vehicle',
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: 2,
          },
        },
      ],
    },
    {
      kind: 'create-unit',
      cardId: 'spy',
      count: 1,
    },
  ],
} as const satisfies EventDefinition;
