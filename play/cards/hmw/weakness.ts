import type { UpgradeDefinition } from '../definition.ts';

// Homeworlds rules insert. Weakness is the inverse of Experience.
export const weakness = {
  cardId: 'weakness',
  name: 'Weakness',
  kind: 'upgrade',
  aspects: [],
  traits: ['Innate'],
  cost: 0,
  token: true,
  modifiers: { power: -1, hp: -1 },
  attachTo: 'unit',
} as const satisfies UpgradeDefinition;
