import { hmwEvent } from './define.ts';

export const hmwMaim = hmwEvent('maim', [
  {
    kind: 'select-unit',
    filter: {},
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'damage',
          amount: 1,
        },
        ifYouDo: [
          {
            kind: 'on-unit',
            target: 'chosen',
            operation: {
              kind: 'exhaust',
            },
          },
        ],
      },
    ],
  },
]);
