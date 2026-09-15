import type { UnitDefinition } from '../definition.ts';

// LAW 035. Printed text is pinned in meta-board fixture.
export const ezraBridgerSpectreSix = {
  cardId: 'ezra-bridger--spectre-six',
  name: 'Ezra Bridger, Spectre Six',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Heroism'],
  traits: ['Force', 'Rebel', 'Spectre'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  raid: 1,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              anyAspect: ['Aggression', 'Cunning'],
            },
            amount: 1,
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
                    kind: 'heal',
                    amount: 4,
                  },
                },
              ],
            },
          ],
          otherwise: [
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
                    kind: 'heal',
                    amount: 2,
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
