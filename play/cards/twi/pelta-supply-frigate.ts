import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePeltaSupplyFrigate = {
  cardId: 'pelta-supply-frigate',
  name: 'Pelta Supply Frigate',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Capital Ship'],
  cost: 5,
  power: 3,
  hp: 6,
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
                kind: 'create-unit',
                cardId: 'clone-trooper',
                count: 1,
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
