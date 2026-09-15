import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const card8d8DaimyoSMajordomo = {
  cardId: '8d8--daimyo-s-majordomo',
  name: "8D8, Daimyo's Majordomo",
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Droid'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  actions: [
    {
      id: 'find-unit',
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
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
              ifYouDo: [
                {
                  kind: 'search-deck',
                  count: 5,
                  filter: 'unit',
                  max: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
