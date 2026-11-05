import type { UpgradeDefinition } from '../definition.ts';

// Reprinted in IC27 052; identity and text follow the official catalog.
export const ic27ReprintResilient = {
  cardId: 'resilient',
  name: 'Resilient',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 3,
  },
  attachTo: 'unit',
} as const satisfies UpgradeDefinition;
