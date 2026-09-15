import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const markMyWords = {
  cardId: 'mark-my-words',
  name: 'Mark My Words',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 2,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    damaged: true,
  },
  grants: {
    keywords: ['Overwhelm'],
  },
} as const satisfies UpgradeDefinition;
