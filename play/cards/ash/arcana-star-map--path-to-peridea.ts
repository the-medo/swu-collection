import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const arcanaStarMapPathToPeridea = {
  cardId: 'arcana-star-map--path-to-peridea',
  name: 'Arcana Star Map, Path to Peridea',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item'],
  unique: true,
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 3,
  },
  attachTo: 'unit',
  grants: {
    searchMultiplier: 2,
  },
} as const satisfies UpgradeDefinition;
