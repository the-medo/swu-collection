import type { UnitDefinition } from '../definition.ts';

// ASH 146. Printed text is pinned in the meta token fixture.
export const justifierRelentless = {
  cardId: 'justifier--relentless',
  name: 'Justifier, Relentless',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
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
                kind: 'damage',
                amount: 1,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'unit-defeated',
                target: 'chosen',
              },
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {},
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'on-attack',
      timing: 'attack',
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
                kind: 'damage',
                amount: 1,
              },
            },
            {
              kind: 'if',
              condition: {
                kind: 'unit-defeated',
                target: 'chosen',
              },
              effects: [
                {
                  kind: 'select-unit',
                  bind: 'chosen',
                  filter: {},
                  optional: false,
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'chosen',
                      operation: {
                        kind: 'give-token',
                        token: 'advantage',
                        count: 1,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
