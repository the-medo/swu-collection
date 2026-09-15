import type { EventDefinition } from '../definition.ts';

// SEC 183. Printed text is pinned in meta-plot fixture.
export const toppleTheSummit = {
  cardId: 'topple-the-summit',
  name: 'Topple the Summit',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Plan'],
  cost: 5,
  keywords: ['Plot'],
  effects: [
    {
      kind: 'damage-units',
      filter: {
        damaged: true,
      },
      amount: 3,
    },
  ],
} as const satisfies EventDefinition;
