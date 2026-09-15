import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 foundation fixture.
export const unveiledMight = {
  cardId: 'unveiled-might',
  name: 'Unveiled Might',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Innate'],
  cost: 4,
  token: false,
  modifiers: {
    power: 2,
    hp: 3,
  },
  attachTo: 'unit',
  keywords: ['Plot'],
} as const satisfies UpgradeDefinition;
