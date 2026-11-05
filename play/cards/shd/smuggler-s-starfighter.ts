import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSmugglerSStarfighter = {
  cardId: 'smuggler-s-starfighter',
  name: "Smuggler's Starfighter",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'space',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Cunning'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Underworld',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: 0,
                    duration: 'phase',
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
