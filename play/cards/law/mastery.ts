import type { UpgradeDefinition } from '../definition.ts';

// LAW 129. Printed text is pinned in meta-play-costs fixture.
export const mastery = {
  cardId: 'mastery',
  name: 'Mastery',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 4,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'unit',
  uniqueHostDiscount: 1,
} as const satisfies UpgradeDefinition;
