import { hmwEvent } from './define.ts';

export const hmwHowl = hmwEvent('howl', [
  {
    kind: 'create-unit',
    cardId: 'beast',
    count: 1,
  },
  {
    kind: 'select-unit',
    filter: {
      nonLeader: true,
    },
    bind: 'chosen',
    optional: true,
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
]);
