import type { UnitDefinition } from '../definition.ts';

// JTL 102. Printed text is pinned in meta-board fixture.
export const resistanceBlueSquadron = {
  cardId: 'resistance-blue-squadron',
  name: 'Resistance Blue Squadron',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 4,
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
                amount: {
                  kind: 'unit-count',
                  filter: {
                    controller: 'friendly',
                    arena: 'space',
                  },
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
