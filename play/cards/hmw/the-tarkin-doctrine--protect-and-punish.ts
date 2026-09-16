import { hmwUpgrade } from './define.ts';

export const hmwTheTarkinDoctrineProtectAndPunish = hmwUpgrade(
  'the-tarkin-doctrine--protect-and-punish',
  {
    grants: {
      triggers: [
        {
          id: 'fortification-played',
          timing: 'friendly-card-played',
          condition: {
            kind: 'card-matches',
            target: 'subject',
            filter: {
              hasKeyword: 'Fortify',
            },
          },
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
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    triggers: [
      {
        id: 'played',
        timing: 'played',
        condition: {
          kind: 'controls-name',
          name: 'Grand Moff Tarkin',
        },
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
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'modify',
                  power: -3,
                  hp: 0,
                  duration: 'phase',
                },
              },
            ],
          },
        ],
      },
    ],
  },
);
