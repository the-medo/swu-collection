import { ic27Unit } from './define.ts';

export const ic27SabineWrenLiberatorOfKrownest = ic27Unit('sabine-wren--liberator-of-krownest', {
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'self-deck',
              effects: [
                {
                  kind: 'mill',
                  player: 'self',
                  count: 2,
                  group: 'milled',
                  bind: 'milled-card',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      bind: 'chosen',
                      optional: true,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'damage',
                            amount: {
                              kind: 'cost-difference',
                              group: 'milled',
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'enemy-deck',
              effects: [
                {
                  kind: 'mill',
                  player: 'enemy',
                  count: 2,
                  group: 'milled',
                  bind: 'milled-card',
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      bind: 'chosen',
                      optional: true,
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'damage',
                            amount: {
                              kind: 'cost-difference',
                              group: 'milled',
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
        },
      ],
    },
  ],
});
