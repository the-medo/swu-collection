import { hmwEvent } from './define.ts';

export const hmwCatchTheScent = hmwEvent('catch-the-scent', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 2,
    group: 'beasts',
    effects: [
      {
        kind: 'select-unit',
        filter: {
          inGroup: 'beasts',
        },
        bind: 'chosen',
        optional: false,
        effects: [
          {
            kind: 'on-unit',
            target: 'chosen',
            operation: {
              kind: 'ready',
            },
          },
        ],
      },
    ],
  },
]);
