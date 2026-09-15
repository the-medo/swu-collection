import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 restrictions and keyword fixture.
export const tradeRouteTaxation = {
  cardId: 'trade-route-taxation',
  name: 'Trade Route Taxation',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Law'],
  cost: 2,
  keywords: ['Plot'],
  effects: [
    {
      kind: 'if',
      condition: {
        kind: 'more-units-than-opponent',
      },
      effects: [
        {
          kind: 'restrict-play',
          filter: {
            kind: 'event',
          },
          player: 'enemy',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
