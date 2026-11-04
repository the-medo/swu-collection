import { ic27Event } from './define.ts';

export const ic27IVeGotABadFeeling = ic27Event('i-ve-got-a-bad-feeling', [
  {
    kind: 'select-unit',
    filter: {
      nonLeader: true,
    },
    bind: 'chosen',
    optional: false,
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
  {
    kind: 'select-unit',
    filter: {
      controller: 'friendly',
    },
    bind: 'chosen',
    optional: false,
    effects: [
      {
        kind: 'on-unit',
        target: 'chosen',
        operation: {
          kind: 'give-token',
          token: 'shield',
          count: 1,
        },
      },
    ],
  },
]);
