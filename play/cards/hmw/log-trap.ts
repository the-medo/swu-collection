import { hmwEvent } from './define.ts';

export const hmwLogTrap = hmwEvent('log-trap', [
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'attack-bound',
        target: 'chosen',
        optional: false,
        after: [
          {
            kind: 'attack-bound',
            target: 'chosen',
            evenIfExhausted: true,
            unitsOnly: true,
            optional: false,
          },
        ],
      },
    ],
    forAttack: {},
  },
]);
