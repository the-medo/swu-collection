import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const knightSSaber = {
  cardId: 'knight-s-saber',
  name: "Knight's Saber",
  kind: 'upgrade',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
  token: false,
  modifiers: {
    power: 3,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  attachFilter: {
    trait: 'Jedi',
  },
} as const satisfies UpgradeDefinition;
