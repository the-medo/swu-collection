import { hmwEvent } from './define.ts';

export const hmwRebelOperation = hmwEvent(
  'rebel-operation',
  [
    {
      kind: 'draw-cards',
      amount: 2,
    },
  ],
  {
    costReductions: [
      {
        condition: {
          kind: 'always',
        },
        amount: {
          kind: 'cards-in-play-count',
          filter: {
            controller: 'friendly',
            roles: ['unit', 'leader'],
            trait: 'Rebel',
          },
        },
      },
    ],
  },
);
