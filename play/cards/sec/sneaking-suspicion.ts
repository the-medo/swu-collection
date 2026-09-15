import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const sneakingSuspicion = {
  cardId: 'sneaking-suspicion',
  name: 'Sneaking Suspicion',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  keywords: ['Plot'],
} as const satisfies UpgradeDefinition;
