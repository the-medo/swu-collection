import type { UnitDefinition } from '../definition.ts';

// ASH 079. Printed text is pinned in the meta token fixture.
export const koskaReevesWarriorOfMandalore = {
  cardId: 'koska-reeves--warrior-of-mandalore',
  name: 'Koska Reeves, Warrior of Mandalore',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        amount: 1,
        filter: {
          controller: 'friendly',
          token: true,
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'friendly-unit-defeated',
          },
          effects: [
            {
              kind: 'create-unit',
              cardId: 'mandalorian',
              count: 1,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
