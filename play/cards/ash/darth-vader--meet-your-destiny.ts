import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const darthVaderMeetYourDestiny = {
  cardId: 'darth-vader--meet-your-destiny',
  name: 'Darth Vader, Meet Your Destiny',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Imperial', 'Sith'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  keywords: ['Shielded'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          exhausted: false,
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
