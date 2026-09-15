import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 search/combat fixture.
export const homeOneOnMyMark = {
  cardId: 'home-one--on-my-mark',
  name: 'Home One, On My Mark',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Capital Ship'],
  unique: true,
  cost: 9,
  power: 7,
  hp: 8,
  arena: 'space',
  keywords: ['Ambush'],
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'enemy',
          arena: 'space',
        },
        amount: 3,
      },
      amount: 3,
    },
  ],
} as const satisfies UnitDefinition;
