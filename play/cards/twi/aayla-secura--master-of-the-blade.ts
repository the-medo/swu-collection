import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAaylaSecuraMasterOfTheBlade = {
  cardId: 'aayla-secura--master-of-the-blade',
  name: 'Aayla Secura, Master of the Blade',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 5,
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
                kind: 'on-unit',
                target: 'source',
                operation: {
                  kind: 'modify',
                  power: 0,
                  hp: 0,
                  duration: 'attack',
                  preventCombatDamage: true,
                },
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
