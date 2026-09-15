import type { UnitDefinition } from '../definition.ts';

// LOF 132. Printed text is pinned in meta-continuous fixture.
export const grandInquisitorYouReRightToBeAfraid = {
  cardId: 'grand-inquisitor--you-re-right-to-be-afraid',
  name: "Grand Inquisitor, You're Right to Be Afraid",
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Inquisitor'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  keywords: ['Hidden'],
  raid: 1,
  auras: [
    {
      id: 'hidden-inquisitors',
      filter: {
        controller: 'friendly',
        trait: 'Inquisitor',
        otherThan: 'source',
      },
      abilities: {
        keywords: ['Hidden'],
      },
    },
  ],
} as const satisfies UnitDefinition;
