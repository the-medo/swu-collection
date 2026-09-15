import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const imposingScoutWalker = {
  cardId: 'imposing-scout-walker',
  name: 'Imposing Scout Walker',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 6,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          optional: true,
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
                kind: 'unit-defeated',
                target: 'chosen',
              },
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'give-token',
                    token: 'advantage',
                    count: 3,
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
