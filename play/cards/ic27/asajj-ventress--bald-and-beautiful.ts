import { ic27Leader } from './define.ts';

export const ic27AsajjVentressBaldAndBeautiful = ic27Leader('asajj-ventress--bald-and-beautiful', {
  leader: {
    actions: [
      {
        id: 'action',
        costs: [
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
                after: [
                  {
                    kind: 'if',
                    condition: {
                      kind: 'unit-matches',
                      target: 'completed-attacker',
                      filter: {},
                    },
                    effects: [
                      {
                        kind: 'select-resources',
                        player: 'self',
                        exhausted: 'any',
                        min: 0,
                        max: 1,
                        operation: 'ready',
                      },
                    ],
                  },
                ],
              },
            ],
            forAttack: {},
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Saboteur'],
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'select-resources',
            player: 'self',
            exhausted: 'any',
            min: 0,
            max: 1,
            operation: 'ready',
          },
        ],
      },
    ],
  },
});
