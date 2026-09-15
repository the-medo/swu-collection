import type { UnitDefinition } from '../definition.ts';

// SEC 099. Printed text is pinned in meta-plot fixture.
export const nabooRoyalStarshipFitForAQueen = {
  cardId: 'naboo-royal-starship--fit-for-a-queen',
  name: 'Naboo Royal Starship, Fit For A Queen',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Naboo', 'Vehicle', 'Transport'],
  cost: 4,
  keywords: ['Plot'],
  power: 2,
  hp: 5,
  arena: 'space',
  unique: true,
  auras: [
    {
      id: 'leader-cover',
      filter: {
        controller: 'friendly',
        leader: true,
      },
      abilities: {
        raid: 2,
        keywords: ['Overwhelm'],
      },
    },
  ],
} as const satisfies UnitDefinition;
