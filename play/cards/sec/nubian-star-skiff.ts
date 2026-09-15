import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const nubianStarSkiff = {
  cardId: 'nubian-star-skiff',
  name: 'Nubian Star Skiff',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Naboo', 'Vehicle', 'Transport'],
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Official',
        },
        amount: 1,
      },
      abilities: {
        restore: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
