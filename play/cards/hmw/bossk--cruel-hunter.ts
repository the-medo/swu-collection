import { hmwLeader } from './define.ts';

export const hmwBosskCruelHunter = hmwLeader('bossk--cruel-hunter', {
  leader: {
    actions: [
      {
        id: 'weakness',
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
              controller: 'enemy',
              damaged: true,
            },
            bind: 'chosen',
            optional: false,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'heal',
                  amount: 1,
                },
                ifYouDo: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'give-token',
                      token: 'weakness',
                      count: 1,
                    },
                  },
                ],
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
              withTokenUpgrade: true,
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'damage',
                  amount: 2,
                },
              },
            ],
          },
        ],
      },
    ],
  },
});
