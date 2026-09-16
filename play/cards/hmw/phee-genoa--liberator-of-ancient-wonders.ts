import { hmwUnit } from './define.ts';

export const hmwPheeGenoaLiberatorOfAncientWonders = hmwUnit(
  'phee-genoa--liberator-of-ancient-wonders',
  {
    keywords: ['Hidden'],
    triggers: [
      {
        id: 'enemy-leader-deploys',
        timing: 'enemy-leader-deployed',
        condition: {
          kind: 'unit-matches',
          target: 'subject',
          filter: {
            controller: 'enemy',
            leader: true,
          },
        },
        effects: [
          {
            kind: 'pay',
            player: 'enemy',
            costs: [
              {
                kind: 'resources',
                amount: 2,
              },
            ],
            optional: true,
            effects: [],
            otherwise: [
              {
                kind: 'on-unit',
                target: 'subject',
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
);
