import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const purrgilUltra = {
  cardId: 'purrgil-ultra',
  name: 'Purrgil Ultra',
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Creature'],
  cost: 8,
  power: 6,
  hp: 10,
  arena: 'space',
  triggers: [
    {
      id: 'return-damage-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
            otherThan: 'source',
          },
          optional: true,
          bind: 'returned',
          effects: [
            {
              kind: 'on-unit',
              target: 'returned',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'damaged',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'damaged',
                      operation: {
                        kind: 'damage',
                        amount: {
                          kind: 'card-cost',
                          target: 'returned',
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
    },
    {
      id: 'return-damage-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
            otherThan: 'source',
          },
          optional: true,
          bind: 'returned',
          effects: [
            {
              kind: 'on-unit',
              target: 'returned',
              operation: {
                kind: 'return-to-hand',
              },
              ifYouDo: [
                {
                  kind: 'select-unit',
                  filter: {},
                  optional: false,
                  bind: 'damaged',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'damaged',
                      operation: {
                        kind: 'damage',
                        amount: {
                          kind: 'card-cost',
                          target: 'returned',
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
    },
  ],
} as const satisfies UnitDefinition;
