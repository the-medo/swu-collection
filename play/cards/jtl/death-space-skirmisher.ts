import type { UnitDefinition } from '../definition.ts';

// JTL . Printed text is pinned in the meta effects fixture.
export const deathSpaceSkirmisher = {
  cardId: 'death-space-skirmisher',
  name: 'Death Space Skirmisher',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            amount: 1,
            filter: {
              controller: 'friendly',
              arena: 'space',
              otherThan: 'source',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {},
              optional: true,
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
  ],
} as const satisfies UnitDefinition;
