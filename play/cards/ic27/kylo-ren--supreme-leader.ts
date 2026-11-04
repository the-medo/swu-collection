import { ic27Leader } from './define.ts';

export const ic27KyloRenSupremeLeader = ic27Leader('kylo-ren--supreme-leader', {
  leader: {
    actions: [
      {
        id: 'action',
        costs: [
          {
            kind: 'exhaust-self',
          },
          {
            kind: 'discard-hand',
            count: 1,
          },
        ],
        limit: null,
        effects: [
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
        id: 'deployed',
        timing: 'deployed',
        effects: [
          {
            kind: 'inspect-zone',
            zone: 'discard',
            player: 'self',
            chooser: 'self',
            filter: {
              kind: 'unit',
            },
            min: 0,
            max: 1,
            bind: 'chosen',
            effects: [
              {
                kind: 'move-card',
                target: 'chosen',
                from: 'discard',
                to: 'hand',
              },
            ],
          },
        ],
      },
    ],
  },
});
