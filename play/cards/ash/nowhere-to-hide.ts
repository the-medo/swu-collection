import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-foundations.json.
export const nowhereToHide = {
  cardId: 'nowhere-to-hide',
  name: 'Nowhere to Hide',
  kind: 'upgrade',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Condition'],
  cost: 2,
  token: false,
  modifiers: {
    power: -2,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    keywords: ['Sentinel'],
  },
} as const satisfies UpgradeDefinition;
