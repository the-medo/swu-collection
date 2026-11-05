import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteShadowedIntentions = {
  cardId: 'shadowed-intentions',
  name: 'Shadowed Intentions',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Innate'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    enemyAbilityImmunity: ['capture', 'defeat', 'return-to-hand'],
  },
} as const satisfies UpgradeDefinition;
