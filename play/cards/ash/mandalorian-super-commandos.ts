import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const mandalorianSuperCommandos = {
  cardId: 'mandalorian-super-commandos',
  name: 'Mandalorian Super Commandos',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          leader: true,
        },
        amount: 1,
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
