import { hmwEvent } from './define.ts';

export const hmwForcedPacification = hmwEvent('forced-pacification', [
  {
    kind: 'select-units',
    filter: {
      controller: 'friendly',
    },
    min: 0,
    bind: 'sacrifices',
    effects: [
      {
        kind: 'defeat-group',
        group: 'sacrifices',
        countAs: 'defeated',
        effects: [
          {
            kind: 'select-units',
            filter: {
              controller: 'enemy',
            },
            min: {
              kind: 'value',
              name: 'defeated',
              multiplier: 2,
            },
            max: {
              kind: 'value',
              name: 'defeated',
              multiplier: 2,
            },
            bind: 'exhausted',
            effects: [
              {
                kind: 'exhaust-group',
                group: 'exhausted',
              },
            ],
          },
        ],
      },
    ],
  },
]);
