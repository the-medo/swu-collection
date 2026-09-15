import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const l337RadicalInstigator = {
  cardId: 'l3-37--radical-instigator',
  name: 'L3-37, Radical Instigator',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Underworld', 'Droid'],
  unique: true,
  cost: 6,
  power: 3,
  hp: 2,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 10,
          filter: 'unit',
          trait: 'Droid',
          max: 10,
          maxTotalCost: 5,
          play: {
            discount: 0,
            free: true,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
