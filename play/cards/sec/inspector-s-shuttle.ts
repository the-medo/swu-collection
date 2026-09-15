import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 hidden choices fixture.
export const inspectorSShuttle = {
  cardId: 'inspector-s-shuttle',
  name: "Inspector's Shuttle",
  kind: 'unit',
  aspects: [],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'name-reveal',
      timing: 'played',
      effects: [
        {
          kind: 'name-card',
          bind: 'named',
          effects: [
            {
              kind: 'reveal-hand',
              player: 'enemy',
              count: {
                filter: {
                  named: 'named',
                },
                bind: 'copies',
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: {
                      kind: 'value',
                      name: 'copies',
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
} as const satisfies UnitDefinition;
