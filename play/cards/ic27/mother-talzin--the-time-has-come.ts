import { ic27Unit } from './define.ts';

export const ic27MotherTalzinTheTimeHasCome = ic27Unit('mother-talzin--the-time-has-come', {
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'unit',
            aspect: 'Villainy',
            maxCost: 4,
          },
          optional: true,
          free: true,
          bind: 'returned',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'not',
                condition: {
                  kind: 'any',
                  conditions: [
                    {
                      kind: 'unit-had-trait',
                      target: 'returned',
                      trait: 'Night',
                    },
                    {
                      kind: 'unit-had-trait',
                      target: 'returned',
                      trait: 'Undead',
                    },
                  ],
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'damage',
                    amount: {
                      kind: 'card-cost',
                      target: 'returned',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
