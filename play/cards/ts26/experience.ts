import type { UpgradeDefinition } from '../definition.ts';

export const experience = {
  cardId: 'experience',
  traits: ['Learned'],
  name: 'Experience',
  kind: 'upgrade',
  attachTo: 'unit',
  token: true,
  aspects: [],
  cost: 0,
  modifiers: { power: 1, hp: 1 },
} as const satisfies UpgradeDefinition;
