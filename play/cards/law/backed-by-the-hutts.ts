import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const backedByTheHutts = {
  cardId: 'backed-by-the-hutts',
  name: 'Backed by the Hutts',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Supply'],
  cost: 3,
  effects: [
    {
      kind: 'create-credits',
      amount: 1,
    },
    {
      kind: 'select-unit',
      filter: {},
      optional: true,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'damage',
            amount: {
              kind: 'credits-count',
              player: 'self',
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
