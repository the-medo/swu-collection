import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const groguMysteriousChild = {
  cardId: 'grogu--mysterious-child',
  name: 'Grogu, Mysterious Child',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Force'],
  unique: true,
  cost: 3,
  power: 1,
  hp: 6,
  arena: 'ground',
  keywords: ['Hidden'],
  actions: [
    {
      id: 'heal-damage',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'healed-unit',
          effects: [
            {
              kind: 'distribute',
              benefit: 'heal',
              amount: 2,
              filter: {
                sameAs: 'healed-unit',
              },
              bind: 'healed',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'value-at-least',
                    name: 'healed',
                    amount: 1,
                  },
                  effects: [
                    {
                      kind: 'select-unit',
                      filter: {},
                      optional: false,
                      bind: 'chosen',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'chosen',
                          operation: {
                            kind: 'damage',
                            amount: {
                              kind: 'value',
                              name: 'healed',
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
} as const satisfies UnitDefinition;
