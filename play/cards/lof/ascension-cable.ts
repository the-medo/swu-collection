import type { UpgradeDefinition } from '../definition.ts';

// LOF . V8 rules; printed text pinned in meta combat fixture.
export const ascensionCable = {
  cardId: 'ascension-cable',
  name: 'Ascension Cable',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Item'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  grants: {
    keywords: ['Saboteur'],
  },
} as const satisfies UpgradeDefinition;
