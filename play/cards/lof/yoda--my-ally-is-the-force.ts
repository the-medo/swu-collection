import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const yodaMyAllyIsTheForce = {
  cardId: 'yoda--my-ally-is-the-force',
  name: 'Yoda, My Ally is the Force',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 8,
  power: 5,
  hp: 9,
  arena: 'ground',
  triggers: [
    {
      id: 'force-heal',
      timing: 'played',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'heal-base',
              amount: 5,
            },
          ],
        },
      ],
    },
    {
      id: 'force-damage',
      timing: 'force-used',
      effects: [
        {
          kind: 'with-value',
          name: 'units',
          value: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: {
                      kind: 'value',
                      name: 'units',
                      multiplier: 2,
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
} as const satisfies UnitDefinition;
