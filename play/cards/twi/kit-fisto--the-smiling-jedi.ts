import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKitFistoTheSmilingJedi = {
  cardId: 'kit-fisto--the-smiling-jedi',
  name: 'Kit Fisto, The Smiling Jedi',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 6,
  unique: true,
  power: 7,
  hp: 6,
  arena: 'ground',
  keywords: ['Saboteur', 'Coordinate'],
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
                  arena: 'ground',
                },
                optional: true,
                bind: 'chosen',
                effects: [
                  {
                    kind: 'damage-target',
                    target: 'chosen',
                    amount: 3,
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
