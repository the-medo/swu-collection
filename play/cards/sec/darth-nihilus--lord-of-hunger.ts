import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const darthNihilusLordOfHunger = {
  cardId: 'darth-nihilus--lord-of-hunger',
  name: 'Darth Nihilus, Lord of Hunger',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  cost: 7,
  power: 6,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'least-hp-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'not',
                condition: {
                  kind: 'unit-had-trait',
                  target: 'chosen',
                  trait: 'Vehicle',
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
          leastRemainingHp: true,
        },
      ],
    },
    {
      id: 'least-hp-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            otherThan: 'source',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 3,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'not',
                condition: {
                  kind: 'unit-had-trait',
                  target: 'chosen',
                  trait: 'Vehicle',
                },
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
          leastRemainingHp: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
