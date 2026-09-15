import type { UnitDefinition } from '../definition.ts';

// LAW 045. Printed text is pinned in meta-board fixture.
export const zebOrelliosSpectreFour = {
  cardId: 'zeb-orellios--spectre-four',
  name: 'Zeb Orellios, Spectre Four',
  kind: 'unit',
  aspects: ['Vigilance', 'Aggression', 'Heroism'],
  traits: ['Rebel', 'Spectre'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
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
              anyAspect: ['Command', 'Cunning'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                arena: 'ground',
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 5,
                  },
                },
              ],
            },
          ],
          otherwise: [
            {
              kind: 'select-unit',
              bind: 'chosen',
              filter: {
                arena: 'ground',
              },
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 3,
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
