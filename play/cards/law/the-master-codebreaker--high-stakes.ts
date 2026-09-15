import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const theMasterCodebreakerHighStakes = {
  cardId: 'the-master-codebreaker--high-stakes',
  name: 'The Master Codebreaker, High Stakes',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  playReductions: [
    {
      id: 'first-gambit',
      filter: {
        trait: 'Gambit',
      },
      amount: 1,
      firstEachRound: true,
    },
  ],
  triggers: [
    {
      id: 'search-gambit',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 8,
          filter: 'any',
          trait: 'Gambit',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
