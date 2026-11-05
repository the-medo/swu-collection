import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteProtector = {
  cardId: 'protector',
  name: 'Protector',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Innate'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  grants: {
    keywords: ['Sentinel'],
  },
} as const satisfies UpgradeDefinition;
