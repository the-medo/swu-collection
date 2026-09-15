import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const cintaKazStoneColdAndFearless = {
  cardId: 'cinta-kaz--stone-cold-and-fearless',
  name: 'Cinta Kaz, Stone Cold and Fearless',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 5,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgraded: true,
        },
      },
      abilities: {
        keywords: ['Sentinel'],
      },
    },
  ],
} as const satisfies UnitDefinition;
