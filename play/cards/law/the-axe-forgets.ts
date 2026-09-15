import type { EventDefinition } from '../definition.ts';

// LAW . Printed text is pinned in the meta effects fixture.
export const theAxeForgets = {
  cardId: 'the-axe-forgets',
  name: 'The Axe Forgets',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        nonLeader: true,
        maxCost: 3,
      },
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
