import type { EventDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const lostAndForgotten = {
  cardId: 'lost-and-forgotten',
  name: 'Lost and Forgotten',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 6,
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
      healOwnBase: 3,
    },
  ],
} as const satisfies EventDefinition;
