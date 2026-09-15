import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-foundations.json.
export const veiledStrength = {
  cardId: 'veiled-strength',
  name: 'Veiled Strength',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    nonLeader: true,
  },
  grants: {
    keywords: ['Grit'],
  },
} as const satisfies UpgradeDefinition;
