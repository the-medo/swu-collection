import type { UpgradeDefinition } from '../definition.ts';

export const academyTraining = {
  cardId: 'academy-training',
  traits: ['Learned'],
  name: 'Academy Training',
  kind: 'upgrade',
  attachTo: 'unit',
  token: false,
  aspects: ['Command'],
  cost: 2,
  modifiers: { power: 2, hp: 2 },
} as const satisfies UpgradeDefinition;
