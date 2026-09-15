import type { UnitDefinition } from '../definition.ts';

// JTL 147. Printed text is pinned in meta-board fixture.
export const blackOneStraightAtThem = {
  cardId: 'black-one--straight-at-them',
  name: 'Black One, Straight At Them',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      power: 1,
    },
  ],
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'controls-name',
            name: 'Poe Dameron',
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
                    kind: 'damage',
                    amount: 1,
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
