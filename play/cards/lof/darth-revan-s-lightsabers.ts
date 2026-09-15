import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const darthRevanSLightsabers = {
  cardId: 'darth-revan-s-lightsabers',
  name: "Darth Revan's Lightsabers",
  kind: 'upgrade',
  aspects: ['Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Sith',
  },
  grants: {
    keywords: ['Grit'],
  },
} as const satisfies UpgradeDefinition;
