import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attachment fixture.
export const axeWovesAccomplishedWarrior = {
  cardId: 'axe-woves--accomplished-warrior',
  name: 'Axe Woves, Accomplished Warrior',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Mandalorian', 'Trooper'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Shielded'],
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'upgrades-count',
        target: 'source',
      },
      hp: {
        kind: 'upgrades-count',
        target: 'source',
      },
    },
  ],
} as const satisfies UnitDefinition;
