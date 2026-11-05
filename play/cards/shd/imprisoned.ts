import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteImprisoned = {
  cardId: 'imprisoned',
  name: 'Imprisoned',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition', 'Law'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    nonLeader: true,
  },
  hostLosesAbilities: true,
} as const satisfies UpgradeDefinition;
