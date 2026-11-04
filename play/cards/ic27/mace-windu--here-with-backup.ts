import { ic27Leader } from './define.ts';

export const ic27MaceWinduHereWithBackup = ic27Leader('mace-windu--here-with-backup', {
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
              controller: 'friendly',
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'attack-bound',
                target: 'chosen',
                optional: false,
                abilities: {
                  restore: 2,
                },
              },
            ],
            forAttack: {},
          },
        ],
      },
    ],
  },
  unit: {
    restore: 2,
    triggers: [
      {
        id: 'deployed',
        timing: 'deployed',
        effects: [
          {
            kind: 'resource-top',
            optional: false,
          },
        ],
      },
    ],
  },
});
