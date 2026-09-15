import type { UnitDefinition } from '../definition.ts';

// JTL 032. Printed text is pinned in meta-play-costs fixture.
export const directorKrennicOnTheVergeOfGreatness = {
  cardId: 'director-krennic--on-the-verge-of-greatness',
  name: 'Director Krennic, On the Verge of Greatness',
  unique: true,
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Imperial', 'Official'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
  playReductions: [
    {
      id: 'first-defeated-unit',
      filter: {
        kind: 'unit',
        whenDefeated: true,
      },
      amount: 1,
      firstEachRound: true,
    },
  ],
} as const satisfies UnitDefinition;
