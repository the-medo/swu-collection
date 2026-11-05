import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnshakeableWill = {
  cardId: 'unshakeable-will',
  name: 'Unshakeable Will',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 4,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    keywords: ['Sentinel'],
  },
} as const satisfies UpgradeDefinition;
