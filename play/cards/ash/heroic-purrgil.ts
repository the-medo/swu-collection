import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const heroicPurrgil = {
  cardId: 'heroic-purrgil',
  name: 'Heroic Purrgil',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Creature'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'space',
  keywords: ['Ambush'],
  constant: [
    {
      condition: {
        kind: 'ambush-attack',
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
