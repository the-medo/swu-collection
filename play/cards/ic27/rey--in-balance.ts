import { ic27Leader } from './define.ts';

export const ic27ReyInBalance = ic27Leader('rey--in-balance', {
  leader: {
    actions: [
      {
        id: 'action',
        costs: [
          {
            kind: 'resources',
            amount: 1,
          },
          {
            kind: 'exhaust-self',
          },
        ],
        limit: null,
        effects: [
          {
            kind: 'select-unit',
            filter: {
              damaged: true,
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  unit: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              damaged: true,
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
});
