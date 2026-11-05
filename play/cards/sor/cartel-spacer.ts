import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCartelSpacer = {
  cardId: 'cartel-spacer',
  name: 'Cartel Spacer',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
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
              otherThan: 'source',
              anyAspect: ['Cunning'],
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                maxCost: 4,
              },
              optional: false,
              bind: 'chosen',
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
