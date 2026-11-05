import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePadmAmidalaPursuingPeace = {
  cardId: 'padm--amidala--pursuing-peace',
  name: 'Padmé Amidala, Pursuing Peace',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Official'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 4,
  arena: 'ground',
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
            id: 'attack',
            timing: 'attack',
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  controller: 'enemy',
                },
                optional: false,
                bind: 'chosen',
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'modify',
                      power: -3,
                      hp: 0,
                      duration: 'phase',
                    },
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
