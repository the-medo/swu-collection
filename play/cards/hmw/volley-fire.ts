import { hmwEvent } from './define.ts';

export const hmwVolleyFire = hmwEvent('volley-fire', [
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'attacker',
    optional: false,
    effects: [
      {
        kind: 'select-unit',
        filter: {
          controller: 'enemy',
        },
        bind: 'chosen',
        optional: false,
        effects: [
          {
            kind: 'damage-target',
            source: 'attacker',
            target: 'chosen',
            amount: {
              kind: 'unit-keyword-value',
              target: 'attacker',
              keyword: 'Raid',
            },
          },
        ],
      },
    ],
  },
]);
