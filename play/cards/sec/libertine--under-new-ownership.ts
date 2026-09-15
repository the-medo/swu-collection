import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const libertineUnderNewOwnership = {
  cardId: 'libertine--under-new-ownership',
  name: 'Libertine, Under New Ownership',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 7,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'guarded-cards',
        target: 'source',
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          bind: 'guard',
          optional: false,
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                nonLeader: true,
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'capture-unit',
                  guard: 'guard',
                  target: 'chosen',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
