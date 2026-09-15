import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const atDpOccupier = {
  cardId: 'at-dp-occupier',
  name: 'AT-DP Occupier',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Imperial', 'Vehicle', 'Walker'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Overwhelm'],
  costReductions: [
    {
      condition: {
        kind: 'always',
      },
      amount: {
        kind: 'unit-count',
        filter: {
          arena: 'ground',
          damaged: true,
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
