import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-choices.json.
export const aatIncinerator = {
  cardId: 'aat-incinerator',
  name: 'AAT Incinerator',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Imperial', 'Vehicle', 'Tank'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {
            arena: 'ground',
            otherThan: 'source',
          },
          max: 4,
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'not',
                condition: {
                  kind: 'value-at-least',
                  name: 'friendly-units-damaged',
                  amount: 1,
                },
              },
              effects: [
                {
                  kind: 'damage-own-base',
                  amount: 2,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
