import { hmwUnit } from './define.ts';

export const hmwEmperorPalpatineConsolidatingPower = hmwUnit(
  'emperor-palpatine--consolidating-power',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              controller: 'enemy',
              nonLeader: true,
              maxCost: 3,
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'take-control',
                  player: 'self',
                },
                ifYouDo: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'give-token',
                      token: 'weakness',
                      count: 2,
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
);
