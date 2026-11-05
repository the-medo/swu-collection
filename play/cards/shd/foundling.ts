import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFoundling = {
  cardId: 'foundling',
  name: 'Foundling',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Mandalorian'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'unit',
  hostTraits: ['Mandalorian'],
} as const satisfies UpgradeDefinition;
