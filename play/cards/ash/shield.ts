import type { UpgradeDefinition } from '../definition.ts';

// V8 §§3.7.6, 7.7.5: prevent one damage instance, then defeat one attached Shield.
export const shield = {
  cardId: 'shield',
  traits: ['Armor'],
  name: 'Shield',
  kind: 'upgrade',
  attachTo: 'unit',
  token: true,
  aspects: [],
  cost: 0,
  modifiers: { power: 0, hp: 0 },
  replacement: { kind: 'shield' },
} as const satisfies UpgradeDefinition;
