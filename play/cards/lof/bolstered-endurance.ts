import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const bolsteredEndurance = {
  cardId: 'bolstered-endurance',
  name: 'Bolstered Endurance',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Force'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Force',
  },
} as const satisfies UpgradeDefinition;
