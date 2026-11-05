import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSanctionerSShuttle = {
  cardId: 'sanctioner-s-shuttle',
  name: "Sanctioner's Shuttle",
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Vehicle', 'Transport'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      abilities: {
        triggers: [
          {
            id: 'played',
            timing: 'played',
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  controller: 'enemy',
                  nonLeader: true,
                  maxCost: 3,
                },
                optional: false,
                bind: 'chosen',
                effects: [
                  {
                    kind: 'capture-unit',
                    target: 'chosen',
                    guard: 'source',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
