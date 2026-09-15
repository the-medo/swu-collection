import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const lifeWindSage = {
  cardId: 'life-wind-sage',
  name: 'Life Wind Sage',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Force'],
  cost: 4,
  power: 3,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          exhausted: true,
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
