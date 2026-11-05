import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEntrenched = {
  cardId: 'entrenched',
  name: 'Entrenched',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Condition'],
  cost: 2,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'unit',
  hostCannotAttackBases: true,
} as const satisfies UpgradeDefinition;
