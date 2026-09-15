import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 restrictions and keyword fixture.
export const galliusRaxCounselorToTheEmpire = {
  cardId: 'gallius-rax--counselor-to-the-empire',
  name: 'Gallius Rax, Counselor to the Empire',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 6,
  power: 4,
  hp: 7,
  arena: 'ground',
  auras: [
    {
      id: 'two-keywords',
      filter: {
        controller: 'friendly',
        otherThan: 'source',
        minKeywords: 2,
      },
      power: 2,
      hp: 2,
    },
  ],
} as const satisfies UnitDefinition;
