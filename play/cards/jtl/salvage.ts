import type { EventDefinition } from '../definition.ts';

// JTL 121. Printed text is pinned in meta-play-costs fixture.
export const salvage = {
  cardId: 'salvage',
  name: 'Salvage',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Supply'],
  cost: 0,
  effects: [
    {
      kind: 'play-card',
      from: 'discard',
      filter: {
        kind: 'unit',
        trait: 'Vehicle',
      },
      optional: false,
      bind: 'played-unit',
      effects: [
        {
          kind: 'on-unit',
          target: 'played-unit',
          operation: {
            kind: 'damage',
            amount: 1,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
