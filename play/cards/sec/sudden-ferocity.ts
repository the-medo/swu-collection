import type { UpgradeDefinition } from '../definition.ts';

// SEC 176. Printed text is pinned in meta-plot fixture.
export const suddenFerocity = {
  cardId: 'sudden-ferocity',
  name: 'Sudden Ferocity',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Innate'],
  cost: 3,
  keywords: ['Plot'],
  token: false,
  modifiers: {
    power: 3,
    hp: 0,
  },
  attachTo: 'unit',
} as const satisfies UpgradeDefinition;
