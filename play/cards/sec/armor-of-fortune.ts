import type { UpgradeDefinition } from '../definition.ts';

// SEC 070. Printed text is pinned in meta-plot fixture.
export const armorOfFortune = {
  cardId: 'armor-of-fortune',
  name: 'Armor of Fortune',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item', 'Armor'],
  cost: 2,
  keywords: ['Plot'],
  token: false,
  modifiers: {
    power: 0,
    hp: 3,
  },
  attachTo: 'unit',
} as const satisfies UpgradeDefinition;
