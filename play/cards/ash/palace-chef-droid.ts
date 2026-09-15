import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const palaceChefDroid = {
  cardId: 'palace-chef-droid',
  name: 'Palace Chef Droid',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Droid'],
  cost: 2,
  power: 0,
  hp: 3,
  arena: 'ground',
  keywords: ['Sentinel'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          defending: true,
        },
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
