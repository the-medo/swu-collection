import { hmwEvent } from './define.ts';

export const hmwAlwaysABiggerFish = hmwEvent('always-a-bigger-fish', [
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
      trait: 'Creature',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'defeat',
        },
        ifYouDo: [
          {
            kind: 'play-card',
            from: 'hand',
            filter: {
              kind: 'unit',
              trait: 'Creature',
              costAtMost: {
                kind: 'difference',
                left: {
                  kind: 'card-cost',
                  target: 'chosen',
                },
                right: -3,
              },
            },
            optional: false,
            free: true,
          },
        ],
      },
    ],
  },
]);
