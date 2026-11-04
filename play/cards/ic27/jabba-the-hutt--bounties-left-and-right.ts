import { ic27Unit } from './define.ts';

export const ic27JabbaTheHuttBountiesLeftAndRight = ic27Unit(
  'jabba-the-hutt--bounties-left-and-right',
  {
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
                  power: 0,
                  hp: 0,
                  duration: 'phase',
                  defendingAttackerPower: 4,
                },
              },
            ],
          },
        ],
      },
    ],
  },
);
