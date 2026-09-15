import type { LeaderDefinition } from '../definition.ts';

// Printed faces and official clarifications are pinned in leader-costs-damage.json.
export const jangoFettConcealingTheConspiracy = {
  cardId: 'jango-fett--concealing-the-conspiracy',
  name: 'Jango Fett, Concealing the Conspiracy',
  kind: 'leader',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  unique: true,
  printedCost: 5,
  faces: {
    leader: {
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-unit-damage',
          effects: [
            {
              kind: 'pay',
              costs: [
                {
                  kind: 'exhaust-self',
                },
              ],
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'subject',
                  operation: {
                    kind: 'exhaust',
                  },
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              condition: {
                kind: 'resources-at-least',
                amount: 5,
              },
              as: 'unit',
            },
          ],
        },
      ],
    },
    unit: {
      power: 3,
      hp: 7,
      arena: 'ground',
      triggers: [
        {
          id: 'observe',
          timing: 'friendly-unit-damage',
          effects: [
            {
              kind: 'on-unit',
              target: 'subject',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
          optional: true,
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
